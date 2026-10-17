import type { BrowserWindow } from 'electron';
import type { PreviewMode } from '../../shared/api.ts';

/**
 * Puts the running app's window into the editor's viewport. One implementation per way of
 * doing it, picked by {@link createEmbedder}:
 *
 * - Windows: the app's window becomes a child window of the editor's (`SetParent`).
 * - Linux on X11: the same with `XReparentWindow`. On Wayland nothing may own another
 *   program's window, so both the editor and the app are run through XWayland.
 * - macOS: no program can take in another's window, so the app's window is laid over the
 *   viewport and moved, sized and raised along with the editor (Accessibility API).
 */

/** Where the app has to go, in the units the platform positions windows in. */
export interface Placement {
	/** Physical pixels relative to the editor's client area (Windows, X11). */
	client: { x: number; y: number; width: number; height: number };
	/** Points on screen, top left origin (macOS). */
	screen: { x: number; y: number; width: number; height: number };
}

export interface Embedder {
	readonly mode: PreviewMode;
	/**
	 * What keeps the window from being taken in right now and what the user can do about it,
	 * like a permission not given yet. Asked again on every try, so it can clear up.
	 */
	blocker(): { message: string; hint?: string } | undefined;
	/** What the app has to be started with to work with this, added to its environment. */
	appEnv(): Record<string, string>;
	/**
	 * Looks for the app's window among these processes and takes it in.
	 * @returns false while no window has turned up yet.
	 */
	attach(pids: number[]): boolean;
	/** Whether the window that was attached is still there. */
	alive(): boolean;
	place(placement: Placement): void;
	setVisible(visible: boolean): void;
	/** The editor came to the front (macOS: the app has to come along). */
	raise(): void;
	/** Asked every few hundred milliseconds: puts back whatever moved the window away. */
	recheck(): void;
	/** Lets go of the window, for example before the app is stopped. */
	detach(): void;
}

/** What failed when the platform's way could not be used, said to the user. */
export class EmbedUnavailable extends Error {
	constructor(
		message: string,
		readonly hint?: string
	) {
		super(message);
	}
}

export async function createEmbedder(host: BrowserWindow): Promise<Embedder> {
	if (process.platform === 'win32') {
		const { WindowsEmbedder } = await import('./embed-windows.ts');
		return new WindowsEmbedder(host);
	}
	if (process.platform === 'linux') {
		const { X11Embedder } = await import('./embed-x11.ts');
		return new X11Embedder(host);
	}
	if (process.platform === 'darwin') {
		const { MacEmbedder } = await import('./embed-macos.ts');
		return new MacEmbedder(host);
	}
	throw new EmbedUnavailable(`The live preview does not work on ${process.platform}.`);
}

/** Reads a native window handle out of the buffer Electron gives for it. */
export function handleFromBuffer(buffer: Buffer): bigint {
	return buffer.byteLength >= 8 ? buffer.readBigUInt64LE(0) : BigInt(buffer.readUInt32LE(0));
}
