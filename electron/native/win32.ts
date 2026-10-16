import koffi from 'koffi';

/**
 * The few Win32 calls the editor needs: listing processes, and finding a window and making
 * it a child of the editor's. Loaded only on Windows, and only the first time it is used.
 *
 * Handles are passed around as `intptr_t` numbers rather than pointers, which keeps them
 * comparable and lets a handle from Electron's `getNativeWindowHandle()` go straight in.
 */

export const GWL_STYLE = -16;
export const GWL_EXSTYLE = -20;
export const WS_CHILD = 0x40000000;
export const WS_POPUP = 0x80000000;
export const WS_CAPTION = 0x00c00000;
export const WS_THICKFRAME = 0x00040000;
export const WS_SYSMENU = 0x00080000;
export const WS_MINIMIZEBOX = 0x00020000;
export const WS_MAXIMIZEBOX = 0x00010000;
export const WS_CLIPSIBLINGS = 0x04000000;
export const WS_EX_APPWINDOW = 0x00040000;
export const WS_EX_WINDOWEDGE = 0x00000100;
export const WS_EX_DLGMODALFRAME = 0x00000001;
export const SWP_NOSIZE = 0x0001;
export const SWP_NOMOVE = 0x0002;
export const SWP_NOZORDER = 0x0004;
export const SWP_NOACTIVATE = 0x0010;
export const SWP_FRAMECHANGED = 0x0020;
export const SWP_SHOWWINDOW = 0x0040;
export const SWP_HIDEWINDOW = 0x0080;
export const HWND_TOP = 0;
export const SW_HIDE = 0;
export const SW_SHOW = 5;

const TH32CS_SNAPPROCESS = 0x2;
const INVALID_HANDLE_VALUE = -1;

function load() {
	const user32 = koffi.load('user32.dll');
	const kernel32 = koffi.load('kernel32.dll');

	const PROCESSENTRY32W = koffi.struct('PROCESSENTRY32W', {
		dwSize: 'uint32_t',
		cntUsage: 'uint32_t',
		th32ProcessID: 'uint32_t',
		th32DefaultHeapID: 'uintptr_t',
		th32ModuleID: 'uint32_t',
		cntThreads: 'uint32_t',
		th32ParentProcessID: 'uint32_t',
		pcPriClassBase: 'int32_t',
		dwFlags: 'uint32_t',
		szExeFile: koffi.array('char16_t', 260)
	});

	const CreateToolhelp32Snapshot = kernel32.func(
		'intptr_t __stdcall CreateToolhelp32Snapshot(uint32_t dwFlags, uint32_t th32ProcessID)'
	);
	const Process32FirstW = kernel32.func(
		'bool __stdcall Process32FirstW(intptr_t hSnapshot, _Inout_ PROCESSENTRY32W *lppe)'
	);
	const Process32NextW = kernel32.func(
		'bool __stdcall Process32NextW(intptr_t hSnapshot, _Inout_ PROCESSENTRY32W *lppe)'
	);
	const CloseHandle = kernel32.func('bool __stdcall CloseHandle(intptr_t hObject)');

	const FindWindowExW = user32.func(
		'intptr_t __stdcall FindWindowExW(intptr_t hWndParent, intptr_t hWndChildAfter, const char16_t *lpszClass, const char16_t *lpszWindow)'
	);
	const GetWindowThreadProcessId = user32.func(
		'uint32_t __stdcall GetWindowThreadProcessId(intptr_t hWnd, _Out_ uint32_t *lpdwProcessId)'
	);
	const GetClassNameW = user32.func(
		'int __stdcall GetClassNameW(intptr_t hWnd, _Out_ char16_t *lpClassName, int nMaxCount)'
	);
	const IsWindow = user32.func('bool __stdcall IsWindow(intptr_t hWnd)');
	const IsWindowVisible = user32.func('bool __stdcall IsWindowVisible(intptr_t hWnd)');
	const GetParent = user32.func('intptr_t __stdcall GetParent(intptr_t hWnd)');
	const GetWindowLongPtrW = user32.func(
		'intptr_t __stdcall GetWindowLongPtrW(intptr_t hWnd, int nIndex)'
	);
	const SetWindowLongPtrW = user32.func(
		'intptr_t __stdcall SetWindowLongPtrW(intptr_t hWnd, int nIndex, intptr_t dwNewLong)'
	);
	const SetParent = user32.func(
		'intptr_t __stdcall SetParent(intptr_t hWndChild, intptr_t hWndNewParent)'
	);
	const SetWindowPos = user32.func(
		'bool __stdcall SetWindowPos(intptr_t hWnd, intptr_t hWndInsertAfter, int X, int Y, int cx, int cy, uint32_t uFlags)'
	);
	const ShowWindow = user32.func('bool __stdcall ShowWindow(intptr_t hWnd, int nCmdShow)');

	return {
		listProcesses(): { pid: number; ppid: number }[] {
			const snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) as number;
			if (snapshot === INVALID_HANDLE_VALUE) return [];
			const entries: { pid: number; ppid: number }[] = [];
			try {
				const entry: Record<string, unknown> = { dwSize: koffi.sizeof(PROCESSENTRY32W) };
				let more = Process32FirstW(snapshot, entry) as boolean;
				while (more) {
					entries.push({
						pid: entry.th32ProcessID as number,
						ppid: entry.th32ParentProcessID as number
					});
					more = Process32NextW(snapshot, entry) as boolean;
				}
			} finally {
				CloseHandle(snapshot);
			}
			return entries;
		},

		/** Every top level window, with the process it belongs to and its class. */
		topLevelWindows(): { hwnd: number; pid: number; className: string; visible: boolean }[] {
			const windows: { hwnd: number; pid: number; className: string; visible: boolean }[] = [];
			let hwnd = 0;
			while (true) {
				hwnd = FindWindowExW(0, hwnd, null, null) as number;
				if (!hwnd) break;
				const pid = [0];
				if (!GetWindowThreadProcessId(hwnd, pid)) continue;
				const name = ['\0'.repeat(256)];
				const length = GetClassNameW(hwnd, name, 256) as number;
				windows.push({
					hwnd,
					pid: pid[0] as number,
					className: (name[0] ?? '').slice(0, length),
					visible: IsWindowVisible(hwnd) as boolean
				});
			}
			return windows;
		},

		isWindow: (hwnd: number) => IsWindow(hwnd) as boolean,
		getParent: (hwnd: number) => GetParent(hwnd) as number,
		/** A window style, as an unsigned 32 bit number. */
		getStyle: (hwnd: number, index: number) =>
			Number(BigInt.asUintN(32, BigInt(GetWindowLongPtrW(hwnd, index) as number))),
		setStyle: (hwnd: number, index: number, style: number) =>
			SetWindowLongPtrW(hwnd, index, style >>> 0),
		setParent: (child: number, parent: number) => SetParent(child, parent) as number,
		setWindowPos: (
			hwnd: number,
			after: number,
			x: number,
			y: number,
			width: number,
			height: number,
			flags: number
		) => SetWindowPos(hwnd, after, x, y, width, height, flags) as boolean,
		showWindow: (hwnd: number, command: number) => ShowWindow(hwnd, command) as boolean
	};
}

let loaded: ReturnType<typeof load> | undefined;

export function win32(): ReturnType<typeof load> {
	loaded ??= load();
	return loaded;
}
