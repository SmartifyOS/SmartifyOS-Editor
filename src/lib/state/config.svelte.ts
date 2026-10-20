import type {
	ConfigElement,
	ConfigField,
	ConfigResult,
	ConfigValue,
	ResultEvent
} from '../../../shared/cli.ts';
import { checks, configCommands } from '../commands.ts';
import { areaInfo, type SetupArea } from '../setup.ts';
import { editor } from './editor.svelte.ts';
import { look } from './look.svelte.ts';

/**
 * Settings a `ConfigField` can show and change: the car's (`config`), or an extension's. Keys
 * are what the CLI names each setting by.
 */
export interface SettingsStore {
	field(key: string): ConfigField | undefined;
	/** What it is: what is written, or its default. */
	value<T extends ConfigValue>(key: string): T;
	isSet(key: string): boolean;
	/** What is written as code instead, and where. */
	codeOf(key: string): { code: string; line: number } | undefined;
	set(key: string, value: ConfigValue): Promise<void>;
	unset(key: string): Promise<void>;
	addId(key: string, id: string): Promise<void>;
	removeId(key: string, id: string): Promise<void>;
	/** Shows a value in the running app without writing it, while a slider is dragged. */
	preview?(key: string, value: ConfigValue): void;
}

/**
 * Every other setting of the car in `lib/main.dart` (its 3D model, the info display, Bluetooth
 * and the rest), as the setup pages of the inspector edit them, each by its key:
 * `car.model3D.scale`. The CLI reads and writes them with `config`, one change at a time.
 *
 * A change shows in the inspector at once and is then written. SmartifyOS reads these when it
 * starts, so the running app is restarted once every change waiting has been written.
 */
class Config implements SettingsStore {
	/** What `lib/main.dart` says, unknown until the CLI has read it. */
	result = $state<ConfigResult | undefined>();
	/** Why reading or the last change did not work, until the next one does. */
	problem = $state<string | undefined>();
	/** What has no clear place in `lib/main.dart`, from the last change. */
	manual = $state<string[]>([]);
	/** Changes waiting or being written. */
	writing = $state(0);

	private queue: Promise<unknown> = Promise.resolve();
	/** A change was written, and the running app has not been restarted since. */
	private restartDue = false;

	private readonly fields = $derived(
		new Map((this.result?.fields ?? []).map((field) => [field.key, field]))
	);

	/** Reads `lib/main.dart` again, unless a change is being written, which reads it anyway. */
	async read(): Promise<void> {
		if (this.writing > 0) return;
		const path = editor.project?.path;
		const result = await editor.queryCli(checks.config);
		if (editor.project?.path !== path || this.writing > 0) return;
		if (result?.ok) {
			this.result = result.data as ConfigResult;
			this.problem = undefined;
		} else {
			this.result = undefined;
			this.problem = result?.ok === false ? result.error.message : undefined;
		}
	}

	/**
	 * The setting with this key, undefined when the CLI does not know it (an older one). A
	 * setting of one element of a list is the list's: `rollingWheels[1].spinAxis`.
	 */
	field(key: string): ConfigField | undefined {
		const element = elementKey(key);
		if (!element) return this.fields.get(key);
		return this.fields.get(element.list)?.fields?.find((field) => field.key === element.name);
	}

	/** What it is: what is written, or SmartifyOS's own default. */
	value<T extends ConfigValue>(key: string): T {
		const written = this.written(key);
		return (written !== undefined ? written : (this.field(key)?.default ?? null)) as T;
	}

	/** Whether it is written, rather than left to SmartifyOS's default. */
	isSet(key: string): boolean {
		return this.written(key) !== undefined;
	}

	/** Internal: what is written, for a setting or one of an element of a list. */
	private written(key: string): ConfigValue | undefined {
		const element = elementKey(key);
		if (!element) return this.result?.values[key];
		return this.elements(element.list)[element.index]?.values[element.name];
	}

	/**
	 * Where it, or a config it is inside of, is written as code, which the editor only shows:
	 * `can: miataCan` for `can.bitrate`.
	 */
	inCode(key: string): { key: string; code: string; line: number } | undefined {
		for (const [at, written] of Object.entries(this.result?.code ?? {})) {
			if (key === at || key.startsWith(`${at}.`) || key.startsWith(`${at}[`)) {
				return { key: at, ...written };
			}
		}
		return undefined;
	}

	codeOf(key: string): { code: string; line: number } | undefined {
		return this.result?.code[key];
	}

	/** The elements of a list of configs, like the wheels. */
	elements(key: string): ConfigElement[] {
		return (this.result?.values[key] as ConfigElement[] | undefined) ?? [];
	}

