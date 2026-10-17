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
	| { type: 'reply'; id: string | null; ok: true; data: unknown }
	| { type: 'reply'; id: string | null; ok: false; error: string }
	| { type: 'result'; ok: true; exitCode: number; data: unknown }
	| { type: 'result'; ok: false; exitCode: number; error: ErrorPayload };

export type ResultEvent = Extract<CliEvent, { type: 'result' }>;

/** What the running app answered to a `call`, while `run` runs it. */
export type AppReply = { ok: true; data: unknown } | { ok: false; error: string };

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

/** What sits in the bar, by the name of its `BarContent` constructor. */
export type BarChoice = 'infoDisplay' | 'dock' | 'infoDisplayAndDock';

/** The ways a car can be drawn, by their names in `CarLook`. */
export type CarLookName = 'model3D' | 'drawing2D' | 'image';

/** What the About page says about the car, as `appearance` and `about` report it. */
export interface AboutInfo {
	/** What the car is called, null when it is written as code. */
	name: string | null;
	model: string | null;
	extra: Record<string, string>;
}

/** How the car's app looks, as `appearance` reads it from `lib/main.dart`. */
export interface Appearance {
	/** The layout it starts with, null when it is written as code (see `code`). */
	layout: string | null;
	/** The theme every layout wears until the driver picks one, null for each layout's own. */
	theme: string | null;
	driverSide: 'left' | 'right' | null;
	bar: BarChoice | null;
	/** The pictures of the car, as paths inside the app, and which it starts with. */
	car: Record<CarLookName, string | null> & { look: CarLookName | null };
	about: AboutInfo;
	/** Settings written as code the CLI cannot read, as written: `{ layout: 'myLayout' }`. */
	code: Record<string, string>;
}

/** What `appearance` returns, `--show` included. */
export interface AppearanceResult {
	changed: boolean;
	appearance: Appearance;
	/** What has no clear place in `lib/main.dart`, as the line to add by hand. */
	manual: string[];
	/** The pictures copied into the app. */
	assets: string[];
	/** The running app only shows it after a restart. */
	restart: boolean;
}

/** What `about` returns, `--show` included. */
export interface AboutResult {
	changed: boolean;
	about: AboutInfo;
	manual: string[];
}

/** What the running app answers to `describe` and `configure`. */
export interface AppDescription {
	layouts: { id: string; title: string; description: string | null; theme: string | null }[];
	layout: { default: string | null; picked: string | null; current: string | null };
	themes: { id: string; title: string }[];
	theme: { default: string | null; picked: string | null; current: string };
	driverSide: 'left' | 'right';
	bar: BarChoice | 'custom';
	car: {
		looks: CarLookName[];
		default: CarLookName | null;
		picked: CarLookName | null;
		current: CarLookName | null;
	};
	about: { deviceName: string; model: string | null; extra: Record<string, string> };
}

/** One field of a CAN message, as the running app describes it, with what it can hold. */
export type CanFieldInfo = { name: string } & (
	| { kind: 'bool' }
	| { kind: 'int'; min: number; max: number }
	| { kind: 'number'; min: number; max: number; step: number }
	| { kind: 'float' }
	| { kind: 'choice'; choices: string[] }
);

/** What the running app answers to `canDescribe`: the car's CAN bus. */
export interface CanNetwork {
	devices: { node: number; name: string; title: string; online: boolean; pretending: boolean }[];
	messages: {
		id: number;
		extended: boolean;
		name: string;
		/** The node of the device that sends it, null for the screen's own or one not said. */
		from: number | null;
		fields: CanFieldInfo[];
	}[];
}

/** One frame the app sent on the bus, as `canTraffic` lists it. */
export interface CanSentFrame {
	seq: number;
	/** Milliseconds since 1970. */
	at: number;
	id: number;
	extended: boolean;
	data: number[];
	/** The message it is, null when the bus has none with its id. */
	message: string | null;
	values: Record<string, unknown> | null;
}

/** What the CLI calls the kinds of things it makes in a car's app (`window`, `tile`, `widget`). */
export type PartKind = 'window' | 'tile' | 'widget';

export type PartVariant = 'fullscreen' | 'floating' | 'toggle' | 'button' | 'card' | 'pinned';

/** One window, quick settings tile or home screen widget, as `<kind> list` and the others report it. */
export interface Part {
	kind: PartKind;
	id: string | null;
	/** What the driver reads, null when it is not plain text in its file. */
	name: string | null;
	variant: PartVariant | null;
	/** Its name in Flutter's `Icons`, null when it is anything else. */
	icon: string | null;
	/** Relative to the car's app: `lib/windows/trip_computer_window.dart`. */
	file: string;
	symbol: string | null;
	/** Whether `lib/main.dart` hands it to SmartifyOS. */
	registered: boolean;
	/** Where what it shows or does is written. */
	line: number;
}
