import { type BrowserWindow, screen } from 'electron';
import type { PreviewState, Rect } from '../../shared/api.ts';
import { cliEnv } from '../cli/environment.ts';
import { CliJob } from '../cli/job.ts';
import { track, writeConsole } from '../cli/jobs.ts';
import { cliStatus } from '../cli/locate.ts';
import { descendants } from '../system/processes.ts';
import { createEmbedder, EmbedUnavailable, type Embedder, type Placement } from './embedder.ts';

/**
 * The live preview: runs the car's app with `smartify-os run` (the CLI does all of the
 * Flutter work), finds the app's window once it opens, and keeps it in the viewport.
 */

/** Flutter prints one of these once the app is up and taking hot reloads. */
const appIsUp = /Dart VM Service .* is available at|Flutter run key commands/;

/** How long a stop may take before everything is killed. */
const stopTimeoutMs = 5000;

export class PreviewSession {
	private job: CliJob | undefined;
	private embedder: Embedder | undefined;
	private embedProblem: { message: string; hint?: string } | undefined;
	private attached = false;
	private appUp = false;
	private stopping = false;
	private looking = false;
	private poll: NodeJS.Timeout | undefined;
	private viewport: Rect | null = null;
	private current: PreviewState = { status: 'idle' };

	constructor(
		private readonly host: BrowserWindow,
		private readonly onState: (state: PreviewState) => void
	) {
		const replace = () => this.place();
		for (const event of ['move', 'moved', 'resize', 'resized', 'maximize', 'unmaximize'] as const) {
			host.on(event as 'move', replace);
		}
		host.on('enter-full-screen', replace);
		host.on('leave-full-screen', replace);
		// Clicking the editor brings it in front of the app's window, and macOS finishes doing
		// so a moment after telling us. Asked again a little later to win that race.
		host.on('focus', () => {
			this.embedder?.raise();
			for (const delay of [50, 200])
				setTimeout(() => this.attached && this.embedder?.raise(), delay);
		});
		host.on('minimize', () => this.embedder?.setVisible(false));
		host.on('hide', () => this.embedder?.setVisible(false));
		host.on('restore', () => this.showIfWanted());
		host.on('show', () => this.showIfWanted());
		host.webContents.on('zoom-changed', replace);
	}

	get state(): PreviewState {
		return this.current;
	}

	private setState(state: PreviewState): void {
		this.current = state;
		this.onState(state);
	}

	async start(projectDir: string): Promise<void> {
		if (this.job?.running) return;
		this.setState({ status: 'starting' });

		const cli = await cliStatus();
		if (!cli.found) {
			this.setState({
				status: 'failed',
				message: cli.reason,
				hint: 'Install the SmartifyOS CLI first.'
			});
			return;
		}

		this.embedProblem = undefined;
		this.embedder = undefined;
		try {
			this.embedder = await createEmbedder(this.host);
		} catch (error) {
			this.embedProblem =
				error instanceof EmbedUnavailable
					? { message: error.message, hint: error.hint }
					: { message: `The live preview could not be set up: ${String(error)}` };
		}

		// Tells SmartifyOS it runs in the preview, so it leaves out its title bar and window
		// buttons and lets the editor place it (see _initWindow in smartify_os_core).
		const extra: Record<string, string> = { SMARTIFY_OS_EDITOR: '1' };
		// The editor runs through XWayland on Linux (see main.ts), and the app has to as well,
		// since only an X11 window can be taken into another X11 window.
		if (process.platform === 'linux') extra.GDK_BACKEND = 'x11';

		writeConsole('preview', 'info', "Starting your car's app");
		const job = new CliJob(cli.path, ['run'], {
			cwd: projectDir,
			env: await cliEnv(extra),
			interactive: true
		});
		this.job = job;
		this.attached = false;
		this.appUp = false;
		this.stopping = false;
		track(job, 'preview');
		job.on('event', (event) => {
			if (event.type === 'output' && appIsUp.test(event.text)) {
				this.appUp = true;
				void this.tick();
			}
		});

		this.poll = setInterval(() => void this.tick(), 400);
		const result = await job.result;
		this.cleanUp();
		if (result.ok || this.stopping || result.error.kind === 'cancelled') {
			this.setState({ status: 'idle' });
		} else {
			const tooOld = /no command called run/i.test(result.error.message);
			this.setState({
				status: 'failed',
				message: tooOld ? 'The live preview needs a newer SmartifyOS CLI.' : result.error.message,
				hint: tooOld
					? 'Run smartify-os self-update in a terminal, then try again.'
					: result.error.hint
			});
		}
	}

