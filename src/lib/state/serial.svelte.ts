import type { SerialBoard, SerialSentLine } from '../../../shared/cli.ts';
import { commands } from '../commands.ts';
import { editor } from './editor.svelte.ts';

/** One line of a board's log: a line sent into the app, or one the app sent to the board. */
export interface SerialEntry {
	key: string;
	/** `in` is into the app, as if the board printed it, `out` is what the app sent. */
	direction: 'in' | 'out';
	at: number;
	/** The board's name. */
	device: string;
	line: string;
}

/** How often what the app sent is asked for, and how often what its boards are doing. */
const trafficEveryMs = 500;
const boardsEveryMs = 2000;
const keptEntries = 100;

/**
 * The car's boards on a USB cable while its app runs, for trying out what the app does with
 * what a board prints before the board is plugged in: each board and what the app listens for
 * (`serialDescribe`), lines taken as if the board printed them (`serialSend`), boards that
 * count as plugged in (`serialDevice`), and what the app sent (`serialTraffic`). See `call` in
 * the CLI's README. Changing a board where the app defines it is `device edit`.
 */
class Serial {
	/** Every board of the running app, unknown while it is not running (or too old to say). */
	boards = $state<SerialBoard[] | undefined>();
	/** Why there are no boards, when the app is running but cannot say. */
	problem = $state<string | undefined>();
	/** Newest first. */
	log = $state<SerialEntry[]>([]);
	/** Changes still being written. */
	busy = $state(0);

	private timers: ReturnType<typeof setInterval>[] = [];
	/** The boards switched on to count as plugged in, kept through a restart of the app. */
	private pretending = new Set<string>();
	private lastSeq = -1;
	private nextKey = 0;
	private asking = false;

	/** The running app's board called `name`, if it has one. */
	board(name: string): SerialBoard | undefined {
		return this.boards?.find((board) => board.name === name);
	}

	/** Starts following the running app. */
	follow(): void {
		this.stop();
		this.pretending.clear();
		this.lastSeq = -1;
		this.log = [];
		void this.describe();
		this.timers = [
			setInterval(() => void this.poll(), trafficEveryMs),
			setInterval(() => void this.describe(), boardsEveryMs)
		];
	}

	/** Stops following it, once it stopped. */
	stop(): void {
		this.stopPolling();
		this.boards = undefined;
		this.problem = undefined;
	}

	/** Takes a line as if the board called `device` printed it. */
	async send(device: string, line: string): Promise<void> {
		const reply = await editor.callApp('serialSend', { device, line });
		if (!reply.ok) {
			this.problem = reply.error;
			return;
		}
		this.add({ direction: 'in', at: Date.now(), device, line });
		// What it printed is the board's last value now.
		void this.describe();
	}

	/** Makes a board count as plugged in, or stop doing so. */
	async pretend(device: string, there: boolean): Promise<void> {
		if (there) this.pretending.add(device);
		else this.pretending.delete(device);
		const reply = await editor.callApp('serialDevice', { device, there });
		if (reply.ok) this.boards = (reply.data as { devices: SerialBoard[] }).devices;
	}

	/**
	 * Changes what the driver reads for a board, or how fast it talks (in its sketch too), then
	 * reads the car again and restarts the app. Resolves with why it could not be done.
	 */
	async edit(name: string, change: { title?: string; baudRate?: number }) {
		this.busy++;
		try {
			const result = await editor.runCli(commands.editUsbDevice(name, change));
			await editor.refreshProject();
			if (!result.ok) return result.error.message;
			// New code in the app, which only a restart runs.
			await editor.restart();
			return undefined;
		} finally {
			this.busy--;
		}
	}

	clearLog(): void {
		this.log = [];
	}

	private async describe(): Promise<void> {
		const reply = await editor.callApp('serialDescribe');
		if (reply.ok) {
			const boards = (reply.data as { devices: SerialBoard[] }).devices;
			this.boards = boards;
			this.problem = undefined;
			// A restart of the app forgets them, the editor does not.
			for (const board of boards) {
				if (this.pretending.has(board.name) && !board.pretending && !board.port) {
					void this.pretend(board.name, true);
				}
			}
		} else if (/does not know/.test(reply.error)) {
			// A SmartifyOS from before boards on USB, which will never answer.
			this.boards = undefined;
			this.problem = 'Trying out a board on USB needs a newer SmartifyOS in your car.';
			this.stopPolling();
		}
	}

	private async poll(): Promise<void> {
		if (this.asking || !this.boards) return;
		this.asking = true;
		try {
			const reply = await editor.callApp('serialTraffic', { after: String(this.lastSeq) });
			if (!reply.ok) return;
			const { next, lines } = reply.data as { next: number; lines: SerialSentLine[] };
			// The app started again, and counts from the start again.
			if (next <= this.lastSeq) this.lastSeq = -1;
			for (const sent of lines) {
				this.lastSeq = Math.max(this.lastSeq, sent.seq);
				this.add({ direction: 'out', at: sent.at, device: sent.device, line: sent.line });
			}
		} finally {
			this.asking = false;
		}
	}

	private stopPolling(): void {
		for (const timer of this.timers) clearInterval(timer);
		this.timers = [];
	}

	private add(entry: Omit<SerialEntry, 'key'>): void {
		this.nextKey += 1;
		this.log = [{ ...entry, key: String(this.nextKey) }, ...this.log].slice(0, keptEntries);
	}
}

export const serial = new Serial();
