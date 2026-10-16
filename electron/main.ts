import { join, normalize, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, screen, shell } from 'electron';
import { channels, type Rect } from '../shared/api.ts';
import { cliEnv } from './cli/environment.ts';
import { CliJob } from './cli/job.ts';
import {
	clearConsole,
	consoleHistory,
	findJob,
	killAll,
	onConsoleLine,
	onJobEvent,
	track
} from './cli/jobs.ts';
import { cliStatus } from './cli/locate.ts';
import { PreviewSession } from './preview/session.ts';
import {
	closeProject,
	currentProject,
	forgetProject,
	newProjectLocation,
	openProject,
	recentProjects,
	refreshProject
} from './projects.ts';
import { read, update } from './store.ts';
import { Updates } from './updates.ts';

/**
 * The main process: one editor window, the IPC the window talks through (contract in
 * shared/api.ts), and the CLI jobs and live preview behind it.
 */

const devServer = process.env.DEV_SERVER_URL;
const rendererDir = join(__dirname, '..', 'renderer');
const isMac = process.platform === 'darwin';
/** The app icon, rounded for macOS (resources/, made by scripts/make-icons.py). */
const iconPath = join(app.getAppPath(), 'resources', isMac ? 'icon-macos.png' : 'icon.png');

// On Wayland no program may own another's window, which the live preview needs. Running the
// editor through XWayland (and the app too, see preview/session.ts) keeps it possible.
if (process.platform === 'linux') app.commandLine.appendSwitch('ozone-platform', 'x11');

