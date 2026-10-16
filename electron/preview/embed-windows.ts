import type { BrowserWindow } from 'electron';
import {
	GWL_EXSTYLE,
	GWL_STYLE,
	HWND_TOP,
	SW_HIDE,
	SW_SHOW,
	SWP_FRAMECHANGED,
	SWP_NOACTIVATE,
	SWP_SHOWWINDOW,
	WS_CAPTION,
	WS_CHILD,
	WS_CLIPSIBLINGS,
	WS_EX_APPWINDOW,
	WS_EX_DLGMODALFRAME,
	WS_EX_WINDOWEDGE,
	WS_MAXIMIZEBOX,
	WS_MINIMIZEBOX,
	WS_POPUP,
	WS_SYSMENU,
	WS_THICKFRAME,
	win32
} from '../native/win32.ts';
import { type Embedder, handleFromBuffer, type Placement } from './embedder.ts';

/** The window class of the top level window in every Flutter Windows runner. */
const flutterRunnerClass = 'FLUTTER_RUNNER_WIN32_WINDOW';

/** Makes the app's window a child of the editor's, with its frame taken off. */
export class WindowsEmbedder implements Embedder {
	readonly mode = 'embedded' as const;
	private readonly parent: number;
	private hwnd = 0;
	private visible = true;
	private last: Placement['client'] | undefined;

	constructor(host: BrowserWindow) {
		this.parent = Number(handleFromBuffer(host.getNativeWindowHandle()));
	}

	blocker(): undefined {
		return undefined;
	}

	attach(pids: number[]): boolean {
		const api = win32();
		const wanted = new Set(pids);
		const candidates = api
			.topLevelWindows()
			.filter((window) => wanted.has(window.pid) && window.visible);
		const window =
			candidates.find((candidate) => candidate.className === flutterRunnerClass) ?? candidates[0];
		if (!window) return false;

		const hwnd = window.hwnd;
		const style = api.getStyle(hwnd, GWL_STYLE);
		const frame =
			WS_POPUP | WS_CAPTION | WS_THICKFRAME | WS_SYSMENU | WS_MINIMIZEBOX | WS_MAXIMIZEBOX;
		api.setStyle(hwnd, GWL_STYLE, ((style & ~frame) | WS_CHILD | WS_CLIPSIBLINGS) >>> 0);
		const exStyle = api.getStyle(hwnd, GWL_EXSTYLE);
		api.setStyle(
			hwnd,
			GWL_EXSTYLE,
			(exStyle & ~(WS_EX_APPWINDOW | WS_EX_WINDOWEDGE | WS_EX_DLGMODALFRAME)) >>> 0
		);
		api.setParent(hwnd, this.parent);
		this.hwnd = hwnd;
		if (this.last) this.apply(this.last, SWP_FRAMECHANGED);
		return true;
	}

	alive(): boolean {
		return this.hwnd !== 0 && win32().isWindow(this.hwnd);
	}

	place(placement: Placement): void {
		this.last = placement.client;
		if (this.hwnd) this.apply(placement.client, 0);
	}

	private apply(rect: Placement['client'], extraFlags: number): void {
		win32().setWindowPos(
			this.hwnd,
			HWND_TOP,
			rect.x,
			rect.y,
			Math.max(1, rect.width),
			Math.max(1, rect.height),
			SWP_NOACTIVATE | extraFlags | (this.visible ? SWP_SHOWWINDOW : 0)
		);
	}

	setVisible(visible: boolean): void {
		this.visible = visible;
		if (this.hwnd) win32().showWindow(this.hwnd, visible ? SW_SHOW : SW_HIDE);
	}

	raise(): void {
		// A child window moves with its parent, nothing to do.
	}

	detach(): void {
		this.hwnd = 0;
	}
}
