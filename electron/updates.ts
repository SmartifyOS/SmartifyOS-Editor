import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { UpdateState } from '../shared/api.ts';
import { cliEnv } from './cli/environment.ts';
import { CliJob, runCli } from './cli/job.ts';
import { anyRunning } from './cli/jobs.ts';
import { cliStatus } from './cli/locate.ts';
import { settings } from './settings.ts';

/**
 * Keeps the editor and the tools behind it up to date, as one thing for the user.
 *
 * - The editor updates itself with electron-updater from the GitHub releases (the update
 *   files are published by release.yml). It downloads in the background, and a restart puts
 *   it in place, or the next quit does.
 * - The CLI updates itself with `smartify-os self-update`, which needs no restart. It waits
 *   until no CLI job is running, since a running program cannot be replaced on Windows.
 *
 * Background checks never bother the user: only a found update shows, and they can be
 * switched off in the settings. A check the user asks for also shows that it is checking,
 * that all is up to date, or that it failed.
 */

const releasesUrl = 'https://github.com/SmartifyOS/SmartifyOS-Editor/releases';
const firstCheckDelayMs = 8_000;
const checkEveryMs = 4 * 60 * 60 * 1000;
/** How long "Updated" and "Up to date" stay in the status bar. */
const noticeMs = 6_000;

type EditorPart =
	| { phase: 'none' }
	| { phase: 'downloading'; version: string; percent: number | null }
	| { phase: 'ready'; version: string };

type ToolsPart =
	| { phase: 'none' }
	| { phase: 'downloading'; percent: number | null }
	| { phase: 'updated'; until: number };

export class Updates {
	private editor: EditorPart = { phase: 'none' };
	private tools: ToolsPart = { phase: 'none' };
	/** The outcome of the last check the user asked for. */
	private manual: { checking: boolean; failed?: string; checkedAt?: number } = {
		checking: false
	};
	private restarting = false;
	private checking = false;
	private toolsPending = false;
	private readonly editorUpdates: boolean;

	constructor(
		private readonly onState: (state: UpdateState) => void,
		/** Stops the preview and every CLI job, right before the editor restarts. */
		private readonly beforeRestart: () => void
	) {
		// Pointing the updater somewhere else is for trying an update from source, see
		// "Trying updates" in AGENTS.md. Only a packaged app updates itself otherwise.
		const testFeed = process.env.SMARTIFY_OS_UPDATE_URL;
		if (testFeed) {
			// A config file rather than setFeedURL: the download reads it too, for its cache.
			const config = join(app.getPath('temp'), 'smartify-os-editor-test-update.yml');
			writeFileSync(
				config,
				`provider: generic\nurl: ${testFeed}\nupdaterCacheDirName: smartify-os-editor-test-updater\n`
			);
			autoUpdater.forceDevUpdateConfig = true;
			autoUpdater.updateConfigPath = config;
		}
		this.editorUpdates = app.isPackaged || Boolean(testFeed);

		autoUpdater.autoDownload = true;
		autoUpdater.autoInstallOnAppQuit = true;
		autoUpdater.on('update-available', (info) => {
			this.editor = { phase: 'downloading', version: info.version, percent: null };
			this.emit();
		});
		autoUpdater.on('download-progress', (progress) => {
			if (this.editor.phase !== 'downloading') return;
			this.editor = { ...this.editor, percent: Math.floor(progress.percent) };
			this.emit();
		});
		autoUpdater.on('update-downloaded', (info) => {
			this.editor = { phase: 'ready', version: info.version };
			this.emit();
		});
		autoUpdater.on('error', (error) => {
			console.error('Updating the editor failed:', error);
			// A failed download is tried again on the next check. Ready stays ready.
			if (this.editor.phase === 'downloading') {
				this.editor = { phase: 'none' };
				this.emit();
			}
		});
	}

	/** Starts checking in the background: soon after launch, then every few hours. */
	start(): void {
		setTimeout(() => void this.check(false), firstCheckDelayMs);
		setInterval(() => void this.check(false), checkEveryMs);
	}

