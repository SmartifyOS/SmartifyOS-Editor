import koffi from 'koffi';

/**
 * The Accessibility API calls the editor needs on macOS to move, size, raise and hide the
 * app's window from the outside, which is the only way one program can place another's.
 * Loaded only on macOS, and only the first time it is used.
 *
 * Every Core Foundation object here is a pointer (a BigInt). Whatever a Copy or Create call
 * returns is released by whoever holds it, see {@link AxElement}.
 */

const kCFStringEncodingUTF8 = 0x08000100;
const kAXValueCGPointType = 1;
const kAXValueCGSizeType = 2;
export const kAXErrorSuccess = 0;
export const kAXErrorInvalidUIElement = -25202;
export const kAXErrorAPIDisabled = -25211;
const kCGWindowListOptionOnScreenAboveWindow = 1 << 1;
const NSWindowBelow = -1;

type Ref = bigint;

function load() {
	const cf = koffi.load('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation');
	const ax = koffi.load(
		'/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices'
	);

	const CGPoint = koffi.struct('CGPoint', { x: 'double', y: 'double' });
	const CGSize = koffi.struct('CGSize', { width: 'double', height: 'double' });

	const CFStringCreateWithCString = cf.func(
		'void *CFStringCreateWithCString(void *alloc, const char *cStr, uint32_t encoding)'
	);
	const CFStringGetCString = cf.func(
		'bool CFStringGetCString(void *string, _Out_ char *buffer, long size, uint32_t encoding)'
	);
	const CFArrayGetCount = cf.func('long CFArrayGetCount(void *array)');
	const CFArrayGetValueAtIndex = cf.func('void *CFArrayGetValueAtIndex(void *array, long index)');
	const CFRetain = cf.func('void *CFRetain(void *cf)');
	const CFRelease = cf.func('void CFRelease(void *cf)');
	const booleanTrue = koffi.decode(cf.symbol('kCFBooleanTrue'), 'void *') as Ref;
	const booleanFalse = koffi.decode(cf.symbol('kCFBooleanFalse'), 'void *') as Ref;

	const AXIsProcessTrusted = ax.func('bool AXIsProcessTrusted()');
	const AXUIElementCreateApplication = ax.func('void *AXUIElementCreateApplication(int pid)');
	const AXUIElementCopyAttributeValue = ax.func(
		'int AXUIElementCopyAttributeValue(void *element, void *attribute, _Out_ void **value)'
	);
	const AXUIElementSetAttributeValue = ax.func(
		'int AXUIElementSetAttributeValue(void *element, void *attribute, void *value)'
	);
	const AXUIElementPerformAction = ax.func(
		'int AXUIElementPerformAction(void *element, void *action)'
	);
	const AXValueCreatePoint = ax.func('void *AXValueCreate(int type, CGPoint *value)');
	const AXValueCreateSize = ax.func('void *AXValueCreate(int type, CGSize *value)');
	// Private, but what every window manager for macOS uses to match an AX window to its
	// window server number, and unchanged for over a decade.
	const AXUIElementGetWindow = ax.func(
		'int _AXUIElementGetWindow(void *element, _Out_ uint32_t *windowId)'
	);

	const cg = koffi.load('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics');
	const CGWindowListCreate = cg.func(
		'void *CGWindowListCreate(uint32_t option, uint32_t relativeTo)'
	);

	// Our own window is ordered with AppKit, which takes Objective-C messages.
	const objc = koffi.load('/usr/lib/libobjc.A.dylib');
	const sel = objc.func('void *sel_registerName(const char *name)');
	const sendPointer = objc.func('void *objc_msgSend(void *self, void *op)');
	const sendLong = objc.func('long objc_msgSend(void *self, void *op)');
	const sendOrder = objc.func(
		'void objc_msgSend(void *self, void *op, long place, long relativeTo)'
	);
	const selectors = {
		window: sel('window'),
		windowNumber: sel('windowNumber'),
		orderWindow: sel('orderWindow:relativeTo:')
	};

	/** Internal: CFStrings for the attribute names, made once and kept. */
	const names = new Map<string, Ref>();
	function name(text: string): Ref {
		let ref = names.get(text);
		if (!ref) {
			ref = CFStringCreateWithCString(null, text, kCFStringEncodingUTF8) as Ref;
			names.set(text, ref);
		}
		return ref;
	}

	function copy(element: Ref, attribute: string): { error: number; value: Ref | null } {
		const out: [Ref | null] = [null];
		const error = AXUIElementCopyAttributeValue(element, name(attribute), out) as number;
		return { error, value: error === kAXErrorSuccess ? out[0] : null };
	}

	function stringOf(ref: Ref): string {
		const buffer = ['\0'.repeat(256)];
		if (!CFStringGetCString(ref, buffer, 256, kCFStringEncodingUTF8)) return '';
		return (buffer[0] ?? '').replace(/\0.*$/s, '');
	}

	return {
		trusted: () => AXIsProcessTrusted() as boolean,

		/** The windows of a process, each retained: release them with `release`. */
		windowsOf(pid: number): Ref[] {
			const app = AXUIElementCreateApplication(pid) as Ref | null;
			if (!app) return [];
			try {
				const { value: list } = copy(app, 'AXWindows');
				if (!list) return [];
				try {
					const count = Number(CFArrayGetCount(list));
					const windows: Ref[] = [];
					for (let index = 0; index < count; index++) {
						windows.push(CFRetain(CFArrayGetValueAtIndex(list, index)) as Ref);
					}
					return windows;
				} finally {
					CFRelease(list);
				}
			} finally {
				CFRelease(app);
			}
		},

		subrole(element: Ref): string {
			const { value } = copy(element, 'AXSubrole');
			if (!value) return '';
			try {
				return stringOf(value);
			} finally {
				CFRelease(value);
			}
		},

		/** Whether the element still exists, by asking for its role. */
		exists(element: Ref): boolean {
			const { error, value } = copy(element, 'AXRole');
			if (value) CFRelease(value);
			return error !== kAXErrorInvalidUIElement && error !== kAXErrorAPIDisabled;
		},

		setFrame(element: Ref, x: number, y: number, width: number, height: number): number {
			const position = AXValueCreatePoint(kAXValueCGPointType, { x, y }) as Ref;
			const size = AXValueCreateSize(kAXValueCGSizeType, { width, height }) as Ref;
			try {
				// Size before and after: a window can not always move where its old size would
				// reach off the screen, and can not always grow before it has moved.
				AXUIElementSetAttributeValue(element, name('AXSize'), size);
				const error = AXUIElementSetAttributeValue(element, name('AXPosition'), position) as number;
				AXUIElementSetAttributeValue(element, name('AXSize'), size);
				return error;
			} finally {
				CFRelease(position);
				CFRelease(size);
			}
		},

		/** Brings a window to the front without making its app the active one. */
		raise(element: Ref): number {
			return AXUIElementPerformAction(element, name('AXRaise')) as number;
		},

		/** Hides or shows a whole app, the same as Cmd+H. */
		setAppHidden(pid: number, hidden: boolean): void {
			const app = AXUIElementCreateApplication(pid) as Ref | null;
			if (!app) return;
			try {
				AXUIElementSetAttributeValue(app, name('AXHidden'), hidden ? booleanTrue : booleanFalse);
			} finally {
				CFRelease(app);
			}
		},

		/** The window server's number for an AX window, which other windows are ordered by. */
		windowNumber(element: Ref): number | undefined {
			const id = [0];
			return AXUIElementGetWindow(element, id) === kAXErrorSuccess ? (id[0] as number) : undefined;
		},

		/** The NSWindow of one of our own windows, from Electron's handle (its NSView). */
		ownWindow(view: Ref): { window: Ref; number: number } {
			const window = sendPointer(view, selectors.window) as Ref;
			return { window, number: Number(sendLong(window, selectors.windowNumber)) };
		},

		/**
		 * The windows on screen in front of `number`, front to back. Only numbers: reading
		 * them needs no permission.
		 */
		windowsAbove(number: number): number[] {
			const list = CGWindowListCreate(kCGWindowListOptionOnScreenAboveWindow, number) as Ref | null;
			if (!list) return [];
			try {
				const count = Number(CFArrayGetCount(list));
				const ids: number[] = [];
				// The array holds the numbers themselves where an array would hold pointers.
				for (let index = 0; index < count; index++) {
					ids.push(Number(CFArrayGetValueAtIndex(list, index) as Ref));
				}
				return ids;
			} finally {
				CFRelease(list);
			}
		},

		/** Puts one of our own windows directly behind another window, of any app. */
		orderBelow(ownWindow: Ref, number: number): void {
			sendOrder(ownWindow, selectors.orderWindow, NSWindowBelow, number);
		},

		release(ref: Ref): void {
			CFRelease(ref);
		}
	};
}

let loaded: ReturnType<typeof load> | undefined;

export function macos(): ReturnType<typeof load> {
	loaded ??= load();
	return loaded;
}
