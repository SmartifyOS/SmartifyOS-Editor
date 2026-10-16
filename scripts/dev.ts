import type { Subprocess } from 'bun';
import { dirname, join } from 'node:path';
import { context } from 'esbuild';
import { electronBuild } from './electron-build.ts';

/**
 * Runs the editor from source: Vite serves the window with hot reload, esbuild rebuilds the
 * main process and preload on every change, and Electron is restarted when they change.
 * Quitting the editor ends this too.
 */

const port = 5174;
const devServer = `http://localhost:${port}/`;

const vite = Bun.spawn(['bunx', 'vite', 'dev', '--port', String(port), '--strictPort'], {
	stdout: 'inherit',
	stderr: 'inherit'
});

async function waitForVite(): Promise<void> {
	for (let attempt = 0; attempt < 100; attempt++) {
		try {
			await fetch(devServer);
			return;
		} catch {
			await Bun.sleep(150);
		}
	}
	throw new Error('Vite did not start.');
}

/**
 * macOS names the app in the menu bar after its bundle, which from source is Electron's own.
 * Its signature does not cover Info.plist, so renaming it there keeps the signature, and with
 * it the Accessibility permission the preview needs.
 */
function nameElectronApp(): void {
	if (process.platform !== 'darwin') return;
	const electronPath = require('electron') as unknown as string;
	const plist = join(dirname(electronPath), '..', 'Info.plist');
	const name = (require('../package.json') as { productName: string }).productName;
	for (const key of ['CFBundleName', 'CFBundleDisplayName']) {
		Bun.spawnSync(['plutil', '-replace', key, '-string', name, plist]);
	}
}

nameElectronApp();

let electron: Subprocess | undefined;
let restarting = false;

function startElectron(): void {
	const electronPath = require('electron') as unknown as string;
	electron = Bun.spawn([electronPath, '.', ...process.argv.slice(2)], {
		stdout: 'inherit',
		stderr: 'inherit',
		env: { ...process.env, DEV_SERVER_URL: devServer }
	});
	const started = electron;
	void started.exited.then(() => {
		if (restarting || electron !== started) return;
		vite.kill();
		process.exit(0);
	});
}

async function restartElectron(): Promise<void> {
	if (!electron) return startElectron();
	restarting = true;
	electron.kill();
	await electron.exited;
	restarting = false;
	startElectron();
}

await waitForVite();

let firstBuild = true;
const builder = await context({
	...electronBuild,
	plugins: [
		{
			name: 'restart-electron',
			setup(build) {
				build.onEnd((result) => {
					if (result.errors.length > 0) return;
					if (firstBuild) {
						firstBuild = false;
						startElectron();
					} else {
						console.log('Main process changed, restarting Electron');
						void restartElectron();
					}
				});
			}
		}
	]
});
await builder.watch();

process.on('SIGINT', () => {
	electron?.kill();
	vite.kill();
	process.exit(0);
});
