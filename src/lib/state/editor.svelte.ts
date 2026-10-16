import type {
	CliStatus,
	ConsoleLine,
	OpenResult,
	PreviewState,
	Project,
	RecentProject,
	UpdateState
} from '../../../shared/api.ts';
import type { PromptEvent } from '../../../shared/cli.ts';

/**
 * Everything the window shows that comes from the main process, in one reactive object.
 * Components read it and call the actions below; nothing else talks to `window.smartify`
 * for state.
 */

export interface OpenPrompt {
	jobId: string;
	prompt: PromptEvent;
	/** Why the last answer was refused, if it was. */
	invalid?: string;
	/** Answered, waiting to hear whether the answer was taken. */
	answered: boolean;
}

export interface Problem {
	message: string;
	hint?: string;
}

const maxConsoleLines = 5000;

class Editor {
	cli = $state<CliStatus | undefined>();
	project = $state<Project | undefined>();
	recent = $state<RecentProject[]>([]);
	preview = $state<PreviewState>({ status: 'idle' });
	consoleLines = $state<ConsoleLine[]>([]);
	prompts = $state<OpenPrompt[]>([]);
	/** Shown on the start screen when opening a project failed. */
	openProblem = $state<Problem | undefined>();
	opening = $state(false);
	/** Dialogs and menus currently covering the window, which the app's window must not cover. */
	overlays = $state(0);
	/** This editor's version. */
	version = $state('');
	update = $state<UpdateState>({ status: 'idle' });
	/** Whether the "update ready" dialog is open. It opens by itself once per version. */
	updateDialog = $state(false);
	private updateDialogShownFor: string | undefined;

	readonly running = $derived(
		this.preview.status === 'starting' ||
			this.preview.status === 'running' ||
			this.preview.status === 'stopping'
	);

	private started = false;

	/** Connects to the main process. Called once, by the root layout. */
	start(): () => void {
		if (this.started) return () => {};
		this.started = true;
		const api = window.smartify;

		void api.cli.status().then((status) => (this.cli = status));
		void api.projects.recent().then((recent) => (this.recent = recent));
		void api.projects.current().then((project) => (this.project ??= project));
		void api.preview.state().then((state) => (this.preview = state));
		void api.console.history().then((lines) => (this.consoleLines = lines));
		void api.version().then((version) => (this.version = version));
		void api.updates.state().then((state) => this.setUpdate(state));

		const unsubscribe = [
			api.preview.onState((state) => (this.preview = state)),
			api.updates.onState((state) => this.setUpdate(state)),
			api.console.onLine((line) => {
				this.consoleLines.push(line);
				if (this.consoleLines.length > maxConsoleLines) {
					this.consoleLines.splice(0, this.consoleLines.length - maxConsoleLines);
				}
			}),
			api.cli.onEvent(({ jobId, event }) => {
				if (event.type === 'prompt') {
					this.prompts = [
						...this.prompts.filter((open) => open.jobId !== jobId),
						{ jobId, prompt: event, answered: false }
					];
				} else if (event.type === 'prompt-invalid') {
					const open = this.prompts.find((p) => p.jobId === jobId && p.prompt.id === event.id);
					if (open) {
						open.invalid = event.message;
						open.answered = false;
					}
				} else if (event.type === 'result') {
					this.prompts = this.prompts.filter((open) => open.jobId !== jobId);
				} else {
					// Anything else means an answered question was taken.
					this.prompts = this.prompts.filter((open) => !(open.jobId === jobId && open.answered));
				}
			})
		];
		return () => unsubscribe.forEach((stop) => stop());
	}

	private setUpdate(state: UpdateState): void {
		this.update = state;
		if (state.status === 'ready' && this.updateDialogShownFor !== state.version) {
			this.updateDialogShownFor = state.version;
			this.updateDialog = true;
		}
		// The tools behind the editor may have changed, the title bar shows their version.
		if (state.status === 'updated') void this.refreshCli();
	}

	checkForUpdates(): void {
		window.smartify.updates.check();
	}

	restartToUpdate(): void {
		this.updateDialog = false;
		window.smartify.updates.restart();
	}

	async refreshCli(): Promise<void> {
		this.cli = await window.smartify.cli.status();
	}

	async open(path?: string): Promise<void> {
		this.opening = true;
		this.openProblem = undefined;
		try {
			this.handleOpen(await window.smartify.projects.open(path));
		} finally {
			this.opening = false;
			this.recent = await window.smartify.projects.recent();
		}
	}

	async refreshProject(): Promise<void> {
		this.handleOpen(await window.smartify.projects.refresh());
	}

	private handleOpen(result: OpenResult): void {
		if (result.ok) {
			this.project = result.project;
		} else if (!result.cancelled) {
			this.openProblem = { message: result.message, hint: result.hint };
		}
	}

	async close(): Promise<void> {
		await window.smartify.projects.close();
		this.project = undefined;
		this.recent = await window.smartify.projects.recent();
	}

	async forget(path: string): Promise<void> {
		this.recent = await window.smartify.projects.forget(path);
	}

	toggleRun(): void {
		if (!this.project) return;
		if (this.running) void window.smartify.preview.stop();
		else void window.smartify.preview.start();
	}

	reload(): void {
		if (this.preview.status === 'running') window.smartify.preview.reload();
	}

	restart(): void {
		if (this.preview.status === 'running') window.smartify.preview.restart();
	}

	answer(open: OpenPrompt, value: unknown): void {
		open.answered = true;
		open.invalid = undefined;
		window.smartify.cli.answer(open.jobId, open.prompt.id, value);
	}

	cancelPrompt(open: OpenPrompt): void {
		window.smartify.cli.cancel(open.jobId, open.prompt.id);
		this.prompts = this.prompts.filter((p) => p !== open);
	}

	clearConsole(): void {
		window.smartify.console.clear();
		this.consoleLines = [];
	}
}

export const editor = new Editor();
