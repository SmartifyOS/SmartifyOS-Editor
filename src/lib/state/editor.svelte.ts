import type {
	CliStatus,
	ConsoleLine,
	OpenResult,
	PreviewState,
	Project,
	RecentProject,
	Settings,
	UpdateState
} from '../../../shared/api.ts';
import type {
	AppReply,
	PartKind,
	CliEvent,
	CoreUpdateCheck,
	ExtensionUpdates,
	DoctorCheck,
	DoctorReport,
	PromptEvent,
	ResultEvent
} from '../../../shared/cli.ts';
import { checks, computerCommands } from '../commands.ts';
import { Task, type TaskSpec } from './task.svelte.ts';

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

/**
 * What is picked in the car panel, and shown in the inspector. A `canDevice` is one the
 * running app has on its CAN bus that has no program yet, by its name. A `part` is one of the
 * app's windows, quick settings tiles or home screen widgets, and `settings` one of its settings
 * pages, both by their key (`partKey`, `pageKey`), since a file can have several.
 */
export type Selection =
	| { kind: 'car' }
	| { kind: 'package'; name: string }
	| { kind: 'device'; folder: string }
	| { kind: 'canDevice'; name: string }
	| { kind: 'part'; part: PartKind; key: string }
	| { kind: 'settings'; key: string };

/** Newer versions there are for the car, by what they are for. */
export interface CarUpdates {
	/** The newer SmartifyOS, or null when the car has the newest (or it could not be told). */
	smartifyOs: string | null;
	/** The newer version of each extension that has one, by package name. */
	extensions: Record<string, string>;
	/** Neither could be asked, which is usually when this computer is offline. */
	failed: boolean;
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
	/** Whether the dialog that creates a new car's app is open. */
	newCarDialog = $state(false);
	/** Whether the dialog that adds an extension, with the recommended ones, is open. */
	addExtensionDialog = $state(false);
	/** Whether the "update ready" dialog is open. It opens by itself once per version. */
	updateDialog = $state(false);
	private updateDialogShownFor: string | undefined;
	selection = $state<Selection>({ kind: 'car' });
	/** The files of the car's app that changed last, in VS Code or anywhere else, and when. */
	filesChanged = $state<{ paths: string[]; at: number } | undefined>();
	settings = $state<Settings | undefined>();
	/** What the doctor said about this computer, unknown until it answered. */
	computer = $state<DoctorReport | undefined>();
	checkingComputer = $state(false);
	/** Unknown until the first check after opening a project has answered. */
	carUpdates = $state<CarUpdates | undefined>();
	/** The command the task dialog shows, while it runs and after. One runs at a time. */
	task = $state<Task | undefined>();
	/**
	 * Set while the dialog about VS Code is open: what was being opened, and why it could not
	 * be (no message means it is not installed).
	 */
	vscodeDialog = $state<
		{ folder?: string; file?: string; line?: number; message?: string } | undefined
	>();

	readonly running = $derived(
		this.preview.status === 'starting' ||
			this.preview.status === 'running' ||
			this.preview.status === 'stopping'
	);
	/** Whether a task is running, while which no other can start. */
	readonly busy = $derived(this.task?.status === 'running');

	private started = false;
	/** Who follows a job started with {@link runCli}, by its id. */
	private jobListeners = new Map<string, (event: CliEvent) => void>();

