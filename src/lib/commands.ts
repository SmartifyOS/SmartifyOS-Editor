import type {
	BarChoice,
	CarLookName,
	DoctorCheck,
	Part,
	PartKind,
	PartVariant,
	RowKind,
	SettingsPageInfo
} from '../../shared/cli.ts';
import { carLooks } from './look.ts';
import { kindWords } from './parts.ts';
import { rowWords } from './settings.ts';
import type { TaskSpec } from './state/task.svelte.ts';

/**
 * Every CLI command the window runs on the open car, in one place: what the window calls it
 * and the arguments it goes to the CLI with. Whatever else a command needs it asks for
 * itself (a `prompt` event, answered in the task dialog), so a change in the CLI is at most
 * a change here. The README of the CLI says what each one does.
 */
export const commands = {
	updateSmartifyOs: (): TaskSpec => ({
		title: 'Update SmartifyOS',
		args: ['update'],
		changes: 'car'
	}),
	/** The extension at a GitHub address, or the CLI asks for the address. */
	addExtension: (url?: string): TaskSpec => ({
		title: 'Add an extension',
		args: ['extension', 'add', ...(url ? [url] : [])],
		changes: 'car'
	}),
	updateExtension: (name: string, title: string): TaskSpec => ({
		title: `Update ${title}`,
		args: ['extension', 'update', name],
		changes: 'car'
	}),
	/** Every extension that has an update, the CLI asks which. */
	updateExtensions: (): TaskSpec => ({
		title: 'Update the extensions',
		args: ['extension', 'update'],
		changes: 'car'
	}),
	removeExtension: (name: string, title: string): TaskSpec => ({
		title: `Remove ${title}`,
		args: ['extension', 'remove', name],
		changes: 'car'
	}),
	link: (folder: string): TaskSpec => ({
		title: 'Use a copy from a folder',
		args: ['link', folder],
		changes: 'car'
	}),
	unlink: (name: string, title: string): TaskSpec => ({
		title: `Go back to the released ${title}`,
		args: ['unlink', name],
		changes: 'car'
	}),
	/**
	 * Puts the device into the car's app too when it is a new one, so it changes the car. With
	 * a name, the program of the device of that name; `usb` for a board on a USB cable, which
	 * the CLI otherwise asks about.
	 */
	createDevice: (name?: string, usb = false): TaskSpec => ({
		title: usb ? 'Make a board on USB' : 'Make a device',
		args: ['device', 'create', ...(name ? [name] : []), ...(usb ? ['--usb'] : [])],
		changes: 'car'
	}),
	/** With the running app stopped meanwhile, since it may have the board's port open. */
	flashDevice: (name: string): TaskSpec => ({
		title: `Put ${name} on its board`,
		args: ['device', 'flash', name],
		changes: 'devices',
		stopsApp: true
	}),
	/** The devices named, or the CLI asks which. */
	exportDevices: (names: string[] = []): TaskSpec => ({
		title: 'Export firmware',
		args: ['device', 'export', ...names],
		changes: 'devices'
	}),
	/** Changes a board on USB where the car's app defines it, and its sketch's speed with it. */
	editUsbDevice: (name: string, change: { title?: string; baudRate?: number }): string[] => [
		'device',
		'edit',
		name,
		...(change.title !== undefined ? ['--title', change.title] : []),
		...(change.baudRate !== undefined ? ['--baud-rate', String(change.baudRate)] : [])
	],
	exportInstaller: (): TaskSpec => ({
		title: 'Export installer',
		args: ['export', 'installer'],
		changes: 'nothing'
	}),
	exportUpdate: (): TaskSpec => ({
		title: 'Export update',
		args: ['export', 'update'],
		changes: 'nothing'
	}),
	exportAndroid: (): TaskSpec => ({
		title: 'Export for Android',
		args: ['export', 'android'],
		changes: 'nothing'
	})
};

/** A change to how the car looks, as the inspector makes it. Anything left out stays. */
export interface LookChange {
	layout?: string;
	/** Null is each layout wearing its own. */
	theme?: string | null;
	driverSide?: 'left' | 'right';
	bar?: BarChoice;
	/** A file on this computer, or null to take that picture of the car out. */
	files?: Partial<Record<CarLookName, string | null>>;
	/** Null is the first picture there is. */
	look?: CarLookName | null;
	name?: string;
	/** Empty leaves it out. */
	model?: string;
	/** Rows of the About page by label, an empty value takes one off. */
	extra?: Record<string, string>;
}

/**
 * The commands that write a {@link LookChange} into `lib/main.dart`, run without the task
 * dialog: `appearance`, `about`, or both. Data: `AppearanceResult` and `AboutResult`.
 */
