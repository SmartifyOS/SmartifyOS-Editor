import type {
	CollectionDetail,
	ConfigField,
	ConfigValue,
	ExtensionSettingsResult,
	ResultEvent,
	SettingDetail
} from '../../../shared/cli.ts';
import { extensionSettingsCommands } from '../commands.ts';
import { configText, type SettingsStore } from './config.svelte.ts';
import { editor } from './editor.svelte.ts';

/**
 * The settings of one extension, the arguments its class takes in `lib/main.dart`, as its
 * inspector edits them through the CLI's `extension settings`. Like the car's own settings, a
 * change shows at once, is written one at a time, and the running app is restarted once every
 * change waiting has been written.
 *
 * A setting with settings of its own (`aiServer`), and a list or map setting (`voices`), is only
 * asked about once it is opened (`describe`). What is inside is named by keys: `aiServer.url`
 * for a setting of an object, `voices[de]` for an item of a list or map.
 */
class ExtensionSettings implements SettingsStore {
	result = $state<ExtensionSettingsResult | undefined>();
	/** Every setting with settings or items of its own that was opened, by its key. */
	details = $state<Record<string, SettingDetail | CollectionDetail>>({});
	problem = $state<string | undefined>();
	writing = $state(0);

	private queue: Promise<unknown> = Promise.resolve();
	/** Changes shown at once that are still waiting to be written, oldest first. */
	private waiting: Waiting[] = [];
	private restartDue = false;

	constructor(readonly name: string) {}

	async read(): Promise<void> {
		if (this.writing > 0) return;
		const result = await editor.queryCli(extensionSettingsCommands.read(this.name));
		if (this.writing > 0) return;
		if (result?.ok) {
			this.result = result.data as ExtensionSettingsResult;
			this.problem = undefined;
			await this.refreshDetails();
		} else {
			this.result = undefined;
			this.problem = result?.ok === false ? result.error.message : undefined;
		}
	}

	/** Asks what a setting with settings or items of its own is, and what the app gives it. */
	async describe(key: string): Promise<void> {
		const result = await editor.queryCli(extensionSettingsCommands.describe(this.name, key));
		if (result?.ok) {
			const { detail } = result.data as { detail: SettingDetail | CollectionDetail };
			this.details = { ...this.details, [key]: detail };
		} else {
			const { [key]: _gone, ...rest } = this.details;
			this.details = rest;
		}
	}

	/** Internal: asks again about every setting that is open, after a change. */
	private async refreshDetails(): Promise<void> {
		await Promise.all(Object.keys(this.details).map((key) => this.describe(key)));
	}

