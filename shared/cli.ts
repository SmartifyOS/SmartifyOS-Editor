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

/** A device the car's app has on its CAN bus, a `CanDevice` in its Dart. */
export interface CanDeviceDefinition {
	node: number;
	name: string;
	title: string;
}

/** What `device list` returns. */
export interface DeviceList {
	devices: DeviceInfo[];
	/** Every device the car's app defines, with a program or not. Missing from an older CLI. */
	defined?: CanDeviceDefinition[];
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
	/** What the parts of the 3D model and the drawing are called. Missing from an older CLI. */
	partNames?: { model3D: string[]; drawing2D: string[] };
}

/** What a setting of `config` is, which says how it is shown and given. */
export type ConfigFieldType =
	| 'bool'
	| 'number'
	| 'integer'
	| 'string'
	| 'enum'
	| 'duration'
	| 'color'
	| 'offset3d'
	| 'size'
	| 'ids'
	| 'list'
	| 'section'
	/** Another class, with settings of its own, see `SettingDetail`. An extension's only. */
	| 'object'
	/** A list or set of `item`s, or a map of them by a string, see `CollectionDetail`. */
	| 'array'
	| 'map'
	| 'code';

/** One setting `config` knows, by its key: `car.model3D.scale`. */
export interface ConfigField {
	/** The whole key, or for a field of a list's elements its name in the element. */
	key: string;
	type: ConfigFieldType;
	/** The CLI's own line about it. */
	describe: string;
	/** What SmartifyOS takes when it is not written, null when that is nothing. */
	default: ConfigValue;
	/** Null can be written, and means something else than leaving it out. */
	nullable?: boolean;
	/** Has to be given when its config or element is made. */
	required?: boolean;
	/** enum: the names it can be. */
	values?: string[];
	/** The ids constants of SmartifyOS stand for, by the constant's name. */
	constants?: Record<string, string>;
	/** section and list: its class. */
	className?: string;
	/** list: what each element has. */
	fields?: ConfigField[];
	/** The default as it is written, when it is code rather than a plain value. */
	defaultCode?: string;
	/** ids: whole numbers rather than names, each as it is written (`0x18d1`). */
	itemType?: 'integer';
	/** array and map: what each item is. */
	item?: ConfigField;
}

/** One element of a list of configs, like one wheel. */
export interface ConfigElement {
	/** Where it starts in `lib/main.dart`, from 1. */
	line: number;
	values: Record<string, ConfigValue>;
	/** What is written as code, by the field's name. */
	code: Record<string, string>;
	/** The whole element, when it is written as code. */
	asCode?: string;
}

/** A value of a setting: durations in milliseconds, colours as `#AARRGGBB`. */
export type ConfigValue =
	| boolean
	| number
	| string
	| null
	| { x: number; y: number; z: number }
	| { width: number; height: number }
	| string[]
	| ConfigElement[];

/**
 * What `extension settings` returns, every time: the settings an extension's class takes, and
 * what the app's `lib/main.dart` gives them, by name.
 */
export interface ExtensionSettingsResult {
	/** Its class, which is how the running app names it too (`describe`'s `extensions`). */
	className?: string;
	changed: boolean;
	manual: string[];
	/** Each argument of its constructor, with its doc comment as `describe`. */
	fields: ConfigField[];
	/** Whether the app hands it to SmartifyOS, where its settings go. */
	switchedOn: boolean;
	/** Where it is in `lib/main.dart`, from 1. */
	line: number | null;
	values: Record<string, ConfigValue>;
	code: Record<string, { code: string; line: number }>;
}

/**
 * What `extension settings --describe <key>` returns as `detail`: a setting with settings of its
 * own, the ways it can be made, and what the app gives it. Its settings are named by dotted keys,
 * `aiServer.url`.
 */
export interface SettingDetail {
	kind: 'object';
	key: string;
	className: string;
	/** Each constructor it can be made with, by its name after the dot, empty for the class's own. */
	makings: { name: string; fields: ConfigField[] }[];
	/** The ready-made ones it can be instead, as written: `SpeechModels.parakeet`. */
	constants: string[];
	written:
		| {
				kind: 'made';
				making: string;
				values: Record<string, ConfigValue>;
				code: Record<string, { code: string; line: number }>;
		  }
		| { kind: 'constant'; name: string }
		| { kind: 'code'; code: string; line: number }
		| null;
}

