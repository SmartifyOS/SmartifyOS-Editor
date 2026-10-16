import { type BrowserWindow, systemPreferences } from 'electron';
import { macos } from '../native/macos.ts';
import { type Embedder, handleFromBuffer, type Placement } from './embedder.ts';

/**
 * macOS has no way for one program to take in another's window, so the app keeps its own
 * window and the editor lays it over the viewport: moved and sized with it, kept directly in
 * front of the editor, and hidden when the viewport is.
 *
 * Keeping it in front works from our side: AppKit lets an app order its own window relative
 * to any other window, so the editor puts itself directly behind the app's window whenever
 * something else got in between (the editor being clicked, most of all).
 *
 * Moving another program's window needs the Accessibility permission, asked for once.
 */
export class MacEmbedder implements Embedder {
	readonly mode = 'overlay' as const;
	private window: bigint | undefined;
	/** The app window's window server number. */
	private number: number | undefined;
	private pid: number | undefined;
	private readonly host: { window: bigint; number: number };
	private visible = true;
	private last: Placement['screen'] | undefined;
	private asked = false;

	constructor(host: BrowserWindow) {
		this.host = macos().ownWindow(handleFromBuffer(host.getNativeWindowHandle()));
	}

	blocker(): { message: string; hint: string } | undefined {
		if (systemPreferences.isTrustedAccessibilityClient(false)) return undefined;
		if (!this.asked) {
			this.asked = true;
			// Shows the system's own dialog, which leads to the right place in System Settings.
			systemPreferences.isTrustedAccessibilityClient(true);
		}
		return {
			message: 'Showing it inside the editor needs one permission.',
			hint: 'Allow SmartifyOS Editor in System Settings, Privacy & Security, Accessibility. It moves in by itself once allowed.'
		};
	}

	attach(pids: number[]): boolean {
		const api = macos();
		for (const pid of pids) {
			const windows = api.windowsOf(pid);
			if (windows.length === 0) continue;
			const chosen =
				windows.find((window) => api.subrole(window) === 'AXStandardWindow') ?? windows[0];
			for (const window of windows) if (window !== chosen) api.release(window);
			this.window = chosen;
			this.number = chosen === undefined ? undefined : api.windowNumber(chosen);
			this.pid = pid;
			if (this.last) this.place({ screen: this.last, client: this.last });
			this.setVisible(this.visible);
			return true;
		}
		return false;
	}

	alive(): boolean {
		return this.window !== undefined && macos().exists(this.window);
	}

	place(placement: Placement): void {
		this.last = placement.screen;
		if (!this.window || !this.visible) return;
		const { x, y, width, height } = placement.screen;
		macos().setFrame(this.window, x, y, width, height);
	}

	setVisible(visible: boolean): void {
		const changed = visible !== this.visible;
		this.visible = visible;
		if (!this.window || this.pid === undefined) return;
		if (changed || !visible) macos().setAppHidden(this.pid, !visible);
		if (visible) {
			if (this.last) this.place({ screen: this.last, client: this.last });
			this.raise();
		}
	}

	raise(): void {
		if (!this.window || this.number === undefined || !this.visible) return;
		const api = macos();
		// Nothing to do while it already is directly in front of the editor.
		if (api.windowsAbove(this.host.number).at(-1) === this.number) return;
		api.raise(this.window);
		api.orderBelow(this.host.window, this.number);
	}

	detach(): void {
		if (this.window) macos().release(this.window);
		this.window = undefined;
		this.number = undefined;
		this.pid = undefined;
	}
}
