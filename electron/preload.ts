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
		onEvent: (listener) => subscribe(channels.cliEvent, listener)
	},
	projects: {
		recent: () => ipcRenderer.invoke(channels.projectsRecent),
		current: () => ipcRenderer.invoke(channels.projectsCurrent),
		open: (path) => ipcRenderer.invoke(channels.projectsOpen, path),
		refresh: () => ipcRenderer.invoke(channels.projectsRefresh),
		forget: (path) => ipcRenderer.invoke(channels.projectsForget, path),
		close: () => ipcRenderer.invoke(channels.projectsClose),
		reveal: (path) => ipcRenderer.send(channels.projectsReveal, path)
	},
	preview: {
		start: () => ipcRenderer.invoke(channels.previewStart),
		stop: () => ipcRenderer.invoke(channels.previewStop),
		reload: () => ipcRenderer.send(channels.previewReload),
		restart: () => ipcRenderer.send(channels.previewRestart),
		setViewport: (rect) => ipcRenderer.send(channels.previewViewport, rect),
		state: () => ipcRenderer.invoke(channels.previewState),
		onState: (listener) => subscribe(channels.previewStateChanged, listener)
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
