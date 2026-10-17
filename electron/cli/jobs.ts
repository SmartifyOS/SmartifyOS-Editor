import type { ConsoleLine, JobEvent } from '../../shared/api.ts';
import type { CliEvent } from '../../shared/cli.ts';
import { nextSteps } from '../../shared/next-steps.ts';
import type { InstallJob } from './install.ts';
import { CliJob } from './job.ts';

/**
 * Every CLI job the window can see: its events go to the window, which answers questions
 * through {@link answer} and {@link cancel}, and what they print goes to the console.
 */

type Listener = (event: JobEvent) => void;

const jobs = new Map<string, CliJob | InstallJob>();
const listeners = new Set<Listener>();

export function onJobEvent(listener: Listener): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/** Makes a job visible to the window, and writes what it says into the console. */
export function track(job: CliJob | InstallJob, source: ConsoleLine['source']): void {
	jobs.set(job.id, job);
	job.on('event', (event) => {
		for (const listener of listeners) listener({ jobId: job.id, event });
		const line = consoleLineFor(event);
		if (line) writeConsole(source, line.level, line.text);
	});
	void job.result.then(() => {
		// Kept a little longer, an answer that crossed the end in flight finds nothing then.
		setTimeout(() => jobs.delete(job.id), 1000);
	});
}

/** A CLI job by its id, which questions are answered through. */
export function findJob(id: string): CliJob | undefined {
	const job = jobs.get(id);
	return job instanceof CliJob ? job : undefined;
}

/** Whether any job is still running, which an update of the CLI itself has to wait for. */
export function anyRunning(): boolean {
	for (const job of jobs.values()) if (job.running) return true;
	return false;
}

/** Stops every job, for when the editor quits. */
export function killAll(): void {
	for (const job of jobs.values()) job.kill();
}

/** Internal: how an event shows up in the console, if at all. */
function consoleLineFor(event: CliEvent): Pick<ConsoleLine, 'level' | 'text'> | undefined {
	switch (event.type) {
		case 'log': {
			const level =
				event.level === 'warn' || event.level === 'error' || event.level === 'success'
					? event.level
					: 'info';
			const steps = nextSteps(event.data);
			if (steps?.length === 0) return undefined;
			const body = steps
				? steps.map((step, index) => `${index + 1}. ${step}`).join('\n')
				: event.text;
			return { level, text: event.title ? `${event.title}\n${body}` : body };
		}
		case 'text':
			return { level: 'info', text: event.text };
		case 'step':
			if (event.status === 'start' || event.status === 'update') return undefined;
			return { level: event.status === 'error' ? 'error' : 'step', text: event.text };
		case 'output':
			if (!event.text.trim()) return undefined;
			return { level: event.stream === 'stderr' ? 'stderr' : 'output', text: event.text };
		case 'result':
			if (event.ok) return undefined;
			return {
				level: event.error.kind === 'cancelled' ? 'warn' : 'error',
				text: event.error.hint ? `${event.error.message}\n${event.error.hint}` : event.error.message
			};
		default:
			return undefined;
	}
}

// The console, kept here so it survives the window reloading.

const maxLines = 5000;
const lines: ConsoleLine[] = [];
const consoleListeners = new Set<(line: ConsoleLine) => void>();
let nextLine = 0;

export function writeConsole(
	source: ConsoleLine['source'],
	level: ConsoleLine['level'],
	text: string
): void {
	nextLine += 1;
	const line: ConsoleLine = { id: nextLine, source, level, text, time: Date.now() };
	lines.push(line);
	if (lines.length > maxLines) lines.splice(0, lines.length - maxLines);
	for (const listener of consoleListeners) listener(line);
}

export function consoleHistory(): ConsoleLine[] {
	return [...lines];
}

export function clearConsole(): void {
	lines.length = 0;
}

export function onConsoleLine(listener: (line: ConsoleLine) => void): () => void {
	consoleListeners.add(listener);
	return () => consoleListeners.delete(listener);
}