	/** Where a config starts in `lib/main.dart`, from 1, when it is written. */
	line(key: string): number | undefined {
		return this.result?.lines[key] ?? this.inCode(key)?.line;
	}

	/**
	 * Changes a setting. Its default takes it out again instead, so `lib/main.dart` only says
	 * what is different. A config that is there or not is made with the settings it is given,
	 * like a steering wheel with its name.
	 */
	set(key: string, value: ConfigValue | Record<string, ConfigValue>): Promise<void> {
		const field = this.field(key);
		if (!field) return Promise.resolve();
		if (field.type === 'section') {
			this.shown(key, true);
			return this.run(configCommands.set(key, JSON.stringify(value)), key);
		}
		const plain = value as ConfigValue;
		if (!field.required && same(plain, field.default)) return this.unset(key);
		this.shown(key, plain);
		this.showLive(key);
		return this.run(configCommands.set(key, configText(field, plain)), key);
	}

	/** Takes a setting out, so SmartifyOS's own default is used. */
	unset(key: string): Promise<void> {
		if (!this.isSet(key)) return Promise.resolve();
		this.shown(key, undefined);
		this.showLive(key);
		return this.run(configCommands.unset(key), key);
	}

	/** Puts an element at the end of a list: an object of settings, or an id. */
	add(key: string, value: Record<string, ConfigValue> | string): Promise<void> {
		const text = typeof value === 'string' ? value : JSON.stringify(value);
		return this.run(configCommands.add(key, text), key);
	}

	/** Takes the element at `index` out of a list. */
	remove(key: string, index: number): Promise<void> {
		return this.run(configCommands.remove(`${key}[${index}]`), key);
	}

	/** Takes an id out of a list of ids. */
	removeId(key: string, id: string): Promise<void> {
		const ids = this.value<string[]>(key);
		this.shown(
			key,
			ids.filter((known) => known !== id)
		);
		this.showLive(key);
		return this.run(configCommands.removeId(key, id), key);
	}

	/** Puts an id into a list of ids, at the end. */
	addId(key: string, id: string): Promise<void> {
		const ids = this.value<string[]>(key);
		if (ids.includes(id)) return Promise.resolve();
		this.shown(key, [...ids, id]);
		this.showLive(key);
		return this.run(configCommands.add(key, id), key);
	}

	/** Moves an element of a list, or an id in a list of ids, to another place. */
	move(key: string, from: number, to: number): Promise<void> {
		const list = (this.value<ConfigValue>(key) ?? []) as (ConfigElement | string)[];
		if (to < 0 || to >= list.length || from === to) return Promise.resolve();
		const moved = [...list];
		moved.splice(to, 0, ...moved.splice(from, 1));
		this.shown(key, moved as ConfigValue);
		this.showLive(key);
		return this.run(configCommands.move(`${key}[${from}]`, to), key);
	}