export function lookCommands(change: LookChange): { appearance?: string[]; about?: string[] } {
	const appearance: string[] = [];
	if (change.layout !== undefined) appearance.push('--layout', change.layout);
	if (change.theme !== undefined) appearance.push('--theme', change.theme ?? 'none');
	if (change.driverSide !== undefined) appearance.push('--driver-side', change.driverSide);
	if (change.bar !== undefined) {
		const flag = { infoDisplay: 'info-display', dock: 'dock', infoDisplayAndDock: 'both' };
		appearance.push('--bar', flag[change.bar]);
	}
	for (const look of carLooks) {
		const file = change.files?.[look.id];
		if (file !== undefined) appearance.push(`--${look.flag}`, file ?? 'none');
	}
	if (change.look !== undefined) {
		appearance.push('--look', carLooks.find((look) => look.id === change.look)?.flag ?? 'first');
	}

	const about: string[] = [];
	if (change.name !== undefined) about.push('--name', change.name);
	if (change.model !== undefined) about.push('--car', change.model);
	for (const [label, value] of Object.entries(change.extra ?? {})) {
		about.push('--extra', `${label}=${value}`);
	}

	return {
		...(appearance.length > 0 ? { appearance: ['appearance', ...appearance] } : {}),
		...(about.length > 0 ? { about: ['about', ...about] } : {})
	};
}

/**
 * The commands for the windows, quick settings tiles and home screen widgets of the car's app,
 * run without the task dialog. A question they ask (removing one asks first) goes to the
 * prompt dialog. Data: `{ part: Part }`, and `{ parts: Part[] }` for `list`.
 */
export const partCommands = {
	list: (kind: PartKind): string[] => [kind, 'list'],
	create: (kind: PartKind, name: string, variant: PartVariant, icon: string): string[] => [
		kind,
		'create',
		name,
		'--kind',
		kindWords[kind].variants.find((known) => known.id === variant)?.flag ?? variant,
		'--icon',
		icon
	],
	edit: (part: Part, change: PartChange): string[] => [
		part.kind,
		'edit',
		partQuery(part),
		...(change.name !== undefined ? ['--name', change.name] : []),
		...(change.icon !== undefined ? ['--icon', change.icon] : []),
		...(change.order !== undefined ? ['--order', change.order?.toString() ?? ''] : []),
		...(change.appList !== undefined ? ['--app-list', change.appList ? 'on' : 'off'] : [])
	],
	remove: (part: Part): string[] => [part.kind, 'remove', partQuery(part)]
};

/** What can be changed of a part. A null order goes back to the usual place. */
export interface PartChange {
	name?: string;
	icon?: string;
	order?: number | null;
	/** A window: whether its icon is in the app list. */
	appList?: boolean;
}

/** Internal: what the CLI finds a part by, its id, or its file when it has none. */
function partQuery(part: Part): string {
	return part.id ?? part.file.split('/').pop() ?? part.file;
}

/** A change to a row of a settings page. Anything left out stays as it is. */
export interface RowEdit {
	title?: string;
	/** Empty takes it off. */
	subtitle?: string;
	/** Empty takes it off. */
	section?: string;
	remember?: boolean;
	code?: boolean;
	/** For a switch true or false, for a choice an option's value. */
	default?: boolean | string;
	/** A choice: every option, by label. */
	options?: string[];
	value?: string;
}

/** Internal: a row edit as flags of `settings add-row` and `edit-row`. */
function rowFlags(edit: RowEdit): string[] {
	const flags: string[] = [];
	if (edit.title !== undefined) flags.push('--title', edit.title);
	if (edit.subtitle !== undefined) flags.push('--subtitle', edit.subtitle);
	if (edit.section !== undefined) flags.push('--section', edit.section);
	if (edit.remember !== undefined) flags.push('--remember', edit.remember ? 'on' : 'off');
	if (edit.code !== undefined) flags.push('--code', edit.code ? 'on' : 'off');
	if (edit.default !== undefined) {
		flags.push(
			'--default',
			typeof edit.default === 'boolean' ? (edit.default ? 'on' : 'off') : edit.default
		);
	}
	for (const option of edit.options ?? []) flags.push('--option', option);
	if (edit.value !== undefined) flags.push('--value', edit.value);
	return flags;
}

/**
 * The commands for the car's own settings pages and their rows, run without the task dialog.
 * Removing a page asks first, in the prompt dialog. Data: `{ page }`, `{ pages }` for `list`.
 */