	/** Internal: one {@link look} at a time, the timer and Flutter's output both start one. */
	private async tick(): Promise<void> {
		if (this.looking) return;
		this.looking = true;
		try {
			await this.look();
		} finally {
			this.looking = false;
		}
	}

	/** Internal: looks for the window, and keeps an eye on it once found. */
	private async look(): Promise<void> {
		const job = this.job;
		if (!job?.running || job.pid === undefined || this.stopping) return;
		const embedder = this.embedder;

		if (this.attached && embedder) {
			if (embedder.alive()) {
				// Anything that slipped past the focus event (a drag, another app) is put right.
				if (this.host.isFocused()) embedder.raise();
				return;
			}
			// The window went (the app quit, or opened a new one). Look for it again.
			embedder.detach();
			this.attached = false;
		}

		const problem = this.embedProblem ?? embedder?.blocker();
		if (embedder && !problem) {
			const pids = await descendants(job.pid);
			if (!job.running || this.stopping) return;
			try {
				if (embedder.attach(pids)) {
					this.attached = true;
					this.place();
					embedder.setVisible(this.viewport !== null && this.hostShown());
					this.setState({ status: 'running', mode: embedder.mode });
					return;
				}
			} catch (error) {
				this.embedProblem = { message: `Could not take in your app's window: ${String(error)}` };
			}
		}

		if (this.appUp && this.current.status !== 'running') {
			const why = this.embedProblem ?? embedder?.blocker();
			this.setState({
				status: 'running',
				mode: 'separate',
				note: why ? [why.message, why.hint].filter(Boolean).join(' ') : undefined
			});
		} else if (
			this.appUp &&
			this.current.status === 'running' &&
			this.current.mode !== 'separate'
		) {
			this.setState({ status: 'running', mode: 'separate' });
		}
	}

	stop(): Promise<void> {
		const job = this.job;
		if (!job?.running) return Promise.resolve();
		this.stopping = true;
		this.setState({ status: 'stopping' });
		this.embedder?.detach();
		this.attached = false;
		job.input('q');
		const timer = setTimeout(() => job.kill(), stopTimeoutMs);
		return job.result.then(() => clearTimeout(timer));
	}

	reload(): void {
		this.job?.input('r');
	}

	restart(): void {
		this.job?.input('R');
	}

	/** Stops at once, for when the editor closes. */
	dispose(): void {
		this.job?.kill();
		this.cleanUp();
	}

	setViewport(rect: Rect | null): void {
		this.viewport = rect;
		if (!rect) {
			this.embedder?.setVisible(false);
			return;
		}
		this.place();
		this.showIfWanted();
	}

	private hostShown(): boolean {
		return this.host.isVisible() && !this.host.isMinimized();
	}

	private showIfWanted(): void {
		if (this.attached && this.viewport && this.hostShown()) this.embedder?.setVisible(true);
	}

	/** Internal: puts the window where the viewport is now. */
	private place(): void {
		if (!this.attached || !this.embedder || !this.viewport || this.host.isDestroyed()) return;
		this.embedder.place(this.placement(this.viewport));
	}

	private placement(rect: Rect): Placement {
		const zoom = this.host.webContents.getZoomFactor();
		const scale = screen.getDisplayMatching(this.host.getBounds()).scaleFactor;
		const content = this.host.getContentBounds();
		const pixels = scale * zoom;
		return {
			client: {
				x: Math.round(rect.x * pixels),
				y: Math.round(rect.y * pixels),
				width: Math.round(rect.width * pixels),
				height: Math.round(rect.height * pixels)
			},
			screen: {
				x: Math.round(content.x + rect.x * zoom),
				y: Math.round(content.y + rect.y * zoom),
				width: Math.round(rect.width * zoom),
				height: Math.round(rect.height * zoom)
			}
		};
	}

	private cleanUp(): void {
		if (this.poll) clearInterval(this.poll);
		this.poll = undefined;
		this.embedder?.detach();
		this.attached = false;
		this.job = undefined;
	}
}
