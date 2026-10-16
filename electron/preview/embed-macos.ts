import { type BrowserWindow, systemPreferences } from 'electron';
import { macos } from '../native/macos.ts';
import type { Embedder, Placement } from './embedder.ts';

/**
 * macOS has no way for one program to take in another's window, so the app keeps its own
 * window and the editor lays it over the viewport: moved and sized with it, raised whenever
 * the editor comes to the front, and hidden when the viewport is.
 *
 * Moving another program's window needs the Accessibility permission, asked for once.
 */
export class MacEmbedder implements Embedder {
	readonly mode = 'overlay' as const;
	private window: bigint | undefined;
	private pid: number | undefined;
	private visible = true;
	private last: Placement['screen'] | undefined;
	private asked = false;

	constructor(_host: BrowserWindow) {
		macos();
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
			hint: 'Allow SmartifyOS in System Settings, Privacy & Security, Accessibility. It moves in by itself once allowed.'
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
		if (this.window && this.visible) macos().raise(this.window);
	}

	detach(): void {
		if (this.window) macos().release(this.window);
		this.window = undefined;
		this.pid = undefined;
	}
}