export const settingsCommands = {
	list: (): string[] => ['settings', 'list'],
	create: (title: string, parent: string, icon: string): string[] => [
		'settings',
		'create',
		title,
		'--in',
		parent,
		'--icon',
		icon
	],
	edit: (
		page: SettingsPageInfo,
		change: {
			title?: string;
			subtitle?: string;
			icon?: string;
			parent?: string;
			order?: number | null;
		}
	): string[] => [
		'settings',
		'edit',
		pageQuery(page),
		...(change.title !== undefined ? ['--title', change.title] : []),
		...(change.subtitle !== undefined ? ['--subtitle', change.subtitle] : []),
		...(change.icon !== undefined ? ['--icon', change.icon] : []),
		...(change.parent !== undefined ? ['--in', change.parent] : []),
		...(change.order !== undefined ? ['--order', change.order?.toString() ?? ''] : [])
	],
	remove: (page: SettingsPageInfo): string[] => ['settings', 'remove', pageQuery(page)],
	addRow: (page: SettingsPageInfo, kind: RowKind, title: string): string[] => [
		'settings',
		'add-row',
		pageQuery(page),
		title,
		'--kind',
		rowWords[kind].flag
	],
	editRow: (page: SettingsPageInfo, row: string, edit: RowEdit): string[] => [
		'settings',
		'edit-row',
		pageQuery(page),
		row,
		...rowFlags(edit)
	],
	removeRow: (page: SettingsPageInfo, row: string): string[] => [
		'settings',
		'remove-row',
		pageQuery(page),
		row
	],
	moveRow: (page: SettingsPageInfo, row: string, direction: 'up' | 'down'): string[] => [
		'settings',
		'move-row',
		pageQuery(page),
		row,
		`--${direction}`
	]
};

/**
 * The commands that change one setting of `SmartifyOs().init` by its key (see `config` in the
 * CLI's README), run without the task dialog, one at a time. Values are given the way the CLI
 * takes them typed, see `configText`. Data: `ConfigResult`.
 */
export const configCommands = {
	set: (key: string, value: string) => ['config', '--set', `${key}=${value}`],
	/** Back to SmartifyOS's own default. */
	unset: (key: string) => ['config', '--unset', key],
	/** At the end of a list, an element as JSON or an id. */
	add: (key: string, value: string) => ['config', '--add', `${key}=${value}`],
	/** An element by its place, `key[2]`. */
	remove: (element: string) => ['config', '--remove', element],
	/** An id out of a list of ids. */
	removeId: (key: string, id: string) => ['config', '--remove', `${key}=${id}`],
	move: (element: string, to: number) => ['config', '--move', `${element}=${to}`]
};

/**
 * The commands that read and change an extension's settings, the arguments its class takes in
 * `lib/main.dart`, by its package name. Data: `ExtensionSettingsResult`.
 */
export const extensionSettingsCommands = {
	read: (name: string) => ['extension', 'settings', name],
	/** Data: `{ detail: SettingDetail }`. */
	describe: (name: string, key: string) => ['extension', 'settings', name, '--describe', key],
	set: (name: string, key: string, value: string) => [
		'extension',
		'settings',
		name,
		'--set',
		`${key}=${value}`
	],
	unset: (name: string, key: string) => ['extension', 'settings', name, '--unset', key],
	add: (name: string, key: string, id: string) => [
		'extension',
		'settings',
		name,
		'--add',
		`${key}=${id}`
	],
	remove: (name: string, key: string, id: string) => [
		'extension',
		'settings',
		name,
		'--remove',
		`${key}=${id}`
	]
};

/** Internal: what the CLI finds a page by, its id, or its file when it has none. */
function pageQuery(page: SettingsPageInfo): string {
	return page.id ?? page.file.split('/').pop() ?? page.file;
}

/** Commands about this computer rather than the car. */
export const computerCommands = {
	/** Installs Flutter unless there is one, asks about PlatformIO, then checks everything. */
	setUp: (): TaskSpec => ({
		title: 'Get this computer ready',
		args: ['setup'],
		changes: 'nothing'
	}),
	/** What the doctor says puts one of its checks right, like `setup --platformio`. */
	fix: (check: DoctorCheck): TaskSpec => ({
		title: `Set up ${check.title}`,
		args: check.fix ?? ['setup'],
		changes: 'nothing'
	})
};

/** Questions asked quietly in the background, which ask nothing back and change nothing. */
export const checks = {
	/** Data: `CoreUpdateCheck`. */
	smartifyOs: ['update', '--check'],
	/** Data: `ExtensionUpdates`. */
	extensions: ['extension', 'update', '--check'],
	/** Data: `DoctorReport`, or the same as `error.details` when something is missing. */
	computer: ['doctor'],
	/** Data: `AppearanceResult`, how the car looks and its About page. */
	appearance: ['appearance', '--show'],
	/** Data: `ConfigResult`, every other setting in `lib/main.dart`. */
	config: ['config']
};
