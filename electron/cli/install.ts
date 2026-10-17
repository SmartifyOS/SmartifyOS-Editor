import { type ChildProcess, spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { createInterface } from 'node:readline';
import type { CliEvent, ErrorPayload, ResultEvent } from '../../shared/cli.ts';
import { killTree } from '../system/processes.ts';
import { cliEnv, cliInstallDir } from './environment.ts';
import { cliStatus } from './locate.ts';

/**
 * Puts the SmartifyOS CLI on this computer when the editor finds none. It runs the same
 * installer people run in a terminal (install.sh and install.ps1 in the CLI's repo), so there
 * is one way to install it: the newest release, checked against its checksum, into the folder
 * `findCli` looks in first, and onto PATH for a terminal.
 *
 * It looks like a CLI job to the window (steps, output, a result), so the task dialog shows
 * it the same way.
 */

const isWindows = process.platform === 'win32';
const scriptUrl = `https://smartify-os.com/${isWindows ? 'install.ps1' : 'install.sh'}`;

let nextId = 0;

export class InstallJob extends EventEmitter<{ event: [CliEvent] }> {
	readonly id: string;
	readonly result: Promise<ResultEvent>;
	private child: ChildProcess | undefined;
	private finished = false;

	constructor() {
		super();
		nextId += 1;
		this.id = `install${nextId}`;
		this.result = this.run().then((result) => {
			this.finished = true;
			this.emit('event', result);
			return result;
		});
	}

	get running(): boolean {
		return !this.finished;
	}

	kill(): void {
		if (this.child?.pid !== undefined) killTree(this.child.pid);
	}

	private step(status: 'start' | 'update' | 'done' | 'error', text: string): void {
		this.emit('event', { type: 'step', id: 'install', status, text });
	}

	private async run(): Promise<ResultEvent> {
		// The window gets the id first, like a CLI job whose first line comes a moment later.
		await new Promise((resolve) => setImmediate(resolve));
		this.step('start', 'Downloading SmartifyOS');

		let problem: ErrorPayload | undefined;
		let folder: string | undefined;
		try {
			folder = await mkdtemp(join(tmpdir(), 'smartify-os-install-'));
			const response = await fetch(scriptUrl);
			if (!response.ok) throw new Error(`${scriptUrl} answered ${response.status}`);
			const script = join(folder, isWindows ? 'install.ps1' : 'install.sh');
			await writeFile(script, await response.text());
			problem = await this.runScript(script);
		} catch (error) {
			this.emit('event', { type: 'output', stream: 'stderr', text: String(error) });
			problem = {
				kind: 'user',
				message: 'SmartifyOS could not be downloaded.',
				hint: 'Check that this computer is online, then try again.'
			};
		} finally {
			if (folder) await rm(folder, { recursive: true, force: true }).catch(() => {});
		}

		// Whatever the installer said, what counts is whether the editor finds it now.
		const cli = await cliStatus(true);
		if (cli.found) {
			this.step('done', `SmartifyOS ${cli.version} is installed`);
			return {
				type: 'result',
				ok: true,
				exitCode: 0,
				data: { path: cli.path, version: cli.version }
			};
		}
		this.step('error', 'SmartifyOS could not be installed');
		return {
			type: 'result',
			ok: false,
			exitCode: 1,
			error: problem ?? {
				kind: 'user',
				message: 'SmartifyOS could not be installed.',
				hint: cli.reason
			}
		};
	}

	/**
	 * Internal: runs the installer, its lines going to the console. Resolves with what it said
	 * went wrong (its `!` line and the hint below it), if anything.
	 */
	private runScript(script: string): Promise<ErrorPayload | undefined> {
		return new Promise((resolve, reject) => {
			void cliEnv({ NO_COLOR: '1' }).then((env) => {
				// The editor's PATH has the install folder in it, which would tell the installer
				// that a terminal finds it already, and it would leave the shell config alone.
				env.PATH = env.PATH?.split(delimiter)
					.filter((dir) => dir !== cliInstallDir())
					.join(delimiter);
				const child = isWindows
					? spawn(
							'powershell.exe',
							['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script],
							{ env, windowsHide: true }
						)
					: spawn('/bin/sh', [script], { env });
				this.child = child;

				let problem: ErrorPayload | undefined;
				let wantHint = false;
				const read = (stream: 'stdout' | 'stderr') => (line: string) => {
					if (!line.trim()) return;
					this.emit('event', { type: 'output', stream, text: line });
					// The installer's own words: `  * installing`, `  ! Could not ...`, `    hint`.
					const failed = /^\s*! (.+)$/.exec(line);
					if (failed?.[1]) {
						problem = { kind: 'user', message: failed[1] };
						wantHint = true;
					} else if (wantHint && problem && /^ {4}\S/.test(line)) {
						problem.hint = line.trim();
						wantHint = false;
					} else if (/^\s*\* installing/.test(line)) {
						this.step('update', 'Installing SmartifyOS');
					}
				};
				createInterface({ input: child.stdout! }).on('line', read('stdout'));
				createInterface({ input: child.stderr! }).on('line', read('stderr'));
				child.on('error', (error) => {
					this.emit('event', { type: 'output', stream: 'stderr', text: String(error) });
					resolve({ kind: 'bug', message: 'The installer could not be started.' });
				});
				child.on('close', () => resolve(problem));
			}, reject);
		});
	}
}