	/** Connects to the main process. Called once, by the root layout. */
	start(): () => void {
		if (this.started) return () => {};
		this.started = true;
		const api = window.smartify;

		void api.cli.status().then((status) => {
			this.cli = status;
			if (status.found) void this.firstSetup();
			else if (status.canInstall) void this.installCli();
		});
		void api.settings.get().then((settings) => (this.settings = settings));
		void api.projects.recent().then((recent) => (this.recent = recent));
		void api.projects.current().then((project) => {
			if (project && !this.project) this.handleOpen({ ok: true, project });
		});
		void api.preview.state().then((state) => (this.preview = state));
		void api.console.history().then((lines) => (this.consoleLines = lines));
		void api.version().then((version) => (this.version = version));
		void api.updates.state().then((state) => this.setUpdate(state));

		const unsubscribe = [
			api.preview.onState((state) => (this.preview = state)),
			api.projects.onFilesChanged((paths) => (this.filesChanged = { paths, at: Date.now() })),
			api.updates.onState((state) => this.setUpdate(state)),
			api.console.onLine((line) => {
				this.consoleLines.push(line);
				if (this.consoleLines.length > maxConsoleLines) {
					this.consoleLines.splice(0, this.consoleLines.length - maxConsoleLines);
				}
			}),
			api.cli.onEvent(({ jobId, event }) => {
				this.jobListeners.get(jobId)?.(event);
				if (event.type === 'prompt') {
					// A question is never asked in the background.
					if (this.task?.jobId === jobId) this.task.hidden = false;
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

	/**
	 * Gets this computer ready the first time the editor runs on it, and otherwise only asks
	 * the doctor how it is. It runs once, however it went: what is still missing after it is
	 * on the start screen and the settings page.
	 */
	private async firstSetup(): Promise<void> {
		if (!(await window.smartify.setup.needed())) return void this.checkComputer();
		window.smartify.setup.done();
		await this.setUpComputer();
	}

	/**
	 * Installs SmartifyOS (the CLI) in the task dialog, and once it is there gets this computer
	 * ready for it (Flutter) the same as on the first start. Runs by itself when it is missing.
	 */
	async installCli(): Promise<void> {
		// Not a command of the CLI's, there is none yet: the main process runs its installer.
		const task = new Task({ title: 'Install SmartifyOS', args: [], changes: 'nothing' });
		this.task = task;
		try {
			const job = await this.follow(window.smartify.cli.install(), (event) => task.handle(event));
			task.jobId = job.jobId;
			await job.result;
		} catch (error) {
			task.handle(failure(error));
		}
		task.hidden = false;
		await this.refreshCli();
		if (this.cli?.found) await this.firstSetup();
	}

	/** Asks the doctor quietly what this computer has. */
	async checkComputer(): Promise<void> {
		this.checkingComputer = true;
		try {
			const result = await window.smartify.cli.query(checks.computer);
			// Something missing fails the command, with the same report.
			const report = result.ok ? result.data : result.error.details;
			this.computer = (report as DoctorReport | undefined)?.checks
				? (report as DoctorReport)
				: undefined;
		} catch {
			this.computer = undefined;
		} finally {
			this.checkingComputer = false;
		}
	}

	/** Runs the setup, or what puts one check right, and asks the doctor again afterwards. */
	async setUpComputer(check?: DoctorCheck): Promise<void> {
		await this.runTask(check ? computerCommands.fix(check) : computerCommands.setUp());
		await this.checkComputer();
	}

	async changeSettings(change: Partial<Settings>): Promise<void> {
		this.settings = await window.smartify.settings.set(change);
	}

	async forgetAll(): Promise<void> {
		this.recent = await window.smartify.projects.forgetAll();
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
			const another = this.project?.path !== result.project.path;
			this.project = result.project;
			if (another) {
				this.selection = { kind: 'car' };
				this.carUpdates = undefined;
				void this.checkCarUpdates();
			} else if (!this.selectionExists()) {
				this.selection = { kind: 'car' };
			}
		} else if (!result.cancelled) {
			this.openProblem = { message: result.message, hint: result.hint };
		}
	}

	/** Internal: whether what is picked is still in the car, after it was read again. */
	private selectionExists(): boolean {
		const picked = this.selection;
		const project = this.project;
		if (picked.kind !== 'package' && picked.kind !== 'device') return true;
		if (!project) return true;
		if (picked.kind === 'device') return project.devices.some((d) => d.folder === picked.folder);
		const { smartifyOs, extensions } = project.car;
		return smartifyOs.name === picked.name || extensions.some((e) => e.name === picked.name);
	}

	/** Asks the CLI quietly whether there is a newer SmartifyOS or extension for the car. */
	async checkCarUpdates(): Promise<void> {
		const path = this.project?.path;
		if (!path) return;
		const ask = (args: string[]) =>
			window.smartify.cli.query(args).catch((): ResultEvent | undefined => undefined);
		const [core, extensions] = await Promise.all([ask(checks.smartifyOs), ask(checks.extensions)]);
		// Another project was opened meanwhile.
		if (this.project?.path !== path) return;
		const available = extensions?.ok ? (extensions.data as ExtensionUpdates).available : [];
		this.carUpdates = {
			smartifyOs: core?.ok ? (core.data as CoreUpdateCheck).to : null,
			extensions: Object.fromEntries(available.map((update) => [update.name, update.to])),
			failed: !core?.ok && !extensions?.ok
		};
	}

	async close(): Promise<void> {
		await window.smartify.projects.close();
		this.project = undefined;
		this.carUpdates = undefined;
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

	/** Hot restart of the running app, resolved once it is done. */
	async restart(): Promise<void> {
		if (this.preview.status === 'running') await window.smartify.preview.restart();
	}

	/** Starts the running app again from scratch, for a change hot restart cannot take in. */
	private async rerun(): Promise<void> {
		if (!this.running) return;
		await window.smartify.preview.stop();
		await window.smartify.preview.start();
	}

	/**
	 * Runs a command on the car in the task dialog, and reads the car again afterwards when it
	 * changed it. Resolves with its result once it is over.
	 */
	async runTask(spec: TaskSpec): Promise<ResultEvent> {
		const task = new Task(spec);
		this.task = task;
		let result: ResultEvent;
		try {
			const job = await this.startCli(spec.args, (event) => task.handle(event));
			task.jobId = job.jobId;
			result = await job.result;
		} catch (error) {
			result = failure(error);
			task.handle(result);
		}

		// Cancelled means the user said no to its question, which needs no dialog to say so.
		if (!result.ok && result.error.kind === 'cancelled' && this.task === task) {
			this.task = undefined;
		}
		task.hidden = false;
		if (spec.changes !== 'nothing') await this.refreshProject();
		const changed = result.ok && (result.data as { changed?: boolean } | null)?.changed !== false;
		if (spec.changes === 'car' && changed) {
			void this.checkCarUpdates();
			await this.rerun();
		}
		return result;
	}

	/** Closes the task dialog once its task is over. */
	dismissTask(): void {
		if (!this.busy) this.task = undefined;
	}

	/**
	 * Opens the car's app, or a folder in it, in VS Code (at a file's line when given), or says
	 * what is missing for that.
	 */
	async openInVsCode(folder?: string, file?: string, line?: number): Promise<void> {
		const result = await window.smartify.vscode.open(folder, file, line);
		if (result.ok) this.vscodeDialog = undefined;
		else {
			const message = result.missing ? undefined : result.message;
			this.vscodeDialog = { folder, file, line, message };
		}
	}

	/** Runs a command quietly that asks nothing and changes nothing, undefined when it could not. */
	async queryCli(args: string[]): Promise<ResultEvent | undefined> {
		return await window.smartify.cli.query(args).catch(() => undefined);
	}

	/** Asks the running app something, see `call` in the CLI's README. */
	async callApp(name: string, params?: Record<string, unknown>): Promise<AppReply> {
		return await window.smartify.preview.call(name, $state.snapshot(params));
	}

	/**
	 * Runs `smartify-os <args>`, handing each of its events to `onEvent`, and resolves with
	 * its result. Questions it asks still go to the prompt dialog.
	 */
	async runCli(args: string[], onEvent?: (event: CliEvent) => void): Promise<ResultEvent> {
		return await (
			await this.startCli(args, onEvent)
		).result;
	}

	/** Internal: starts `smartify-os <args>`, and resolves with its job id and its result. */
	private async startCli(
		args: string[],
		onEvent?: (event: CliEvent) => void
	): Promise<{ jobId: string; result: Promise<ResultEvent> }> {
		// Arguments can come out of state (a doctor's fix), which IPC cannot send as it is.
		return await this.follow(window.smartify.cli.start($state.snapshot(args)), onEvent);
	}

	/** Internal: follows the job whose id `started` resolves with, until its result. */
	private async follow(
		started: Promise<string>,
		onEvent?: (event: CliEvent) => void
	): Promise<{ jobId: string; result: Promise<ResultEvent> }> {
		const jobId = await started;
		// The id arrives before the job's first event: both come over the same IPC pipe, and the
		// main process replies before the job has had a chance to say anything.
		const result = new Promise<ResultEvent>((resolve) => {
			this.jobListeners.set(jobId, (event) => {
				onEvent?.(event);
				if (event.type !== 'result') return;
				this.jobListeners.delete(jobId);
				resolve(event);
			});
		});
		return { jobId, result };
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

/** Internal: a job that could not even start, as its result. */
function failure(error: unknown): ResultEvent {
	return { type: 'result', ok: false, exitCode: 1, error: { kind: 'bug', message: String(error) } };
}

export const editor = new Editor();
