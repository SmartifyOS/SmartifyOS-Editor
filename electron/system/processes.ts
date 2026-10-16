import { execFile, spawnSync } from 'node:child_process';

/**
 * The process tree, which is how the running Flutter app is found: the editor starts the
 * CLI, which starts `flutter run`, which starts the app. The app's window is whichever
 * window belongs to one of the CLI's descendants.
 */

interface ProcessEntry {
	pid: number;
	ppid: number;
}

/** Internal: every process on the computer with its parent. */
async function listProcesses(): Promise<ProcessEntry[]> {
	if (process.platform === 'win32') {
		const { win32 } = await import('../native/win32.ts');
		return win32().listProcesses();
	}
	return await new Promise((resolve) => {
		execFile('ps', ['-A', '-o', 'pid=,ppid='], { maxBuffer: 8 * 1024 * 1024 }, (_error, stdout) => {
			const entries: ProcessEntry[] = [];
			for (const line of (stdout ?? '').split('\n')) {
				const [pid, ppid] = line.trim().split(/\s+/).map(Number);
				if (pid && ppid !== undefined && !Number.isNaN(ppid)) entries.push({ pid, ppid });
			}
			resolve(entries);
		});
	});
}

/** Every process started by `root`, directly or further down, nearest first. */
export async function descendants(root: number): Promise<number[]> {
	const children = new Map<number, number[]>();
	for (const { pid, ppid } of await listProcesses()) {
		const list = children.get(ppid);
		if (list) list.push(pid);
		else children.set(ppid, [pid]);
	}
	const found: number[] = [];
	const queue = [root];
	while (queue.length > 0) {
		const pid = queue.shift() as number;
		for (const child of children.get(pid) ?? []) {
			found.push(child);
			queue.push(child);
		}
	}
	return found;
}

/**
 * Stops a process and everything it started. Synchronous on purpose, so it also works while
 * the editor is quitting.
 */
export function killTree(root: number): void {
	if (process.platform === 'win32') {
		spawnSync('taskkill', ['/pid', String(root), '/T', '/F'], { windowsHide: true });
		return;
	}
	// The children have to be read before the parent goes, they are found through it.
	const result = spawnSync('ps', ['-A', '-o', 'pid=,ppid='], { encoding: 'utf8' });
	const children = new Map<number, number[]>();
	for (const line of (result.stdout ?? '').split('\n')) {
		const [pid, ppid] = line.trim().split(/\s+/).map(Number);
		if (!pid || ppid === undefined) continue;
		const list = children.get(ppid);
		if (list) list.push(pid);
		else children.set(ppid, [pid]);
	}
	const all: number[] = [];
	const queue = [root];
	while (queue.length > 0) {
		const pid = queue.shift() as number;
		all.push(pid);
		queue.push(...(children.get(pid) ?? []));
	}
	for (const pid of all) {
		try {
			process.kill(pid, 'SIGTERM');
		} catch {
			// Gone already.
		}
	}
}
