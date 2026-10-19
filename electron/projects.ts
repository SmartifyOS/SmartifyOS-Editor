import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { type BrowserWindow, dialog } from 'electron';
import type { OpenResult, Project, RecentProject } from '../shared/api.ts';
import type { CanDeviceDefinition, CarInfo, DeviceInfo, DeviceList } from '../shared/cli.ts';
import { cliEnv } from './cli/environment.ts';
import { runCli } from './cli/job.ts';
import { cliStatus } from './cli/locate.ts';
import { settings } from './settings.ts';
import { read, update } from './store.ts';

/**
 * The car project that is open, and the ones opened before. Whether a folder is a car's app
 * is the CLI's call: a project is opened by asking it what the car runs.
 */

const maxRecent = 12;

let current: Project | undefined;

export function currentProject(): Project | undefined {
	return current;
}

export function recentProjects(): RecentProject[] {
	return read().recentProjects.map((project) => ({
		...project,
		exists: existsSync(join(project.path, 'pubspec.yaml'))
	}));
}

export function forgetProject(path: string): RecentProject[] {
	update((stored) => {
		stored.recentProjects = stored.recentProjects.filter((project) => project.path !== path);
	});
	return recentProjects();
}

export function forgetAllProjects(): RecentProject[] {
	update((stored) => {
		stored.recentProjects = [];
	});
	return [];
}

/**
 * The folder picked in the settings, or else next to the car opened last, or in Documents
 * for the first one.
 */
export function newProjectLocation(): string {
	const picked = settings().newCarFolder;
	if (picked && existsSync(picked)) return picked;
	const last = recentProjects().find((project) => project.exists);
	if (last) return dirname(last.path);
	const documents = join(homedir(), 'Documents');
	return existsSync(documents) ? documents : homedir();
}

export function closeProject(): void {
	current = undefined;
}

/** Internal: the name in pubspec.yaml, or the folder's when there is none. */
function projectName(dir: string): string {
	try {
		const pubspec = readFileSync(join(dir, 'pubspec.yaml'), 'utf8');
		const name = /^name:\s*['"]?([^\s'"]+)/m.exec(pubspec)?.[1];
		if (name) return name;
	} catch {
		// The folder's name will do.
	}
	return basename(dir);
}

export async function openProject(host: BrowserWindow, path?: string): Promise<OpenResult> {
	let dir = path;
	if (!dir) {
		const picked = await dialog.showOpenDialog(host, {
			title: "Open your car's app",
			buttonLabel: 'Open',
			properties: ['openDirectory']
		});
		if (picked.canceled || !picked.filePaths[0]) return { ok: false, cancelled: true };
		dir = picked.filePaths[0];
	}
	dir = resolve(dir);

	if (!existsSync(dir)) {
		return {
			ok: false,
			cancelled: false,
			message: `${dir} is not there anymore.`,
			hint: 'It may be on a drive that is not plugged in, or it was moved.'
		};
	}

	const result = await readCar(dir);
	if (!result.ok) return result;

	current = {
		path: dir,
		name: projectName(dir),
		car: result.car,
		devices: result.devices,
		canDevices: result.canDevices
	};
	update((stored) => {
		stored.recentProjects = [
			{ path: dir, name: current?.name ?? basename(dir), openedAt: new Date().toISOString() },
			...stored.recentProjects.filter((project) => project.path !== dir)
		].slice(0, maxRecent);
	});
	return { ok: true, project: current };
}

/** Reads the open project again, after something may have changed it. */
export async function refreshProject(): Promise<OpenResult> {
	if (!current) return { ok: false, cancelled: false, message: 'No project is open.' };
	const result = await readCar(current.path);
	if (!result.ok) return result;
	current = {
		...current,
		car: result.car,
		devices: result.devices,
		canDevices: result.canDevices
	};
	return { ok: true, project: current };
}

/** Internal: asks the CLI what the car in this folder runs, and which devices it has. */
async function readCar(
	dir: string
): Promise<
	| { ok: true; car: CarInfo; devices: DeviceInfo[]; canDevices: CanDeviceDefinition[] }
	| Extract<OpenResult, { ok: false }>
> {
	const cli = await cliStatus();
	if (!cli.found) {
		return {
			ok: false,
			cancelled: false,
			message: cli.reason,
			hint: 'Install the SmartifyOS CLI first.'
		};
	}
	const options = { cwd: dir, env: await cliEnv() };
	const [car, devices] = await Promise.all([
		runCli(cli.path, ['extension', 'list'], options),
		runCli(cli.path, ['device', 'list'], options)
	]);
	if (!car.ok) {
		return { ok: false, cancelled: false, message: car.error.message, hint: car.error.hint };
	}
	return {
		ok: true,
		car: car.data as CarInfo,
		// A CLI from before `device list` knows of none, which leaves the panel empty.
		devices: devices.ok ? (devices.data as DeviceList).devices : [],
		canDevices: (devices.ok && (devices.data as DeviceList).defined) || []
	};
}
