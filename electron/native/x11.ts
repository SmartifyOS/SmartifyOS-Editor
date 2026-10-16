import koffi from 'koffi';

/**
 * The few Xlib calls the editor needs to find the app's window and take it in. Loaded only
 * on Linux, and only the first time it is used. Windows and atoms are XIDs, passed as
 * numbers.
 */

const XA_CARDINAL = 6;
const XA_WINDOW = 33;
const Success = 0;

function load() {
	const lib = koffi.load('libX11.so.6');

	const ErrorHandler = koffi.proto('int XErrorHandler(void *display, void *event)');
	const XSetErrorHandler = lib.func('void *XSetErrorHandler(XErrorHandler *handler)');
	const XOpenDisplay = lib.func('void *XOpenDisplay(const char *name)');
	const XDefaultRootWindow = lib.func('unsigned long XDefaultRootWindow(void *display)');
	const XInternAtom = lib.func(
		'unsigned long XInternAtom(void *display, const char *name, int onlyIfExists)'
	);
	const XGetWindowProperty = lib.func(
		'int XGetWindowProperty(void *display, unsigned long w, unsigned long property, long offset, long length, int del, unsigned long reqType, _Out_ unsigned long *actualType, _Out_ int *actualFormat, _Out_ unsigned long *nitems, _Out_ unsigned long *bytesAfter, _Out_ void **prop)'
	);
	const XQueryTree = lib.func(
		'int XQueryTree(void *display, unsigned long w, _Out_ unsigned long *root, _Out_ unsigned long *parent, _Out_ void **children, _Out_ unsigned int *nchildren)'
	);
	const XFree = lib.func('int XFree(void *data)');
	const XReparentWindow = lib.func(
		'int XReparentWindow(void *display, unsigned long w, unsigned long parent, int x, int y)'
	);
	const XMoveResizeWindow = lib.func(
		'int XMoveResizeWindow(void *display, unsigned long w, int x, int y, unsigned int width, unsigned int height)'
	);
	const XMapWindow = lib.func('int XMapWindow(void *display, unsigned long w)');
	const XMapRaised = lib.func('int XMapRaised(void *display, unsigned long w)');
	const XUnmapWindow = lib.func('int XUnmapWindow(void *display, unsigned long w)');
	const XSync = lib.func('int XSync(void *display, int discard)');
	const XFlush = lib.func('int XFlush(void *display)');

	// Xlib's default error handler ends the whole process, and asking about a window that has
	// just closed is an error. Every call here checks its own result instead.
	const ignoreErrors = koffi.register(() => 0, koffi.pointer(ErrorHandler));
	XSetErrorHandler(ignoreErrors);

	const display = XOpenDisplay(null) as bigint | null;
	if (!display) throw new Error('Could not connect to the X server.');
	const root = Number(XDefaultRootWindow(display));
	const atoms = {
		clientList: Number(XInternAtom(display, '_NET_CLIENT_LIST', 0)),
		pid: Number(XInternAtom(display, '_NET_WM_PID', 0))
	};

	/** Internal: a property holding a list of 32 bit values (stored as C longs). */
	function longs(window: number, property: number, type: number): number[] {
		const actualType = [0];
		const format = [0];
		const count = [0];
		const after = [0];
		const data: [bigint | null] = [null];
		const status = XGetWindowProperty(
			display,
			window,
			property,
			0,
			4096,
			0,
			type,
			actualType,
			format,
			count,
			after,
			data
		);
		if (status !== Success || !data[0]) return [];
		try {
			if (format[0] !== 32 || !count[0]) return [];
			return (koffi.decode(data[0], 'unsigned long', count[0]) as (number | bigint)[]).map(Number);
		} finally {
			XFree(data[0]);
		}
	}

	return {
		/** Every window the window manager manages, with the process it says it belongs to. */
		clientWindows(): { window: number; pid: number | undefined }[] {
			return longs(root, atoms.clientList, XA_WINDOW).map((window) => ({
				window,
				pid: longs(window, atoms.pid, XA_CARDINAL)[0]
			}));
		},
		/** The parent of a window, or undefined when the window is gone. */
		parentOf(window: number): number | undefined {
			const rootOut = [0];
			const parent = [0];
			const children: [bigint | null] = [null];
			const count = [0];
			if (!XQueryTree(display, window, rootOut, parent, children, count)) return undefined;
			if (children[0]) XFree(children[0]);
			return Number(parent[0]);
		},
		reparent(window: number, parent: number, x: number, y: number): void {
			// Unmapped first, so the window manager lets go of it rather than fighting over it.
			XUnmapWindow(display, window);
			XSync(display, 0);
			XReparentWindow(display, window, parent, x, y);
			XMapRaised(display, window);
			XSync(display, 0);
		},
		moveResize(window: number, x: number, y: number, width: number, height: number): void {
			XMoveResizeWindow(display, window, x, y, Math.max(1, width), Math.max(1, height));
			XFlush(display);
		},
		setMapped(window: number, mapped: boolean): void {
			if (mapped) XMapWindow(display, window);
			else XUnmapWindow(display, window);
			XFlush(display);
		}
	};
}

let loaded: ReturnType<typeof load> | undefined;

export function x11(): ReturnType<typeof load> {
	loaded ??= load();
	return loaded;
}
