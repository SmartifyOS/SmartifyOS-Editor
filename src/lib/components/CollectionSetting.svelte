<script lang="ts">
	import ChevronRight from '~icons/lucide/chevron-right';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import Plus from '~icons/lucide/plus';
	import X from '~icons/lucide/x';
	import type {
		CollectionDetail,
		ConfigField as Setting,
		ConfigValue
	} from '../../../shared/cli.ts';
	import { codeWords, firstSentence, plainDoc } from '#lib/codeNames.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import type { ExtensionSettings } from '#lib/state/extensionSettings.svelte.ts';
	import ObjectSetting from './ObjectSetting.svelte';
	import CodeNote from './setup/CodeNote.svelte';
	import ConfigField from './setup/ConfigField.svelte';
	import Button from './ui/Button.svelte';
	import AddField from './ui/AddField.svelte';

	/**
	 * A list or map setting of an extension's (`voices`, the voice for each language), folded away
	 * until it is opened, and only then asked about. Open, it shows each item the way a setting of
	 * its type is shown, by its key in a map or its place in a list, with a way to add one and to
	 * take each out.
	 */
	let {
		store,
		key,
		field,
		written
	}: {
		store: ExtensionSettings;
		key: string;
		field: Setting;
		/** What is written for it, in a line, undefined when nothing is. */
		written: string | undefined;
	} = $props();

	let open = $state(false);
	const detail = $derived(
		store.details[key]?.kind === 'collection' ? (store.details[key] as CollectionDetail) : undefined
	);
	const item = $derived(field.item as Setting);
	const isMap = $derived(field.type === 'map');
	const canWrite = $derived(editor.cli?.found === true && store.writing === 0);

	let asked = false;
	$effect(() => {
		if (open && !asked) {
			asked = true;
			void store.describe(key);
		}
	});

	/** Items added that are still being made: an object picks what it is first. */
	let adding = $state<string[]>([]);
	const entries = $derived(detail?.entries ?? []);
	const waiting = $derived(adding.filter((name) => !entries.some((entry) => entry.key === name)));

	/** How many there are, in a few words, for the folded row. */
	const count = $derived.by(() => {
		if (detail) {
			const n = detail.entries.length;
			return n === 0 ? 'none' : n === 1 ? '1 item' : `${n} items`;
		}
		return written ? written.replace(/\s+/g, ' ') : 'none';
	});

	/** A new item of a type that is not an object starts out as its type's plain value. */
	function blank(): ConfigValue {
		if (item.type === 'bool') return false;
		if (item.type === 'number' || item.type === 'integer' || item.type === 'duration') return 0;
		if (item.type === 'enum') return item.values?.[0] ?? '';
		if (item.type === 'color') return '#FFFFFFFF';
		return '';
	}

	function add(name: string) {
		const itemKey = `${key}[${name}]`;
		if (item.type === 'object') adding = [...adding, name];
		else void store.set(itemKey, blank());
	}
</script>

<div class="flex flex-col rounded-control border border-line">
	<button
		type="button"
		aria-expanded={open}
		class="flex min-h-9 cursor-default items-center gap-2 px-2.5 text-left outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-primary/70"
		onclick={() => (open = !open)}
	>
		<ChevronRight
			class={[
				'size-3.5 shrink-0 text-faint transition-transform duration-150',
				open && 'rotate-90'
			]}
		/>
		<span class={['shrink-0 text-[13px]', written ? 'text-fg' : 'text-muted']}
			>{codeWords(field.key)}</span
		>
		<span class="min-w-0 flex-1 truncate text-right text-xs text-faint">{count}</span>
	</button>

	{#if open}
		<div class="flex flex-col gap-2 border-t border-line p-2.5">
			{#if plainDoc(field.describe)}
				<p class="text-xs text-faint">{firstSentence(plainDoc(field.describe) ?? '')}</p>
			{/if}
			{#if !detail}
				<p class="flex items-center gap-2 text-xs text-muted">
					<LoaderCircle class="size-3.5 animate-spin" /> Reading it
				</p>
			{:else if detail.code}
				<CodeNote text="Written as code:" code={detail.code.code} line={detail.code.line} />
			{:else}
				{#each entries as entry, index (entry.key)}
					{@const itemKey = `${key}[${entry.key}]`}
					{@const name = isMap ? entry.key : `${index + 1}`}
					{#if item.type === 'object'}
						<ObjectSetting
							{store}
							key={itemKey}
							field={{ ...item, key: entry.key }}
							label={name}
							summary={entry.code?.replace(/\s+/g, ' ')}
							onremove={() => void store.unset(itemKey)}
						/>
					{:else}
						<div class="flex items-start gap-1">
							<div class="min-w-0 flex-1">
								<ConfigField {store} spec={{ key: itemKey, label: name }} />
							</div>
							<Button
								variant="ghost-muted"
								size="icon-sm"
								label="Take it out"
								disabled={!canWrite}
								onclick={() => void store.unset(itemKey)}
							>
								<X />
							</Button>
						</div>
					{/if}
				{/each}
				{#each waiting as name (name)}
					<ObjectSetting
						{store}
						key={`${key}[${name}]`}
						field={{ ...item, key: name }}
						label={isMap ? name : `${Number(name) + 1}`}
						summary={undefined}
						startOpen
						onremove={() => (adding = adding.filter((known) => known !== name))}
					/>
				{/each}

				{#if isMap}
					<AddField
						placeholder="Its name, like de"
						label={`Add to ${codeWords(field.key)}`}
						disabled={!canWrite}
						onadd={(name) => {
							if (!/[.[\]]/.test(name) && !entries.some((e) => e.key === name)) add(name);
						}}
					/>
				{:else}
					<Button
						variant="ghost-muted"
						size="sm"
						class="justify-start"
						disabled={!canWrite || waiting.length > 0}
						onclick={() => add(String(entries.length))}
					>
						<Plus /> Add one
					</Button>
				{/if}
			{/if}
		</div>
	{/if}
</div>
