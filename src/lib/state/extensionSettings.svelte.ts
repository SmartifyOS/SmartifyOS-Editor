import type {
	ConfigField,
	ConfigValue,
	ExtensionSettingsResult,
	ResultEvent
} from '../../../shared/cli.ts';
import { extensionSettingsCommands } from '../commands.ts';
import { configText, type SettingsStore } from './config.svelte.ts';
import { editor } from './editor.svelte.ts';

/**
 * The settings of one extension, the arguments its class takes in `lib/main.dart`, as its
 * inspector edits them through the CLI's `extension settings`. Like the car's own settings, a
 * change shows at once, is written one at a time, and the running app is restarted once every
 * change waiting has been written.
 */
class ExtensionSettings implements SettingsStore {
	result = $state<ExtensionSettingsResult | undefined>();
	problem = $state<string | undefined>();
	writing = $state(0);

	private queue: Promise<unknown> = Promise.resolve();
	private restartDue = false;

	constructor(readonly name: string) {}

	async read(): Promise<void> {
		if (this.writing > 0) return;
		const result = await editor.queryCli(extensionSettingsCommands.read(this.name));
		if (this.writing > 0) return;
		if (result?.ok) {
			this.result = result.data as ExtensionSettingsResult;
			this.problem = undefined;
		} else {
			this.result = undefined;
			this.problem = result?.ok === false ? result.error.message : undefined;
		}
	}

	field(key: string): ConfigField | undefined {
		return this.result?.fields.find((field) => field.key === key);
	}

	value<T extends ConfigValue>(key: string): T {
		const written = this.result?.values[key];
		return (written !== undefined ? written : (this.field(key)?.default ?? null)) as T;
	}

	isSet(key: string): boolean {
		return this.result?.values[key] !== undefined;
	}

	codeOf(key: string): { code: string; line: number } | undefined {
		return this.result?.code[key];
	}

	set(key: string, value: ConfigValue): Promise<void> {
		const field = this.field(key);
		if (!field) return Promise.resolve();
		if (!field.required && JSON.stringify(value) === JSON.stringify(field.default)) {
			return this.unset(key);
		}
		this.shown(key, value);
		return this.run(extensionSettingsCommands.set(this.name, key, configText(field, value)));
	}

	unset(key: string): Promise<void> {
		if (!this.isSet(key)) return Promise.resolve();
		this.shown(key, undefined);
		return this.run(extensionSettingsCommands.unset(this.name, key));
	}

	addId(key: string, id: string): Promise<void> {
		const ids = this.value<string[]>(key) ?? [];
		if (ids.includes(id)) return Promise.resolve();
		this.shown(key, [...ids, id]);
		return this.run(extensionSettingsCommands.add(this.name, key, id));
	}

	removeId(key: string, id: string): Promise<void> {
		this.shown(
			key,
			(this.value<string[]>(key) ?? []).filter((known) => known !== id)
		);
		return this.run(extensionSettingsCommands.remove(this.name, key, id));
	}

	/** Internal: what the inspector shows until the CLI says what it wrote. */
	private shown(key: string, value: ConfigValue | undefined): void {
		if (!this.result) return;
		const values = { ...this.result.values };
		if (value === undefined) delete values[key];
		else values[key] = value;
		this.result = { ...this.result, values };
	}

	/** Internal: one change at a time, the running app restarted once they are all written. */
	private run(args: string[]): Promise<void> {
		this.writing++;
		const step = this.queue.then(async () => {
			const result: ResultEvent = await editor.runCli(args);
			if (result.ok) {
				const data = result.data as ExtensionSettingsResult;
				this.result = data;
				this.problem = undefined;
				this.restartDue ||= data.changed;
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
