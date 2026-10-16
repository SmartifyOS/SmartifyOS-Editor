import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { app } from 'electron';
import type { VsCodeResult } from '../shared/api.ts';
import { fullPath } from './cli/environment.ts';

/**
 * Opening the car's app, or a device's program, in VS Code.
 *
 * Its `code` command is only on PATH when someone put it there, which the installers on
 * macOS and Windows do not do. So VS Code is looked for where it installs itself first,
 * then on PATH, then by asking the system which app opens `vscode://` links, which finds it
 * wherever it was put.
 */

/** Where VS Code installs itself, on each system. The first that is there is used. */
function knownPlaces(): string[] {
	const home = homedir();
	if (process.platform === 'darwin') {
		return ['/Applications', join(home, 'Applications')].map((dir) =>
			macCommand(join(dir, 'Visual Studio Code.app'))
		);
	}
	if (process.platform === 'win32') {
		return [
			// The installer for one user, which is the one the download page offers first.
			process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs', 'Microsoft VS Code'),
			process.env.ProgramFiles && join(process.env.ProgramFiles, 'Microsoft VS Code'),
			process.env['ProgramFiles(x86)'] &&
				join(process.env['ProgramFiles(x86)'], 'Microsoft VS Code')
		]
			.filter((dir): dir is string => Boolean(dir))
			.map((dir) => join(dir, 'Code.exe'));
	}
	return [
		'/usr/bin/code',
		'/usr/share/code/bin/code',
		'/snap/bin/code',
		join(home, '.local', 'share', 'flatpak', 'exports', 'bin', 'com.visualstudio.code'),
		'/var/lib/flatpak/exports/bin/com.visualstudio.code'
	];
}

/** Internal: the `code` command inside the macOS app, the one "Install 'code' in PATH" links. */
function macCommand(bundle: string): string {
	return join(bundle, 'Contents', 'Resources', 'app', 'bin', 'code');
}

/** Internal: `code` on PATH. On Windows that is `bin\code.cmd`, next to which is Code.exe. */
async function onPath(): Promise<string | undefined> {
	const name = process.platform === 'win32' ? 'code.cmd' : 'code';
	for (const dir of (await fullPath()).split(delimiter)) {
		const found = join(dir, name);
		if (!existsSync(found)) continue;
		if (process.platform !== 'win32') return found;
		const exe = join(dirname(dir), 'Code.exe');
		if (existsSync(exe)) return exe;
	}
	return undefined;
}

/** Internal: the app that opens `vscode://` links, on macOS and Windows. */
async function linkHandler(): Promise<string | undefined> {
	if (process.platform !== 'darwin' && process.platform !== 'win32') return undefined;
	try {
		const { path } = await app.getApplicationInfoForProtocol('vscode://');
		const found = process.platform === 'darwin' ? macCommand(path) : path;
		return existsSync(found) ? found : undefined;
	} catch {
		return undefined;
	}
}

/** What starts VS Code: its `code` command, or Code.exe on Windows. Undefined when it is not installed. */
export async function findVsCode(): Promise<string | undefined> {
	return knownPlaces().find((place) => existsSync(place)) ?? (await onPath()) ?? linkHandler();
}

/** Opens these folders and files in VS Code, in one window. */
export async function openInVsCode(paths: string[]): Promise<VsCodeResult> {
	const command = await findVsCode();
	if (!command) return { ok: false, missing: true };

	const env: NodeJS.ProcessEnv = { ...process.env, PATH: await fullPath() };
	// VS Code is an Electron app too, and this would start it as plain Node.
	delete env.ELECTRON_RUN_AS_NODE;
	return await new Promise((resolve) => {
		const child = spawn(command, paths, { detached: true, stdio: 'ignore', env });
		child.once('error', (error) =>
			resolve({
				ok: false,
				missing: false,
				message: `VS Code could not be started: ${error.message}`
			})
		);
		child.once('spawn', () => {
			child.unref();
			resolve({ ok: true });
		});
	});
}
