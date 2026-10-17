import type { AppReply, CarInfo, CliEvent, DeviceInfo, ResultEvent } from './cli.ts';

/**
 * The contract between the main process and the window: what the preload script puts on
 * `window.smartify`, and the channel names behind it. Both sides import this file, so a
 * change here is checked on both.
 */

export type Platform = 'darwin' | 'win32' | 'linux';

/**
 * Where the CLI is, or why it could not be used, and whether the editor can install it (not
 * over one pointed at with `SMARTIFY_OS_CLI`).
 */
export type CliStatus =
	| { found: true; path: string; version: string; sha: string }
	| { found: false; reason: string; canInstall: boolean };

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
	/** The devices on the car's CAN bus that have a program, from `device list`. */
	devices: DeviceInfo[];
}

/** An extension the editor recommends, see electron/catalog.ts. */
export interface CatalogExtension {
	/** Its GitHub address, which `extension add` takes. */
	url: string;
	title: string;
	/** A sentence or two about what it does. */
	description: string;
}

/** What the user can change on the settings page. */
export interface Settings {
	/** Looks for updates of the editor and its tools in the background, every few hours. */
	backgroundUpdates: boolean;
	/** Where new cars' apps go. Null is next to the car opened last. */
	newCarFolder: string | null;
}

export type VsCodeResult =
	{ ok: true } | { ok: false; missing: true } | { ok: false; missing: false; message: string };

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
		/**
		 * Runs `smartify-os <args> --json` in the open project quietly, for a command that asks
		 * nothing and changes nothing (like `update --check`): nothing goes to the console.
		 */
		query(args: string[]): Promise<ResultEvent>;
		/**
		 * Installs the CLI with its own installer, when it is missing. Resolves with the job id,
		 * whose events (steps, output, the result) come through `onEvent` like a command's.
		 */
		install(): Promise<string>;
	};
	projects: {
		recent(): Promise<RecentProject[]>;
		/** The project that is open, which outlives a reload of the window. */
		current(): Promise<Project | undefined>;
		/** Opens the folder given, or asks for one when there is none. */
		open(path?: string): Promise<OpenResult>;
		/** Reads the open project again, for example after the CLI changed it. */
		refresh(): Promise<OpenResult>;
		/**
		 * Called when files of the open project changed, in VS Code or anywhere else, with their
		 * paths relative to it: `lib/main.dart`, `pubspec.yaml`.
		 */
		onFilesChanged(listener: (paths: string[]) => void): () => void;
		forget(path: string): Promise<RecentProject[]>;
		/** Empties the list of recent projects. */
		forgetAll(): Promise<RecentProject[]>;
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
		/** Hot restart, what `R` does in the terminal. Resolves once it is done. */
		restart(): Promise<void>;
		/**
		 * Asks the running app something (`describe`, `configure`), see `call` in the CLI's
		 * README. Resolves with why not when it is not running.
		 */
		call(name: string, params?: Record<string, unknown>): Promise<AppReply>;
		/** Where the viewport is, or null while it is hidden (a dialog over it, another page). */
		setViewport(rect: Rect | null): void;
		state(): Promise<PreviewState>;
		onState(listener: (state: PreviewState) => void): () => void;
	};
	settings: {
		get(): Promise<Settings>;
		set(change: Partial<Settings>): Promise<Settings>;
		/** Called when the settings page is asked for from the app menu (macOS). */
		onOpen(listener: () => void): () => void;
	};
	/** Getting this computer ready, which happens once by itself after installing. */
	setup: {
		/** Whether it has never run on this computer yet. */
		needed(): Promise<boolean>;
		/** Remembers that it ran. */
		done(): void;
	};
	catalog: {
		/** The extensions the editor recommends. */
		extensions(): Promise<CatalogExtension[]>;
	};
	vscode: {
		/**
		 * Opens the car's app in VS Code, or a folder inside it (like a device's) with one of its
		 * files, at `line` when given. Both are relative to the car's app.
		 */
		open(folder?: string, file?: string, line?: number): Promise<VsCodeResult>;
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
	cliQuery: 'cli:query',
	cliInstall: 'cli:install',
	projectsRecent: 'projects:recent',
	projectsCurrent: 'projects:current',
	projectsOpen: 'projects:open',
	projectsRefresh: 'projects:refresh',
	projectsFilesChanged: 'projects:files-changed',
	projectsForget: 'projects:forget',
	projectsForgetAll: 'projects:forget-all',
	projectsNewLocation: 'projects:new-location',
	projectsClose: 'projects:close',
	projectsReveal: 'projects:reveal',
	filesPickFolder: 'files:pick-folder',
	filesPickFile: 'files:pick-file',
	previewStart: 'preview:start',
	previewStop: 'preview:stop',
	previewReload: 'preview:reload',
	previewRestart: 'preview:restart',
	previewCall: 'preview:call',
	previewViewport: 'preview:viewport',
	previewState: 'preview:state',
	previewStateChanged: 'preview:state-changed',
	consoleHistory: 'console:history',
	consoleClear: 'console:clear',
	consoleLine: 'console:line',
	settingsGet: 'settings:get',
	settingsSet: 'settings:set',
	settingsOpen: 'settings:open',
	setupNeeded: 'setup:needed',
	setupDone: 'setup:done',
	catalogExtensions: 'catalog:extensions',
	vscodeOpen: 'vscode:open',
	appVersion: 'app:version',
	updatesState: 'updates:state',
	updatesStateChanged: 'updates:state-changed',
	updatesCheck: 'updates:check',
	updatesRestart: 'updates:restart'
} as const;
