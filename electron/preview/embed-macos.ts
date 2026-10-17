import { type BrowserWindow, systemPreferences } from 'electron';
import { macos } from '../native/macos.ts';
import { type Embedder, handleFromBuffer, type Placement } from './embedder.ts';

/**
 * macOS has no way for one program to take in another's window, so the app keeps its own
 * window and the editor lays it over the viewport: moved and sized with it, kept directly in
 * front of the editor, and hidden when the viewport is.
 *
 * Keeping it in front is the app's own job where it can: SmartifyOS core floats its window
 * above every normal one while the editor or the app is in front, and puts it back directly
 * above the editor's window otherwise, so clicking the editor never covers it. It learns who
 * the editor is from {@link appEnv}.
 *
 * For an app on an older core the editor does it from its side: AppKit lets an app order its
 * own window relative to any other window, so the editor puts itself directly behind the app's
 * window whenever something else got in between (the editor being clicked, most of all).
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
	/** Where the window was last put, so only what changed is sent (every call waits on the app). */
	private applied: Placement['screen'] | undefined;
	/** Where {@link recheck} last found the window. */
	private seen: { x: number; y: number } | undefined;
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

	appEnv(): Record<string, string> {
		return {
			SMARTIFY_OS_EDITOR_PID: String(process.pid),
			SMARTIFY_OS_EDITOR_WINDOW: String(this.host.number)
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
			this.applied = undefined;
			this.seen = undefined;
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
		const frame = placement.screen;
		const before = this.applied;
		const moved = before?.x !== frame.x || before.y !== frame.y;
		const resized = before?.width !== frame.width || before.height !== frame.height;
		if (!moved && !resized) return;
		const api = macos();
		// Size before and after moving: a window can not always move where its old size would
		// reach off the screen, and can not always grow before it has moved.
		if (resized) api.setSize(this.window, frame.width, frame.height);
		if (moved) api.setPosition(this.window, frame.x, frame.y);
		if (moved && resized) api.setSize(this.window, frame.width, frame.height);
		this.applied = frame;
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
		// Floating, so the app keeps itself in front (see above).
		if (api.layerOf(this.number) > 0) return;
		// Nothing to do while it already is directly in front of the editor.
		if (api.windowsAbove(this.host.number).at(-1) === this.number) return;
		// A click into the editor puts it in front of the app's window, which is then directly
		// behind it. Swapping the two back is one call to the window server, much quicker than
		// raising the app's window, which waits on the app. Only needed when something else
		// came in between.
		if (api.windowsBelow(this.host.number)[0] !== this.number) api.raise(this.window);
		api.orderBelow(this.host.window, this.number);
	}

	recheck(): void {
		if (!this.window || this.number === undefined || !this.visible || !this.last) return;
		const frame = macos().frameOf(this.number);
		const put = this.applied;
		if (!frame || !put) return;
		const near = (a: { x: number; y: number }, b: { x: number; y: number }) =>
			Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;
		// Core keeps the window from being dragged, but macOS has other ways to move one (like
		// Ctrl and Cmd while dragging). Only the position: an app may not go to every size. And
		// only once it moved, since macOS does not let a window go everywhere (above the menu
		// bar, for one) and would be asked again and again.
		const away = !near(frame, put) && !(this.seen && near(frame, this.seen));
		this.seen = frame;
		if (away) {
			this.applied = undefined;
			this.place({ screen: this.last, client: this.last });
		}
	}

	detach(): void {
		if (this.window) macos().release(this.window);
		this.window = undefined;
		this.number = undefined;
		this.pid = undefined;
		this.applied = undefined;
		this.seen = undefined;
	}
}