/**
 * What `extension settings --describe <key>` returns as `detail` for a list or map setting: its
 * items, each by its place or its key (`voices[de]`, `backups[2]`).
 */
export interface CollectionDetail {
	kind: 'collection';
	key: string;
	collection: 'array' | 'map';
	/** What each item is. */
	item: ConfigField;
	/** Each item: what it is when it can be read, the code it is written as otherwise. */
	entries: { key: string; line: number; value?: ConfigValue; code?: string }[];
	/** The whole list or map, when it is written as code rather than item by item. */
	code?: { code: string; line: number };
}

/** What `config` returns, every time: how the car is set up, and what it could set. */
export interface ConfigResult {
	changed: boolean;
	/** What has no clear place in `lib/main.dart`, as the line to add by hand. */
	manual: string[];
	fields: ConfigField[];
	/** What is written and can be read, by key. Anything else is its default. */
	values: Record<string, ConfigValue>;
	/** What is written as code, by key, with the line it is on. */
	code: Record<string, { code: string; line: number }>;
	/** Where each config that is written starts, from 1, by key. */
	lines: Record<string, number>;
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
	/**
	 * Every extension, by its class, and what it added to SmartifyOS while it was set up, by
	 * kind (`windows`, `widgets`, `tiles`, `settingsPages`, `statusIcons`, `layouts`, `themes`,
	 * `infoDisplayValues`). Missing from an older SmartifyOS.
	 */
	extensions?: {
		id: string;
		name: string;
		className: string;
		adds: Record<string, { id: string; title: string | null }[]>;
	}[];
	/**
	 * The configs `configure` can change as a whole while the app runs (`model3D`,
	 * `infoDisplay`). Missing from an older SmartifyOS, which needs a restart for them.
	 */
	live?: string[];
	/** Every settings page a page of the car's own can go in. Missing from an older SmartifyOS. */
	settingsPages?: { id: string; title: string; parent: string }[];
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
	/** Whether the app hands it to SmartifyOS, in `lib/main.dart` or any other file. */
	registered: boolean;
	/**
	 * What of it the CLI can change: all of it for one in a file of its own, the way the CLI
	 * makes them, nothing for one written some other way (several in a list, say).
	 */
	canChange: { name: boolean; icon: boolean; order: boolean; appList: boolean; remove: boolean };
	/** Where it sits among the others of its kind, smaller first. Null when not written, which is 100. */
	order: number | null;
	/** A window: whether its icon is in the app list. Null for the other kinds. */
	inAppList: boolean | null;
	/** Where its name and icon are written, another file for a window in an app list of its own. */
	nameAt: { file: string; line: number };
	/** Where what it shows or does is written. */
	line: number;
}

/** The kinds of settings rows the CLI writes: a switch, a choice, a button and information. */
export type RowKind = 'toggle' | 'choice' | 'action' | 'info';

/** One row of a settings page of the car's own, as `settings list` reports it. */
export interface SettingsRow {
	id: string | null;
	/** Null for a row written in code, which the editor leaves to VS Code. */
	kind: RowKind | null;
	title: string | null;
	subtitle: string | null;
	section: string | null;
	icon: string | null;
	/** The value it keeps between drives, which the app reads as `<name>.value`. */
	saved: { name: string; key: string | null; default: boolean | number | string | null } | null;
	/** The function of the owner's it runs, and whether they wrote anything in it yet. */
	code: { name: string; line: number; written: boolean } | null;
	options: { value: string; label: string }[];
	value: string | null;
	line: number;
}

/** A settings page of the car's own, as `settings list` reports it. */
export interface SettingsPageInfo {
	id: string | null;
	title: string | null;
	subtitle: string | null;
	icon: string | null;
	/** The page it goes in, by id. */
	parent: string | null;
	file: string;
	symbol: string | null;
	registered: boolean;
	/** Where its row sits on the page it goes in, smaller first. Null when not written, which is 100. */
	order: number | null;
	/** Whether the CLI can change it, false for one written some other way than it writes them. */
	editable: boolean;
	rows: SettingsRow[];
	line: number;
}
