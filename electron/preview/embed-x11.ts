import type { BrowserWindow } from 'electron';
import { x11 } from '../native/x11.ts';
import { type Embedder, EmbedUnavailable, handleFromBuffer, type Placement } from './embedder.ts';

/** Reparents the app's X11 window into the editor's. */
export class X11Embedder implements Embedder {
	readonly mode = 'embedded' as const;
	private readonly parent: number;
	private window = 0;
	private visible = true;
	private last: Placement['client'] | undefined;

	constructor(host: BrowserWindow) {
		if (!process.env.DISPLAY) {
			throw new EmbedUnavailable(
				'The live preview needs X11, and this desktop has no X server.',
				'Install XWayland, or log in to an X11 session.'
			);
		}
		this.parent = Number(handleFromBuffer(host.getNativeWindowHandle()));
		x11();
	}

	blocker(): undefined {
		return undefined;
	}

	appEnv(): Record<string, string> {
		// The editor runs through XWayland (see main.ts), and the app has to as well, since only
		// an X11 window can be taken into another X11 window.
		return { GDK_BACKEND: 'x11' };
	}

	attach(pids: number[]): boolean {
		const wanted = new Set(pids);
		const found = x11()
			.clientWindows()
			.find((client) => client.pid !== undefined && wanted.has(client.pid));
		if (!found) return false;
		this.window = found.window;
		const rect = this.last ?? { x: 0, y: 0, width: 1, height: 1 };
		x11().reparent(this.window, this.parent, rect.x, rect.y);
		if (this.last) this.place({ client: this.last, screen: this.last });
		if (!this.visible) x11().setMapped(this.window, false);
		return true;
	}

	alive(): boolean {
		return this.window !== 0 && x11().parentOf(this.window) !== undefined;
	}

	place(placement: Placement): void {
		this.last = placement.client;
		if (!this.window) return;
		const { x, y, width, height } = placement.client;
		// Some window managers take a window back when it maps again. Take it in once more.
		if (x11().parentOf(this.window) !== this.parent) {
			x11().reparent(this.window, this.parent, x, y);
		}
		x11().moveResize(this.window, x, y, width, height);
	}

	setVisible(visible: boolean): void {
		this.visible = visible;
		if (this.window) x11().setMapped(this.window, visible);
	}

	raise(): void {
		// A child window moves with its parent, nothing to do.
	}

	detach(): void {
		this.window = 0;
	}
}
