import type { CanNetwork, CanSentFrame } from '../../../shared/cli.ts';
import { editor } from './editor.svelte.ts';

/** One line of the simulator's log: a message sent into the app, or one the app sent. */
export interface BusEntry {
	key: string;
	/** `in` is into the app, as if a device sent it, `out` is what the app sent. */
	direction: 'in' | 'out';
	at: number;
	message: string;
	values: Record<string, unknown>;
}

/** How often what the app sent is asked for, and how often what is on the bus. */
const trafficEveryMs = 500;
const networkEveryMs = 2000;
const keptEntries = 100;

/**
 * The car's CAN bus while its app runs, for trying out what the app does with a message
 * before the device that sends it exists: what is on the bus (`canDescribe`), messages taken
 * as if a device had sent them (`canSend`), devices that say they are there (`canDevice`),
 * and what the app sent (`canTraffic`). See `call` in the CLI's README.
 */
class Bus {
	/** What is on the bus, unknown while the app is not running (or too old to say). */
	network = $state<CanNetwork | undefined>();
	/** Why there is no network, when the app is running but cannot say. */
	problem = $state<string | undefined>();
	/** Newest first. */
	log = $state<BusEntry[]>([]);

	private timers: ReturnType<typeof setInterval>[] = [];
	/** The devices switched on to say they are there, by node, kept through a restart of the app. */
	private pretending = new Set<number>();
	private lastSeq = -1;
	private nextKey = 0;
	private asking = false;

	/** Starts following the running app. */
	follow(): void {
		this.stop();
		this.pretending.clear();
		this.lastSeq = -1;
		this.log = [];
		void this.describe();
		this.timers = [
			setInterval(() => void this.poll(), trafficEveryMs),
			setInterval(() => void this.describe(), networkEveryMs)
		];
	}

	/** Stops following it, once it stopped. */
	stop(): void {
		for (const timer of this.timers) clearInterval(timer);
		this.timers = [];
		this.network = undefined;
		this.problem = undefined;
	}

	/** Takes a message as if its device had sent it. */
	async send(message: string, values: Record<string, unknown>): Promise<void> {
		const reply = await editor.callApp('canSend', { message, values });
		if (!reply.ok) {
			this.problem = reply.error;
			return;
		}
		this.add({ direction: 'in', at: Date.now(), message, values });
	}

	/** Makes a device say it is there, or stop saying so. */
	async pretend(node: number, there: boolean): Promise<void> {
		if (there) this.pretending.add(node);
		else this.pretending.delete(node);
		const reply = await editor.callApp('canDevice', { node, there });
		if (reply.ok) this.network = reply.data as CanNetwork;
	}

	clearLog(): void {
		this.log = [];
	}

	private async describe(): Promise<void> {
		const reply = await editor.callApp('canDescribe');
		if (reply.ok) {
			const network = reply.data as CanNetwork;
			this.network = network;
			this.problem = undefined;
			// A restart of the app forgets them, the editor does not.
			for (const device of network.devices) {
				if (this.pretending.has(device.node) && !device.pretending) {
					void this.pretend(device.node, true);
				}
			}
		} else if (/does not know/.test(reply.error)) {
			// A SmartifyOS from before the simulator, which will never answer.
			this.network = undefined;
			this.problem = 'Trying out the CAN bus needs a newer SmartifyOS in your car.';
			this.stopPolling();
		}
	}

	private async poll(): Promise<void> {
		if (this.asking || !this.network) return;
		this.asking = true;
		try {
			const reply = await editor.callApp('canTraffic', { after: String(this.lastSeq) });
			if (!reply.ok) return;
			const { next, frames } = reply.data as { next: number; frames: CanSentFrame[] };
			// The app started again, and counts from the start again.
			if (next <= this.lastSeq) this.lastSeq = -1;
			for (const frame of frames) {
				this.lastSeq = Math.max(this.lastSeq, frame.seq);
				this.add({
					direction: 'out',
					at: frame.at,
					message: frame.message ?? `0x${frame.id.toString(16)}`,
					values: frame.values ?? { data: frame.data.join(' ') }
				});
			}
		} finally {
			this.asking = false;
		}
	}

	private stopPolling(): void {
		for (const timer of this.timers) clearInterval(timer);
		this.timers = [];
	}

	private add(entry: Omit<BusEntry, 'key'>): void {
		this.nextKey += 1;
		this.log = [{ ...entry, key: String(this.nextKey) }, ...this.log].slice(0, keptEntries);
	}
}

export const bus = new Bus();
