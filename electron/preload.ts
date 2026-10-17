import { contextBridge, type IpcRendererEvent, ipcRenderer } from 'electron';
import { channels, type Platform, type SmartifyApi } from '../shared/api.ts';

/**
 * Puts the editor's API on `window.smartify`. Everything goes through named channels, the
 * window never gets `ipcRenderer` itself.
 */

function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
	const handler = (_event: IpcRendererEvent, payload: T) => listener(payload);
	ipcRenderer.on(channel, handler);
	return () => ipcRenderer.off(channel, handler);
}

const api: SmartifyApi = {
	platform: process.platform as Platform,
	version: () => ipcRenderer.invoke(channels.appVersion),
	window: {
		minimize: () => ipcRenderer.send(channels.windowMinimize),
		toggleMaximize: () => ipcRenderer.send(channels.windowToggleMaximize),
		close: () => ipcRenderer.send(channels.windowClose)
	},
	cli: {
		status: () => ipcRenderer.invoke(channels.cliStatus),
		start: (args) => ipcRenderer.invoke(channels.cliStart, args),
		answer: (jobId, promptId, value) =>
			ipcRenderer.send(channels.cliAnswer, jobId, promptId, value),
		cancel: (jobId, promptId) => ipcRenderer.send(channels.cliCancel, jobId, promptId),
		onEvent: (listener) => subscribe(channels.cliEvent, listener),
		query: (args) => ipcRenderer.invoke(channels.cliQuery, args),
		install: () => ipcRenderer.invoke(channels.cliInstall)
	},
	projects: {
		recent: () => ipcRenderer.invoke(channels.projectsRecent),
		current: () => ipcRenderer.invoke(channels.projectsCurrent),
		open: (path) => ipcRenderer.invoke(channels.projectsOpen, path),
		refresh: () => ipcRenderer.invoke(channels.projectsRefresh),
		onFilesChanged: (listener) => subscribe(channels.projectsFilesChanged, listener),
		forget: (path) => ipcRenderer.invoke(channels.projectsForget, path),
		forgetAll: () => ipcRenderer.invoke(channels.projectsForgetAll),
		newLocation: () => ipcRenderer.invoke(channels.projectsNewLocation),
		close: () => ipcRenderer.invoke(channels.projectsClose),
		reveal: (path) => ipcRenderer.send(channels.projectsReveal, path)
	},
	files: {
		pickFolder: (title, defaultPath) =>
			ipcRenderer.invoke(channels.filesPickFolder, title, defaultPath),
		pickFile: (title, extensions) => ipcRenderer.invoke(channels.filesPickFile, title, extensions)
	},
	preview: {
		start: () => ipcRenderer.invoke(channels.previewStart),
		stop: () => ipcRenderer.invoke(channels.previewStop),
		reload: () => ipcRenderer.send(channels.previewReload),
		restart: () => ipcRenderer.invoke(channels.previewRestart),
		call: (name, params) => ipcRenderer.invoke(channels.previewCall, name, params),
		setViewport: (rect) => ipcRenderer.send(channels.previewViewport, rect),
		state: () => ipcRenderer.invoke(channels.previewState),
		onState: (listener) => subscribe(channels.previewStateChanged, listener)
	},
	settings: {
		get: () => ipcRenderer.invoke(channels.settingsGet),
		set: (change) => ipcRenderer.invoke(channels.settingsSet, change),
		onOpen: (listener) => subscribe(channels.settingsOpen, listener)
	},
	setup: {
		needed: () => ipcRenderer.invoke(channels.setupNeeded),
		done: () => ipcRenderer.send(channels.setupDone)
	},
	catalog: {
		extensions: () => ipcRenderer.invoke(channels.catalogExtensions)
	},
	vscode: {
		open: (folder, file, line) => ipcRenderer.invoke(channels.vscodeOpen, folder, file, line)
	},
	updates: {
		state: () => ipcRenderer.invoke(channels.updatesState),
		onState: (listener) => subscribe(channels.updatesStateChanged, listener),
		check: () => ipcRenderer.send(channels.updatesCheck),
		restart: () => ipcRenderer.send(channels.updatesRestart)
	},
	console: {
		history: () => ipcRenderer.invoke(channels.consoleHistory),
		clear: () => ipcRenderer.send(channels.consoleClear),
		onLine: (listener) => subscribe(channels.consoleLine, listener)
	}
};

contextBridge.exposeInMainWorld('smartify', api);
