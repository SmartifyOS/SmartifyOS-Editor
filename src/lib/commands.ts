import type { DoctorCheck } from '../../shared/cli.ts';
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
	/** Puts the device into the car's app too when it is a new one, so it changes the car. */
	createDevice: (): TaskSpec => ({
		title: 'Make a device',
		args: ['device', 'create'],
		changes: 'car'
	}),
	flashDevice: (name: string): TaskSpec => ({
		title: `Put ${name} on its board`,
		args: ['device', 'flash', name],
		changes: 'devices'
	}),
	/** The devices named, or the CLI asks which. */
	exportDevices: (names: string[] = []): TaskSpec => ({
		title: 'Export firmware',
		args: ['device', 'export', ...names],
		changes: 'devices'
	}),
	exportInstaller: (): TaskSpec => ({
		title: 'Export installer',
		args: ['export', 'installer'],
		changes: 'nothing'
	}),
	exportUpdate: (): TaskSpec => ({
		title: 'Export update',
		args: ['export', 'update'],
		changes: 'nothing'
	})
};

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
	computer: ['doctor']
};
