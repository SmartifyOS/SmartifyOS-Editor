import type {
	AboutResult,
	AppDescription,
	Appearance,
	AppearanceResult,
	CarLookName
} from '../../../shared/cli.ts';
import { checks, type LookChange, lookCommands } from '../commands.ts';
import { editor } from './editor.svelte.ts';

/**
 * How the open car looks and what its About page says, as the inspector edits it.
 *
 * Two sources: `lib/main.dart`, read and written by the CLI (`appearance`, `about`), which is
 * what lasts, and the running app (`describe`, `configure`), which knows the car's own layouts
 * and themes and shows a change straight away. A change goes to the running app first, so the
 * preview follows at once, then the CLI writes it, one change at a time.
 */
class Look {
	/** What `lib/main.dart` says, unknown until the CLI has read it. */
	appearance = $state<Appearance | undefined>();
	/** What the running app has, unknown while it is not running (or too old to say). */
	app = $state<AppDescription | undefined>();
	/** Why the last change could not be written, until the next one is. */
	problem = $state<string | undefined>();
	/** What has no clear place in `lib/main.dart`, from the last change. */
	manual = $state<string[]>([]);
	/** Changes still being written. */
	writing = $state(0);
	/** What the parts of the car's 3D model and drawing are called, for picking them by name. */
	partNames = $state<{ model3D: string[]; drawing2D: string[] }>({ model3D: [], drawing2D: [] });

	private queue: Promise<void> = Promise.resolve();
	/** Changes shown at once that are still waiting to be written, oldest first. */
	private waiting: LookChange[] = [];
	private describing = 0;

	/** Reads `lib/main.dart` again, unless a change is being written, which reads it anyway. */
	async read(): Promise<void> {
		if (this.writing > 0) return;
		const path = editor.project?.path;
		const result = await editor.queryCli(checks.appearance);
		if (editor.project?.path !== path || this.writing > 0) return;
		const data = result?.ok ? (result.data as AppearanceResult) : undefined;
		this.appearance = data?.appearance;
		this.partNames = data?.partNames ?? { model3D: [], drawing2D: [] };
	}

	/**
	 * Asks the running app what it has, a few times while it is still coming up (and after a
	 * restart, which starts it again).
	 */
	async describe(): Promise<void> {
		const attempt = ++this.describing;
		for (let tries = 0; tries < 20; tries++) {
			if (attempt !== this.describing || editor.preview.status !== 'running') return;
			const reply = await editor.callApp('describe');
			if (attempt !== this.describing) return;
			if (reply.ok) {
				this.app = reply.data as AppDescription;
				return;
			}
			// A SmartifyOS from before `describe` will never answer, so there is no use asking.
			if (/does not know/.test(reply.error)) break;
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
		this.app = undefined;
	}

	/** Forgets the running app, once it stopped. */
	forgetApp(): void {
		this.describing++;
		this.app = undefined;
	}

	/** Shows a change in the running app at once, then writes it into `lib/main.dart`. */
	change(change: LookChange): Promise<void> {
		this.problem = undefined;
		this.waiting.push(change);
		if (this.appearance) this.appearance = applied(this.appearance, change);
		const files = change.files !== undefined;
		if (!files && this.app) void this.configure(change);

		this.writing++;
		const write = this.queue.then(() => this.write(change));
		this.queue = write.finally(() => {
			this.writing--;
			this.waiting = this.waiting.filter((waiting) => waiting !== change);
		});
		return write;
	}

	private async configure(change: LookChange): Promise<void> {
		const params: Record<string, unknown> = {};
		if (change.layout !== undefined) params.layout = change.layout;
		if (change.theme !== undefined) params.theme = change.theme ?? '';
		if (change.driverSide !== undefined) params.driverSide = change.driverSide;
		if (change.bar !== undefined) params.bar = change.bar;
		if (change.look !== undefined) params.carLook = change.look ?? '';
		if (change.name !== undefined) params.deviceName = change.name;
		if (change.model !== undefined) params.model = change.model;
		// The whole set, with the change in it: the app replaces what it has.
		if (change.extra !== undefined && this.appearance) params.extra = this.appearance.about.extra;
		const reply = await editor.callApp('configure', params);
		if (reply.ok) this.app = reply.data as AppDescription;
	}

	private async write(change: LookChange): Promise<void> {
		const commands = lookCommands(change);
		let restart = false;
		const manual: string[] = [];
		for (const args of [commands.appearance, commands.about]) {
			if (!args) continue;
			const result = await editor.runCli(args);
			if (!result.ok) {
				this.problem = [result.error.message, result.error.hint].filter(Boolean).join(' ');
				await this.read();
				return;
			}
			const data = result.data as AppearanceResult | AboutResult;
			manual.push(...data.manual);
			if ('appearance' in data) {
				this.appearance = data.appearance;
				if (data.partNames) this.partNames = data.partNames;
				restart ||= data.restart;
			} else if (this.appearance) {
				this.appearance = { ...this.appearance, about: data.about };
			}
			// The changes made since are not in what the CLI says yet: they stay shown.
			for (const waiting of this.waiting) {
				if (waiting !== change && this.appearance) {
					this.appearance = applied(this.appearance, waiting);
				}
			}
		}
		this.manual = manual;
		// A picture of the car is read when the app starts, and an app that cannot be changed
		// while it runs (a SmartifyOS from before that) only shows anything after a restart.
		if ((restart || !this.app) && editor.preview.status === 'running') {
			editor.restart();
			void this.describe();
		}
	}
}

/** Internal: how it looks with the change in, before the CLI has said so. */
function applied(appearance: Appearance, change: LookChange): Appearance {
	const next: Appearance = $state.snapshot(appearance) as Appearance;
	if (change.layout !== undefined) next.layout = change.layout;
	if (change.theme !== undefined) next.theme = change.theme;
	if (change.driverSide !== undefined) next.driverSide = change.driverSide;
	if (change.bar !== undefined) next.bar = change.bar;
	if (change.look !== undefined) next.car.look = change.look;
	for (const [look, file] of Object.entries(change.files ?? {}) as [CarLookName, string | null][]) {
		next.car[look] = file;
	}
	if (change.name !== undefined) next.about.name = change.name;
	if (change.model !== undefined) next.about.model = change.model || null;
	for (const [label, value] of Object.entries(change.extra ?? {})) {
		if (value) next.about.extra[label] = value;
		else delete next.about.extra[label];
	}
	// What was written as code is not any more.
	const keys = [...Object.keys(change), ...Object.keys(change.files ?? {})];
	for (const key of keys) delete next.code[key];
	return next;
}

export const look = new Look();
