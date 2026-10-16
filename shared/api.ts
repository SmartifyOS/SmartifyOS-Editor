import type { CarInfo, CliEvent } from './cli.ts';

/**
 * The contract between the main process and the window: what the preload script puts on
 * `window.smartify`, and the channel names behind it. Both sides import this file, so a
 * change here is checked on both.
 */

export type Platform = 'darwin' | 'win32' | 'linux';

/** Where the CLI is, or why it could not be used. */
export type CliStatus =
	{ found: true; path: string; version: string; sha: string } | { found: false; reason: string };

export interface RecentProject {
	path: string;
	name: string;
	/** ISO date of the last time it was opened. */
	openedAt: string;
	/** False when the folder is gone, for example on a drive that is not plugged in. */
	exists: boolean;
}

export interface Project {
	path: string;
	name: string;
	car: CarInfo;
}

export type OpenResult =
	| { ok: true; project: Project }
	| { ok: false; cancelled: true }
	| { ok: false; cancelled: false; message: string; hint?: string };

/** A rectangle in CSS pixels, relative to the top left of the window's web contents. */
export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * How the running app is shown inside the editor:
 * - `embedded`: its window is a child of the editor's (Windows, Linux on X11)
 * - `overlay`: its window is kept on top of the viewport and moved with it (macOS)
 * - `separate`: it runs in a window of its own, the fallback when neither works
 */
export type PreviewMode = 'embedded' | 'overlay' | 'separate';

export type PreviewState =
	| { status: 'idle' }
	| { status: 'starting' }
	| { status: 'running'; mode: PreviewMode; note?: string }
	| { status: 'stopping' }
	| { status: 'failed'; message: string; hint?: string };

/** One line for the console panel. */
export interface ConsoleLine {
	id: number;
	/** Which job printed it. */
	source: 'preview' | 'cli';
	level: 'info' | 'warn' | 'error' | 'success' | 'output' | 'stderr' | 'step';
	text: string;
	time: number;
}

/** An event of a CLI job started by the window, tagged with the job it belongs to. */
export interface JobEvent {
	jobId: string;
	event: CliEvent;
}

/**
 * Updates, as the window shows them. The editor and the tools behind it (the CLI) are one
 * thing to the user, so this is one state: the editor's own update wins when both happen.
 */
export type UpdateState =
	/** Nothing to do. `checkedAt` is set right after a check the user asked for. */
	| { status: 'idle'; checkedAt?: number }
	/** Only shown for a check the user asked for, background checks stay quiet. */
	| { status: 'checking' }
	| { status: 'downloading'; version?: string; percent: number | null }
	/** The editor's update is downloaded, a restart puts it in place. */
	| { status: 'ready'; version: string; notesUrl?: string }
	| { status: 'restarting' }
	/** Something was updated that needs no restart, shown for a moment. */
	| { status: 'updated' }
	/** Only shown for a check the user asked for. */
	| { status: 'failed'; message: string };

export interface SmartifyApi {
	platform: Platform;
	/** This editor's version, like `0.1.1`. */
	version(): Promise<string>;
	window: {
		minimize(): void;
		toggleMaximize(): void;
		close(): void;
	};
	cli: {
		status(): Promise<CliStatus>;
		/** Starts `smartify-os <args> --json` in the open project. Resolves with the job id. */
		start(args: string[]): Promise<string>;
		answer(jobId: string, promptId: string, value: unknown): void;
		cancel(jobId: string, promptId?: string): void;
		onEvent(listener: (event: JobEvent) => void): () => void;
	};
	projects: {
		recent(): Promise<RecentProject[]>;
		/** The project that is open, which outlives a reload of the window. */
		current(): Promise<Project | undefined>;
		/** Opens the folder given, or asks for one when there is none. */
		open(path?: string): Promise<OpenResult>;
		/** Reads the open project again, for example after the CLI changed it. */
		refresh(): Promise<OpenResult>;
		forget(path: string): Promise<RecentProject[]>;
		/** Where a new car's app goes unless the user picks another folder. */
		newLocation(): Promise<string>;
		close(): Promise<void>;
		reveal(path: string): void;
	};
	files: {
		/** Asks for a folder, starting in `defaultPath`. Undefined when nothing was picked. */
		pickFolder(title: string, defaultPath?: string): Promise<string | undefined>;
		/** Asks for a file with one of these extensions (like `glb`). */
		pickFile(title: string, extensions: string[]): Promise<string | undefined>;
	};
	preview: {
		start(): Promise<void>;
		stop(): Promise<void>;
		/** Hot reload, what `r` does in the terminal. */
		reload(): void;
		/** Hot restart, what `R` does in the terminal. */
		restart(): void;
		/** Where the viewport is, or null while it is hidden (a dialog over it, another page). */
		setViewport(rect: Rect | null): void;
		state(): Promise<PreviewState>;
		onState(listener: (state: PreviewState) => void): () => void;
	};
	updates: {
		state(): Promise<UpdateState>;
		onState(listener: (state: UpdateState) => void): () => void;
		/** Looks for updates now, and shows the result (unlike the checks in the background). */
		check(): void;
		/** Restarts into the downloaded update. */
		restart(): void;
	};
	console: {
		history(): Promise<ConsoleLine[]>;
		clear(): void;
		onLine(listener: (line: ConsoleLine) => void): () => void;
	};
}

/** IPC channel names. Invoke channels return a value, send channels do not. */
export const channels = {
	windowMinimize: 'window:minimize',
	windowToggleMaximize: 'window:toggle-maximize',
	windowClose: 'window:close',
	cliStatus: 'cli:status',
	cliStart: 'cli:start',
	cliAnswer: 'cli:answer',
	cliCancel: 'cli:cancel',
	cliEvent: 'cli:event',
	projectsRecent: 'projects:recent',
	projectsCurrent: 'projects:current',
	projectsOpen: 'projects:open',
	projectsRefresh: 'projects:refresh',
	projectsForget: 'projects:forget',
	projectsNewLocation: 'projects:new-location',
	projectsClose: 'projects:close',
	projectsReveal: 'projects:reveal',
	filesPickFolder: 'files:pick-folder',
	filesPickFile: 'files:pick-file',
	previewStart: 'preview:start',
	previewStop: 'preview:stop',
	previewReload: 'preview:reload',
	previewRestart: 'preview:restart',
	previewViewport: 'preview:viewport',
	previewState: 'preview:state',
	previewStateChanged: 'preview:state-changed',
	consoleHistory: 'console:history',
	consoleClear: 'console:clear',
	consoleLine: 'console:line',
	appVersion: 'app:version',
	updatesState: 'updates:state',
	updatesStateChanged: 'updates:state-changed',
	updatesCheck: 'updates:check',
	updatesRestart: 'updates:restart'
} as const;
