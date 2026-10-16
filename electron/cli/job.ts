import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { createInterface } from 'node:readline';
import type { CliEvent, ResultEvent } from '../../shared/cli.ts';
import { killTree } from '../system/processes.ts';

/**
 * One run of the CLI with `--json`: every line it prints is an event, and questions are
 * answered by writing JSON lines to its stdin (the protocol is in the CLI's README).
 *
 * The CLI does the real work. This class only carries events out and answers in, so the
 * desktop app never needs its own copy of what a command does.
 */

export interface JobOptions {
	cwd?: string;
	env?: NodeJS.ProcessEnv;
	/**
	 * Whether questions can be answered. When false, stdin is closed straight away, so a
	 * command that would ask something fails at once (naming the question) instead of waiting.
	 */
	interactive?: boolean;
}

let nextId = 0;

export class CliJob extends EventEmitter<{ event: [CliEvent] }> {
	readonly id: string;
	readonly result: Promise<ResultEvent>;
	private readonly child: ChildProcessWithoutNullStreams;
	private finished = false;

	constructor(cliPath: string, args: string[], options: JobOptions = {}) {
		super();
		nextId += 1;
		this.id = `job${nextId}`;
		this.child = spawn(cliPath, [...args, '--json'], {
			cwd: options.cwd,
			env: options.env,
			windowsHide: true,
			// A .cmd shim (a dev install on Windows) can only be started through the shell.
			shell: process.platform === 'win32' && /\.cmd$/i.test(cliPath)
		});
		if (options.interactive === false) this.child.stdin.end();
		this.child.stdin.on('error', () => {
			// It has stopped already, and an answer sent too late means nothing.
		});

		let result: ResultEvent | undefined;
		createInterface({ input: this.child.stdout }).on('line', (line) => {
			const event = parseEvent(line);
			if (event.type === 'result') result = event;
			this.emit('event', event);
		});
		// In JSON mode the CLI prints nothing to stderr, so anything there is worth showing.
		createInterface({ input: this.child.stderr }).on('line', (line) => {
			if (line.trim()) this.emit('event', { type: 'output', stream: 'stderr', text: line });
		});

		this.result = new Promise((resolve) => {
			const finish = (exitCode: number, message?: string) => {
				if (this.finished) return;
				this.finished = true;
				if (result) return resolve(result);
				// It ended without saying how, a crash or a kill.
				const event: ResultEvent = {
					type: 'result',
					ok: false,
					exitCode,
					error: {
						kind: 'bug',
						message: message ?? `The SmartifyOS CLI stopped unexpectedly (exit code ${exitCode}).`
					}
				};
				this.emit('event', event);
				resolve(event);
			};
			this.child.on('error', (error) => finish(1, `Could not start the CLI: ${error.message}`));
			this.child.on('close', (code) => finish(code ?? 1));
		});
	}

	get pid(): number | undefined {
		return this.child.pid;
	}

	get running(): boolean {
		return !this.finished;
	}

	private send(message: object): void {
		if (this.finished || this.child.stdin.writableEnded) return;
		this.child.stdin.write(`${JSON.stringify(message)}\n`);
	}

	answer(promptId: string, value: unknown): void {
		this.send({ id: promptId, value });
	}

	/** Cancels the open question, the same as Ctrl+C in the terminal. */
	cancel(promptId?: string): void {
		this.send({ id: promptId, cancel: true });
	}

	/** Types into the tool the CLI is running, like `r` into `flutter run`. */
	input(text: string): void {
		this.send({ input: text });
	}

	/** Stops it and everything it started, at once. */
	kill(): void {
		if (this.finished || this.child.pid === undefined) return;
		killTree(this.child.pid);
	}
}

/** Internal: one stdout line as an event. Anything that is not JSON becomes plain text. */
function parseEvent(line: string): CliEvent {
	try {
		const parsed: unknown = JSON.parse(line);
		if (typeof parsed === 'object' && parsed !== null && 'type' in parsed) {
			return parsed as CliEvent;
		}
	} catch {
		// Said below.
	}
	return { type: 'text', text: line };
}

/** Runs a command that asks nothing and resolves with its result. */
export async function runCli(
	cliPath: string,
	args: string[],
	options: Omit<JobOptions, 'interactive'> = {}
): Promise<ResultEvent> {
	return await new CliJob(cliPath, args, { ...options, interactive: false }).result;
}