	/**
	 * Puts what a setup page is about on screen in the running app, a settings page say. Right
	 * after a restart the app is still setting itself up, so it is asked again for a while.
	 */
	async showArea(area: SetupArea, { afterRestart = false } = {}): Promise<void> {
		const target = areaInfo(area).show;
		if (!target) return;
		for (let attempt = 0; attempt < (afterRestart ? 30 : 1); attempt++) {
			if (editor.preview.status !== 'running') return;
			if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 300));
			if ((await editor.callApp('show', { ...target })).ok) return;
		}
	}

	/** Internal: what the inspector shows until the CLI says what it wrote. */
	private shown(key: string, value: ConfigValue | undefined): void {
		if (!this.result) return;
		const values = { ...this.result.values };
		const element = elementKey(key);
		if (element) {
			const list = [...this.elements(element.list)];
			const old = list[element.index];
			if (!old) return;
			const inside = { ...old.values };
			if (value === undefined) delete inside[element.name];
			else inside[element.name] = value;
			list[element.index] = { ...old, values: inside };
			values[element.list] = list;
		} else if (value === undefined) delete values[key];
		else values[key] = value;
		this.result = { ...this.result, values };
	}

	/**
	 * Shows a value in the running app without writing it, while a slider is dragged, when the
	 * app can take it at once.
	 */
	preview(key: string, value: ConfigValue): void {
		const kind = liveConfig(key);
		if (kind && this.canChangeLive(kind)) {
			void editor.callApp('configure', this.liveParams(kind, { [key]: value }));
		}
	}

	/** Internal: whether the running app can take a whole config of this kind at once. */
	private canChangeLive(kind: LiveConfig): boolean {
		if (editor.preview.status !== 'running' || !look.app?.live?.includes(kind)) return false;
		// The app's own values written as code are not in what the editor could send.
		return !(kind === 'infoDisplay' && this.inCode('infoDisplay.values'));
	}

	/** Internal: hands the running app what a key belongs to, as the inspector shows it now. */
	private showLive(key: string): void {
		const kind = liveConfig(key);
		if (kind && this.canChangeLive(kind)) {
			void editor.callApp('configure', this.liveParams(kind));
		}
	}

	/** Internal: what `configure` takes for a whole config, with values not written yet in it. */
	private liveParams(
		kind: LiveConfig,
		instead: Record<string, ConfigValue> = {}
	): Record<string, string> {
		const value = (key: string) => (key in instead ? instead[key] : this.value(key));
		if (kind === 'model3D') {
			const model = 'car.model3D';
			return {
				model3D: JSON.stringify({
					scale: value(`${model}.scale`),
					lookAtHeight: value(`${model}.lookAtHeight`),
					offset: value(`${model}.offset`),
					rotation: value(`${model}.rotation`),
					render: {
						exposure: value(`${model}.render.exposure`),
						environmentIntensity: value(`${model}.render.environmentIntensity`),
						vignette: value(`${model}.render.vignette`)
					}
				})
			};
		}
		const plain = (key: string) =>
			this.elements(key)
				.filter((element) => !element.asCode)
				.map((element) => element.values);
		return {
			infoDisplay: JSON.stringify({
				values: plain('infoDisplay.values'),
				views: plain('infoDisplay.views'),
				hiddenValues: value('infoDisplay.hiddenValues')
			})
		};
	}

	/** Internal: one change at a time, the running app restarted once they are all written. */
	private run(args: string[], key?: string): Promise<void> {
		this.writing++;
		const step = this.queue.then(async () => {
			const result: ResultEvent = await editor.runCli(args);
			if (result.ok) {
				const data = result.data as ConfigResult;
				this.result = data;
				this.problem = undefined;
				this.manual = data.manual;
				// What the running app took at once needs no restart, the rest does.
				const kind = key ? liveConfig(key) : undefined;
				if (data.changed && kind && this.canChangeLive(kind)) {
					const reply = await editor.callApp('configure', this.liveParams(kind));
					this.restartDue ||= !reply.ok;
				} else this.restartDue ||= data.changed;
			} else {
				this.problem = [result.error.message, result.error.hint].filter(Boolean).join(' ');
			}
		});
		this.queue = step.finally(async () => {
			this.writing--;
			if (this.writing > 0) return;
			if (this.problem) await this.read();
			if (this.restartDue && editor.preview.status === 'running') {
				this.restartDue = false;
				await editor.restart();
				// The page being changed is shown again, as it is now.
				const picked = editor.selection;
				if (picked.kind === 'setup') await this.showArea(picked.area, { afterRestart: true });
			}
		});
		return step;
	}
}

/** The configs the running app can take as a whole while it runs (`live` in `describe`). */
type LiveConfig = 'model3D' | 'infoDisplay';

/** Internal: which config of the running app a key changes, when it can take it at once. */
function liveConfig(key: string): LiveConfig | undefined {
	const model =
		/^car\.model3D\.(scale|lookAtHeight|offset|rotation|render\.(exposure|environmentIntensity|vignette))$/;
	if (model.test(key)) return 'model3D';
	if (/^infoDisplay\.(values|views|hiddenValues)(\[|$)/.test(key)) return 'infoDisplay';
	return undefined;
}

/** Internal: a key of one setting of an element of a list, as its parts. */
function elementKey(key: string): { list: string; index: number; name: string } | undefined {
	const match = /^(.+)\[(\d+)\]\.(\w+)$/.exec(key);
	return match
		? { list: match[1] as string, index: Number(match[2]), name: match[3] as string }
		: undefined;
}

/** Internal: whether two values are the same, for telling a default apart. */
function same(a: ConfigValue, b: ConfigValue): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * A value the way the CLI takes it typed: `on`, `500ms`, `0,180,0`, `1024x600`, `none`, or JSON
 * for lists and configs.
 */
export function configText(field: ConfigField, value: ConfigValue): string {
	if (value === null) return 'none';
	switch (field.type) {
		case 'bool':
			return value ? 'on' : 'off';
		case 'duration':
			return `${value}ms`;
		case 'offset3d': {
			const { x, y, z } = value as { x: number; y: number; z: number };
			return `${x},${y},${z}`;
		}
		case 'size': {
			const { width, height } = value as { width: number; height: number };
			return `${width}x${height}`;
		}
		case 'ids':
		case 'list':
		case 'section':
			return JSON.stringify(value);
		default:
			return String(value);
	}
}

export const config = new Config();