	/**
	 * Internal: a key as what it is inside of: a setting of an object (`aiServer.url`), an item of
	 * a list or map (`voices[de]`), or neither.
	 */
	private where(
		key: string
	):
		| { kind: 'setting'; parent: string; name: string; detail?: SettingDetail }
		| { kind: 'item'; parent: string; item: string; detail?: CollectionDetail }
		| undefined {
		const item = /^(.+)\[([^\]]*)\]$/.exec(key);
		if (item) {
			const detail = this.details[item[1] as string];
			return {
				kind: 'item',
				parent: item[1] as string,
				item: item[2] as string,
				detail: detail?.kind === 'collection' ? detail : undefined
			};
		}
		const at = key.lastIndexOf('.');
		if (at === -1) return undefined;
		const parent = key.slice(0, at);
		const detail = this.details[parent];
		return {
			kind: 'setting',
			parent,
			name: key.slice(at + 1),
			detail: detail?.kind === 'object' ? detail : undefined
		};
	}

	field(key: string): ConfigField | undefined {
		const at = this.where(key);
		if (!at) return this.result?.fields.find((field) => field.key === key);
		if (at.kind === 'item') return at.detail ? { ...at.detail.item, key: at.item } : undefined;
		const written = at.detail?.written;
		const making = written?.kind === 'made' ? written.making : undefined;
		return at.detail?.makings
			.find((known) => known.name === making)
			?.fields.find((field) => field.key === at.name);
	}

	/** Internal: what is written for a key and can be read, undefined when nothing is. */
	private written(key: string): ConfigValue | undefined {
		const at = this.where(key);
		if (!at) return this.result?.values[key];
		if (at.kind === 'item') return at.detail?.entries.find((entry) => entry.key === at.item)?.value;
		const written = at.detail?.written;
		return written?.kind === 'made' ? written.values[at.name] : undefined;
	}

	value<T extends ConfigValue>(key: string): T {
		const written = this.written(key);
		return (written !== undefined ? written : (this.field(key)?.default ?? null)) as T;
	}

	isSet(key: string): boolean {
		return this.written(key) !== undefined;
	}

	codeOf(key: string): { code: string; line: number } | undefined {
		const at = this.where(key);
		if (!at) return this.result?.code[key];
		if (at.kind === 'item') {
			const entry = at.detail?.entries.find((known) => known.key === at.item);
			return entry?.code !== undefined ? { code: entry.code, line: entry.line } : undefined;
		}
		const written = at.detail?.written;
		return written?.kind === 'made' ? written.code[at.name] : undefined;
	}

	set(key: string, value: ConfigValue): Promise<void> {
		const field = this.field(key);
		if (!field) return Promise.resolve();
		const item = this.where(key)?.kind === 'item';
		if (!item && !field.required && JSON.stringify(value) === JSON.stringify(field.default)) {
			return this.unset(key);
		}
		const shown = this.shown(key, value);
		return this.run(extensionSettingsCommands.set(this.name, key, configText(field, value)), shown);
	}

	/**
	 * Makes a setting with settings of its own, or an item of a list or map: one of its
	 * ready-made ones (`SpeechModels.parakeet`), or with one of its constructors and what that
	 * has to be given.
	 */
	make(key: string, how: string | Record<string, ConfigValue>): Promise<void> {
		const text = typeof how === 'string' ? how : JSON.stringify(how);
		return this.run(extensionSettingsCommands.set(this.name, key, text));
	}

	/** Takes a setting out, so its default is used, or an item out of its list or map. */
	unset(key: string): Promise<void> {
		const field = this.field(key);
		const container = ['object', 'array', 'map'].includes(field?.type ?? '');
		if (!this.isSet(key) && !container && !this.codeOf(key)) return Promise.resolve();
		const shown = this.shown(key, undefined);
		return this.run(extensionSettingsCommands.unset(this.name, key), shown);
	}

	addId(key: string, id: string): Promise<void> {
		const ids = this.value<string[]>(key) ?? [];
		if (ids.includes(id)) return Promise.resolve();
		const shown = this.shown(key, [...ids, id]);
		return this.run(extensionSettingsCommands.add(this.name, key, id), shown);
	}

	removeId(key: string, id: string): Promise<void> {
		const shown = this.shown(
			key,
			(this.value<string[]>(key) ?? []).filter((known) => known !== id)
		);
		return this.run(extensionSettingsCommands.remove(this.name, key, id), shown);
	}

	/**
	 * Internal: shows a change at once, and keeps showing it over whatever the CLI says until
	 * its own write is done, so a change made while another is being written never flickers back.
	 */
	private shown(key: string, value: ConfigValue | undefined): Waiting {
		const waiting = { key, value };
		this.waiting.push(waiting);
		this.apply(key, value);
		return waiting;
	}

	/** Internal: every change shown that is still waiting to be written, again. */
	private applyWaiting(): void {
		for (const { key, value } of this.waiting) this.apply(key, value);
	}

	/** Internal: what the inspector shows until the CLI says what it wrote. */
	private apply(key: string, value: ConfigValue | undefined): void {
		const at = this.where(key);
		if (at?.kind === 'item' && at.detail) {
			const entries = at.detail.entries
				.map((entry) => (entry.key === at.item ? { ...entry, value } : entry))
				.filter((entry) => value !== undefined || entry.key !== at.item);
			this.details = { ...this.details, [at.parent]: { ...at.detail, entries } };
			return;
		}
		if (at?.kind === 'setting' && at.detail?.written?.kind === 'made') {
			const written = at.detail.written;
			const values = { ...written.values };
			if (value === undefined) delete values[at.name];
			else values[at.name] = value;
			this.details = {
				...this.details,
				[at.parent]: { ...at.detail, written: { ...written, values } }
			};
			return;
		}
		if (at || !this.result) return;
		const values = { ...this.result.values };
		if (value === undefined) delete values[key];
		else values[key] = value;
		this.result = { ...this.result, values };
	}

	/** Internal: one change at a time, the running app restarted once they are all written. */
	private run(args: string[], shown?: Waiting): Promise<void> {
		this.writing++;
		const step = this.queue.then(async () => {
			const result: ResultEvent = await editor.runCli(args);
			this.waiting = this.waiting.filter((waiting) => waiting !== shown);
			if (result.ok) {
				const data = result.data as ExtensionSettingsResult;
				this.result = data;
				this.problem = undefined;
				this.restartDue ||= data.changed;
				await this.refreshDetails();
				this.applyWaiting();
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
			}
		});
		return step;
	}
}

const stores = new Map<string, ExtensionSettings>();

/** The settings of the extension with this package name in the open car. */
export function extensionSettings(name: string): ExtensionSettings {
	const key = `${editor.project?.path}:${name}`;
	let store = stores.get(key);
	if (!store) {
		store = new ExtensionSettings(name);
		stores.set(key, store);
	}
	return store;
}

/** Reads every extension's settings again, once `lib/main.dart` changed. */
export function rereadExtensionSettings(): void {
	for (const store of stores.values()) void store.read();
}

export type { ExtensionSettings };

/** Internal: a change shown at once, until it is written. */
interface Waiting {
	key: string;
	value: ConfigValue | undefined;
}