	get state(): UpdateState {
		const now = Date.now();
		if (this.restarting) return { status: 'restarting' };
		if (this.editor.phase === 'ready') {
			const version = this.editor.version;
			return { status: 'ready', version, notesUrl: `${releasesUrl}/tag/v${version}` };
		}
		if (this.editor.phase === 'downloading') {
			const { version, percent } = this.editor;
			return { status: 'downloading', version, percent };
		}
		if (this.tools.phase === 'downloading') {
			return { status: 'downloading', percent: this.tools.percent };
		}
		if (this.manual.checking) return { status: 'checking' };
		if (this.manual.failed) return { status: 'failed', message: this.manual.failed };
		if (this.tools.phase === 'updated' && this.tools.until > now) return { status: 'updated' };
		return { status: 'idle', checkedAt: this.manual.checkedAt };
	}

	private emit(): void {
		this.onState(this.state);
	}

	/** Looks for updates of the editor and of the tools. `manual` shows the outcome too. */
	async check(manual: boolean): Promise<void> {
		// Switched off in the settings, only a check the user asks for happens then.
		if (!manual && !settings().backgroundUpdates) return;
		if (manual) {
			this.manual = { checking: true };
			this.emit();
		}
		if (this.checking) return;
		this.checking = true;
		const problems: string[] = [];
		try {
			await Promise.all([
				this.checkEditor().catch((error: unknown) => problems.push(describe(error))),
				this.checkTools().catch((error: unknown) => problems.push(describe(error)))
			]);
		} finally {
			this.checking = false;
		}
		if (this.manual.checking) {
			this.manual = problems.length
				? { checking: false, failed: problems[0] }
				: { checking: false, checkedAt: Date.now() };
			this.emit();
			// "Up to date" and the failure are only shown for a moment.
			setTimeout(() => {
				this.manual = { checking: false };
				this.emit();
			}, noticeMs);
		}
	}

	private async checkEditor(): Promise<void> {
		// Nothing to look for while one is on its way or waiting for the restart.
		if (!this.editorUpdates || this.editor.phase !== 'none') return;
		// It downloads by itself when there is one, the events above follow it, and the error
		// event reports a failed download.
		const result = await autoUpdater.checkForUpdates();
		result?.downloadPromise?.catch(() => {});
	}

	private async checkTools(): Promise<void> {
		if (this.toolsPending || this.tools.phase === 'downloading') return;
		const cli = await cliStatus();
		if (!cli.found) return;
		const result = await runCli(cli.path, ['self-update', '--check'], { env: await cliEnv() });
		if (!result.ok) {
			// A CLI running from its source code updates with git, not from here.
			if (/source code/i.test(result.error.message)) return;
			throw new Error(result.error.message);
		}
		const { to } = result.data as { to: string | null };
		if (!to) return;
		this.toolsPending = true;
		void this.installToolsWhenIdle(cli.path);
	}

	/** Internal: updates the CLI as soon as nothing uses it. */
	private async installToolsWhenIdle(cliPath: string): Promise<void> {
		while (anyRunning()) await new Promise((resolve) => setTimeout(resolve, 5_000));

		this.tools = { phase: 'downloading', percent: null };
		this.emit();
		const job = new CliJob(cliPath, ['self-update', '--yes'], {
			env: await cliEnv(),
			interactive: false
		});
		job.on('event', (event) => {
			if (event.type !== 'step' || this.tools.phase !== 'downloading') return;
			const percent = /(\d+)%/.exec(event.text)?.[1];
			if (percent === undefined) return;
			this.tools = { phase: 'downloading', percent: Number(percent) };
			this.emit();
		});
		const result = await job.result;
		this.toolsPending = false;

		if (result.ok && (result.data as { changed?: boolean }).changed) {
			// The next command runs the new version, the status shows it straight away.
			await cliStatus(true);
			this.tools = { phase: 'updated', until: Date.now() + noticeMs };
			setTimeout(() => this.emit(), noticeMs + 100);
		} else {
			if (!result.ok) console.error('Updating the CLI failed:', result.error.message);
			this.tools = { phase: 'none' };
		}
		this.emit();
	}

	/** Restarts into the downloaded editor update. */
	restart(): void {
		if (this.editor.phase !== 'ready' || this.restarting) return;
		this.restarting = true;
		this.emit();
		this.beforeRestart();
		// Silent on Windows (no installer window), and the editor opens again afterwards.
		setImmediate(() => autoUpdater.quitAndInstall(true, true));
	}
}

function describe(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	// Offline is the usual reason, and says so better than a stack of network errors.
	if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ERR_INTERNET_DISCONNECTED|net::/i.test(message)) {
		return 'Could not reach the internet to look for updates.';
	}
	return message.split('\n')[0] ?? message;
}
