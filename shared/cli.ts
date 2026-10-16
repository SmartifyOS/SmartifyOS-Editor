/**
 * The CLI's `--json` protocol, as the editor reads it.
 *
 * Mirrors `src/ui/json.ts` in the SmartifyOS CLI repo, which is the source of truth (and its
 * README describes it for users). The protocol only ever grows, so an event or field this
 * file does not know yet is passed along untouched rather than dropped.
 */

/** The protocol version this app was written against. A newer CLI may add to it. */
export const knownProtocol = 1;

export type PromptKind = 'text' | 'password' | 'confirm' | 'select' | 'multiselect';

export interface PromptOption {
	value: unknown;
	label: string;
	hint?: string;
}

export interface PromptEvent {
	type: 'prompt';
	id: string;
	kind: PromptKind;
	message: string;
	options?: PromptOption[];
	initialValue?: unknown;
	placeholder?: string;
}

export type LogLevel =
	'info' | 'warn' | 'error' | 'success' | 'message' | 'step' | 'intro' | 'outro' | 'note';

export interface ErrorPayload {
	kind: 'user' | 'bug' | 'cancelled';
	message: string;
	hint?: string;
	details?: unknown;
	stack?: string;
}

export type CliEvent =
	| { type: 'start'; protocol: number; version: string; sha: string; command: string | null }
	| { type: 'log'; level: LogLevel; text: string; title?: string; data?: unknown }
	| { type: 'text'; text: string }
	| { type: 'step'; id: string; status: 'start' | 'update' | 'done' | 'error'; text: string }
	| PromptEvent
	| { type: 'prompt-invalid'; id: string; message: string }
	| { type: 'output'; stream: 'stdout' | 'stderr'; text: string }
	| { type: 'result'; ok: true; exitCode: number; data: unknown }
	| { type: 'result'; ok: false; exitCode: number; error: ErrorPayload };

export type ResultEvent = Extract<CliEvent, { type: 'result' }>;

/** Whatever `extension list --json` returns as data, the parts the app uses. */
export interface PackageInfo {
	name: string;
	title: string;
	version: string | null;
	commit: string | null;
	label: string;
	linkedTo: string | null;
	source: { kind: string; url?: string; path?: string; ref?: string };
}

export interface CarInfo {
	smartifyOs: PackageInfo;
	extensions: (PackageInfo & { switchedOn: boolean | null })[];
}

/** A device on the car's CAN bus with a program, as `device list` and the other device commands report one. */
export interface DeviceInfo {
	/** `CanDevice.name` in the car's app. */
	name: string;
	/** Its folder, relative to the car's app: `devices/headlights`. */
	folder: string;
	/** Its firmware's version, like `1.0.0`. */
	version: string;
	/** PlatformIO's name for its board. */
	board: string | null;
}

/** What `device list` returns. */
export interface DeviceList {
	devices: DeviceInfo[];
}

/** What `update --check` returns: `to` is the newer SmartifyOS, null when the car has it. */
export interface CoreUpdateCheck {
	changed: boolean;
	from: string;
	to: string | null;
}

/** What `extension update` returns, with `--check` too: `available` is every update there is. */
export interface ExtensionUpdates {
	changed: boolean;
	available: { name: string; title: string; from: string; to: string }[];
	updated: { name: string; title: string; from: string; to: string }[];
}

/** The parts of what `device create` returns that the app uses. */
export interface DeviceCreated {
	device: { name: string; node: number; title: string; new: boolean };
	board: string;
	/** Relative to the car's app: `devices/headlights`. */
	folder: string;
}

/**
 * One thing to do next, which a `note` carries as `data.steps`. `kind` says what it is,
 * `text` is how the terminal says it, `path` the file or folder it is about.
 */
export interface NextStep {
	kind: string;
	text: string;
	path?: string;
}

/** One thing `doctor` checked on this computer. */
export interface DoctorCheck {
	id: string;
	/** `Flutter`. */
	title: string;
	status: 'ok' | 'warning' | 'error';
	/** What was found, or what is wrong. */
	summary: string;
	/** What it is needed for, when that is not everything. */
	neededFor?: string;
	/** What to do about it, in the CLI's words. */
	hint?: string;
	/** The arguments of the command that puts it right, when one does: `['setup']`. */
	fix?: string[];
	path?: string;
}

/**
 * What `doctor` returns, and `setup` as its `doctor`. When there is an error the command
 * fails, with this as its `error.details`.
 */
export interface DoctorReport {
	/** Nothing failed, so a car can be made here. Warnings do not count. */
	ready: boolean;
	errors: number;
	warnings: number;
	checks: DoctorCheck[];
}