protocol.registerSchemesAsPrivileged([
	{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

if (!app.requestSingleInstanceLock()) app.quit();

let window: BrowserWindow | undefined;
let preview: PreviewSession | undefined;
let updates: Updates | undefined;

/** Serves the built window from `app://editor/`, every unknown path as the single page. */
function serveRenderer(): void {
	protocol.handle('app', async (request) => {
		const path = decodeURIComponent(new URL(request.url).pathname);
		const file = normalize(join(rendererDir, path));
		const inside = file.startsWith(rendererDir + sep);
		const response = inside
			? await net.fetch(pathToFileURL(file).toString()).catch(() => undefined)
			: undefined;
		if (response?.ok) return response;
		return net.fetch(pathToFileURL(join(rendererDir, 'index.html')).toString());
	});
}

function createWindow(): BrowserWindow {
	const saved = read().window;
	const visible =
		saved?.x !== undefined && saved.y !== undefined
			? screen.getAllDisplays().some((display) => {
					const area = display.workArea;
					return (
						(saved.x as number) < area.x + area.width - 100 &&
						(saved.y as number) < area.y + area.height - 100 &&
						(saved.x as number) + saved.width > area.x + 100 &&
						(saved.y as number) > area.y - 20
					);
				})
			: false;

	const win = new BrowserWindow({
		width: saved?.width ?? 1440,
		height: saved?.height ?? 900,
		...(visible ? { x: saved?.x, y: saved?.y } : {}),
		minWidth: 960,
		minHeight: 600,
		show: false,
		title: 'SmartifyOS Editor',
		backgroundColor: '#0a0a0a',
		icon: iconPath,
		titleBarStyle: 'hidden',
		// macOS draws its window buttons in the middle of a 16pt tall frame, so y 16 puts them
		// at 24, the middle of the title bar's 48px (TitleBar.svelte) above its border.
		...(isMac
			? { trafficLightPosition: { x: 18, y: 16 } }
			: { titleBarOverlay: { color: '#0a0a0a', symbolColor: '#a1a1aa', height: 48 } }),
		webPreferences: {
			preload: join(__dirname, 'preload.cjs'),
			contextIsolation: true,
			sandbox: true,
			nodeIntegration: false
		}
	});
	// Filling the screen the first time (not full screen), as it was left after that.
	if (!saved || saved.maximized) win.maximize();
	win.once('ready-to-show', () => win.show());

	// Links open in the browser, and the window never navigates away from the editor.
	win.webContents.setWindowOpenHandler(({ url }) => {
		if (/^https?:/.test(url)) void shell.openExternal(url);
		return { action: 'deny' };
	});
	win.webContents.on('will-navigate', (event, url) => {
		const own = devServer ? url.startsWith(devServer) : url.startsWith('app://');
		if (!own) event.preventDefault();
	});

	win.on('close', () => {
		const bounds = win.getNormalBounds();
		update((stored) => {
			stored.window = { ...bounds, maximized: win.isMaximized() };
		});
	});

	if (devServer) void win.loadURL(devServer);
	else void win.loadURL('app://editor/');
	return win;
}

/** Internal: sends to the window, if there still is one. */
function send(channel: string, payload: unknown): void {
	if (window && !window.isDestroyed()) window.webContents.send(channel, payload);
}

function registerIpc(): void {
	ipcMain.on(channels.windowMinimize, () => window?.minimize());
	ipcMain.on(channels.windowToggleMaximize, () => {
		if (!window) return;
		if (window.isMaximized()) window.unmaximize();
		else window.maximize();
	});
	ipcMain.on(channels.windowClose, () => window?.close());

	ipcMain.handle(channels.cliStatus, () => cliStatus(true));
	ipcMain.handle(channels.cliStart, async (_event, args: string[]) => {
		const cli = await cliStatus();
		if (!cli.found) throw new Error(cli.reason);
		const job = new CliJob(cli.path, args, {
			cwd: currentProject()?.path,
			env: await cliEnv(),
			interactive: true
		});
		track(job, 'cli');
		return job.id;
	});
	ipcMain.on(channels.cliAnswer, (_event, jobId: string, promptId: string, value: unknown) =>
		findJob(jobId)?.answer(promptId, value)
	);
	ipcMain.on(channels.cliCancel, (_event, jobId: string, promptId?: string) =>
		findJob(jobId)?.cancel(promptId)
	);
	onJobEvent((event) => send(channels.cliEvent, event));

	ipcMain.handle(channels.projectsRecent, () => recentProjects());
	ipcMain.handle(channels.projectsCurrent, () => currentProject());
	ipcMain.handle(channels.projectsOpen, async (_event, path?: string) => {
		if (!window) return { ok: false, cancelled: true };
		await preview?.stop();
		return openProject(window, path);
	});
	ipcMain.handle(channels.projectsRefresh, () => refreshProject());
	ipcMain.handle(channels.projectsForget, (_event, path: string) => forgetProject(path));
	ipcMain.handle(channels.projectsClose, async () => {
		await preview?.stop();
		closeProject();
	});
	ipcMain.on(channels.projectsReveal, (_event, path: string) => shell.showItemInFolder(path));
	ipcMain.handle(channels.projectsNewLocation, () => newProjectLocation());

	ipcMain.handle(channels.filesPickFolder, async (_event, title: string, defaultPath?: string) => {
		if (!window) return undefined;
		const picked = await dialog.showOpenDialog(window, {
			title,
			defaultPath,
			buttonLabel: 'Choose',
			properties: ['openDirectory', 'createDirectory']
		});
		return picked.canceled ? undefined : picked.filePaths[0];
	});
	ipcMain.handle(channels.filesPickFile, async (_event, title: string, extensions: string[]) => {
		if (!window) return undefined;
		const picked = await dialog.showOpenDialog(window, {
			title,
			buttonLabel: 'Choose',
			properties: ['openFile'],
			filters: [{ name: extensions.map((extension) => `.${extension}`).join(', '), extensions }]
		});
		return picked.canceled ? undefined : picked.filePaths[0];
	});

	ipcMain.handle(channels.previewStart, () => {
		const project = currentProject();
		if (project) void preview?.start(project.path);
	});
	ipcMain.handle(channels.previewStop, () => preview?.stop());
	ipcMain.on(channels.previewReload, () => preview?.reload());
	ipcMain.on(channels.previewRestart, () => preview?.restart());
	ipcMain.on(channels.previewViewport, (_event, rect: Rect | null) => preview?.setViewport(rect));
	ipcMain.handle(channels.previewState, () => preview?.state ?? { status: 'idle' });

	ipcMain.handle(channels.appVersion, () => app.getVersion());
	ipcMain.handle(channels.updatesState, () => updates?.state ?? { status: 'idle' });
	ipcMain.on(channels.updatesCheck, () => void updates?.check(true));
	ipcMain.on(channels.updatesRestart, () => updates?.restart());

	ipcMain.handle(channels.consoleHistory, () => consoleHistory());
	ipcMain.on(channels.consoleClear, () => clearConsole());
	onConsoleLine((line) => send(channels.consoleLine, line));
}

app.on('second-instance', () => {
	if (!window) return;
	if (window.isMinimized()) window.restore();
	window.focus();
});

/**
 * The menu. Electron's default one would reload the page on Ctrl+R and Cmd+R, which the
 * editor uses for hot reload. macOS needs the Edit menu for copy and paste to work at all,
 * the other systems have no menu bar (the title bar is the editor's own).
 */
function setMenu(): void {
	const devTools: Electron.MenuItemConstructorOptions[] = devServer
		? [{ role: 'toggleDevTools' }, { role: 'forceReload' }]
		: [];
	if (!isMac) {
		Menu.setApplicationMenu(
			devTools.length > 0 ? Menu.buildFromTemplate([{ label: 'Dev', submenu: devTools }]) : null
		);
		return;
	}
	Menu.setApplicationMenu(
		Menu.buildFromTemplate([
			{
				label: app.name,
				submenu: [
					{ role: 'about' },
					{ label: 'Check for Updates…', click: () => void updates?.check(true) },
					{ type: 'separator' },
					{ role: 'services' },
					{ type: 'separator' },
					{ role: 'hide' },
					{ role: 'hideOthers' },
					{ role: 'unhide' },
					{ type: 'separator' },
					{ role: 'quit' }
				]
			},
			{ role: 'editMenu' },
			{
				label: 'View',
				submenu: [
					{ role: 'resetZoom' },
					{ role: 'zoomIn' },
					{ role: 'zoomOut' },
					{ type: 'separator' },
					{ role: 'togglefullscreen' },
					...devTools
				]
			},
			{ role: 'windowMenu' }
		])
	);
}

app.whenReady().then(() => {
	updates = new Updates(
		(state) => send(channels.updatesStateChanged, state),
		() => {
			preview?.dispose();
			killAll();
		}
	);
	// A packaged app has its icon in the bundle, running from source shows Electron's.
	if (isMac && !app.isPackaged) app.dock?.setIcon(iconPath);
	setMenu();
	serveRenderer();
	registerIpc();
	window = createWindow();
	preview = new PreviewSession(window, (state) => send(channels.previewStateChanged, state));
	updates.start();
	window.on('closed', () => {
		preview?.dispose();
		preview = undefined;
		window = undefined;
	});
	// Found and asked for its version early, so the first command does not wait for it.
	void cliStatus();
});

app.on('before-quit', () => {
	preview?.dispose();
	killAll();
});

// One window is the whole editor, so closing it quits, on macOS too.
app.on('window-all-closed', () => app.quit());
