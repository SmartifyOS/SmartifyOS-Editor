import type { CliEvent, LogLevel, ResultEvent } from '../../../shared/cli.ts';
import type { Problem } from './editor.svelte.ts';

/**
 * A CLI command the user started on the car (adding an extension, flashing a device), as the
 * task dialog shows it: its steps and what it says while it runs, then how it ended. The
 * commands themselves are in src/lib/commands.ts.
 */

export interface TaskSpec {
	/** What the dialog says it does, like "Add an extension". */
	title: string;
	/** `smartify-os <args>`, run in the car's app. */
	args: string[];
	/**
	 * What it changes once it worked. `car` reads the car again and restarts the running app,
	 * `devices` only reads the car again, `nothing` leaves it as it is.
	 */
	changes: 'car' | 'devices' | 'nothing';
}

export type TaskLine =
	| { kind: 'step'; id: string; text: string; status: 'start' | 'update' | 'done' | 'error' }
	| { kind: 'log'; level: LogLevel; text: string; title?: string; data?: unknown };

export class Task {
	readonly spec: TaskSpec;
	/** Set once the CLI started, which is what its questions are matched by. */
	jobId = $state<string | undefined>();
	lines = $state<TaskLine[]>([]);
	status = $state<'running' | 'done' | 'failed'>('running');
	/** The last thing it said when it worked, like "All done." */
	outro = $state<string | undefined>();
	problem = $state<Problem | undefined>();
	/** Moved out of the way while it runs, the status bar shows it meanwhile. */
	hidden = $state(false);

	constructor(spec: TaskSpec) {
		this.spec = spec;
	}

	/** Takes one of its job's events. */
	handle(event: CliEvent): void {
		if (event.type === 'step') {
			const known = this.lines.find((line) => line.kind === 'step' && line.id === event.id);
			if (known) Object.assign(known, { text: event.text, status: event.status });
			else this.lines.push({ kind: 'step', id: event.id, text: event.text, status: event.status });
		} else if (event.type === 'log') {
			// The dialog has a title of its own.
			if (event.level === 'intro') return;
			if (event.level === 'outro') {
				this.outro = event.text;
				return;
			}
			const { level, text, title, data } = event;
			this.lines.push({ kind: 'log', level, text, title, data });
		} else if (event.type === 'result') {
			this.finish(event);
		}
	}

	/** Internal: how it ended. */
	private finish(result: ResultEvent): void {
		if (result.ok) {
			this.status = 'done';
		} else {
			this.status = 'failed';
			this.problem = { message: result.error.message, hint: result.error.hint };
		}
		// Whatever was still spinning has stopped with it.
		for (const line of this.lines) {
			if (line.kind === 'step' && (line.status === 'start' || line.status === 'update')) {
				line.status = result.ok ? 'done' : 'error';
			}
		}
	}
}
