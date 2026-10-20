<script lang="ts">
	import ChevronRight from '~icons/lucide/chevron-right';
	import X from '~icons/lucide/x';
	import { untrack } from 'svelte';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import type { ConfigField as Setting, ConfigValue, SettingDetail } from '../../../shared/cli.ts';
	import { codeWords, firstSentence, plainDoc } from '#lib/codeNames.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import type { ExtensionSettings } from '#lib/state/extensionSettings.svelte.ts';
	import CollectionSetting from './CollectionSetting.svelte';
	import ObjectSetting from './ObjectSetting.svelte';
	import CodeNote from './setup/CodeNote.svelte';
	import ConfigField from './setup/ConfigField.svelte';
	import Button from './ui/Button.svelte';
	import NumberField from './ui/NumberField.svelte';
	import Select from './ui/Select.svelte';
	import TextField from './ui/TextField.svelte';

	/**
	 * A setting of an extension's that has settings of its own (`aiServer`), folded away until it
	 * is opened, and only then asked about. Open, it picks how it is made (one of its ready-made
	 * ones, or one of its constructors) and shows the settings that one takes, those with settings
	 * of their own folded away in turn.
	 */
	let {
		store,
		key,
		field,
		summary,
		label,
		onremove,
		startOpen = false
	}: {
		store: ExtensionSettings;
		/** Its key, `aiServer`, `voices[de]`, or one inside another. */
		key: string;
		field: Setting;
		/** What is written for it, in a line, undefined when nothing is. */
		summary: string | undefined;
		/** What it is called, when not its name in code: an item's key. */
		label?: string;
		/** Takes it out, for an item of a list or map, which is not set or unset but there or not. */
		onremove?: () => void;
		/** Open from the start, for an item just added to pick what it is. */
		startOpen?: boolean;
	} = $props();

	// Only where it starts: opening and closing it is up to the driver after that.
	let open = $state(untrack(() => startOpen));
	const detail = $derived(
		store.details[key]?.kind === 'object' ? (store.details[key] as SettingDetail) : undefined
	);
	const written = $derived(detail?.written ?? null);
	const canWrite = $derived(editor.cli?.found === true && store.writing === 0);

	/** Asked about once, the first time it is open. */
	let asked = false;
	$effect(() => {
		if (open && !asked) {
			asked = true;
			void store.describe(key);
		}
	});

	/** The constructor picked whose required settings are still being filled in. */
	let pending = $state<string | undefined>();
	let drafts = $state<Record<string, ConfigValue>>({});

	const none = '';
	const choice = $derived.by(() => {
		if (pending !== undefined) return `m:${pending}`;
		if (!written) return none;
		if (written.kind === 'made') return `m:${written.making}`;
		if (written.kind === 'constant') return `c:${written.name}`;
		return 'code';
	});

	const options = $derived.by(() => {
		if (!detail) return [];
		const own = (name: string) => (name ? codeWords(name) : codeWords(detail.className));
		return [
			// An item of a list or map is there or not, so it has no "not set".
			...(onremove
				? []
				: [
						{
							value: none,
							label: field.defaultCode
								? `Its default, ${defaultName(field.defaultCode)}`
								: 'Not set'
						}
					]),
			...detail.constants.map((name) => ({
				value: `c:${name}`,
				label: codeWords(name.split('.').pop() ?? name)
			})),
			...detail.makings.map((making) => ({ value: `m:${making.name}`, label: own(making.name) })),
			...(written?.kind === 'code' ? [{ value: 'code', label: 'Written as code' }] : [])
		];
	});

	/**
	 * What an object is made as, said: `AndroidAutoWirelessNetwork.existing(...)` is "Existing",
	 * `SpeechModels.whisperBase` "Whisper base", `VoiceAiServer(...)` "Voice AI server".
	 */
	function defaultName(code: string): string {
		const text = code.replace(/^const\s+/, '');
		const name = /^\w+\.(\w+)/.exec(text)?.[1] ?? /^(\w+)\s*\(/.exec(text)?.[1];
		return name ? codeWords(name) : text;
	}

	function pick(value: string) {
		pending = undefined;
		drafts = {};
		if (value === none) return void store.unset(key);
		if (value.startsWith('c:')) return void store.make(key, value.slice(2));
		if (!value.startsWith('m:') || !detail) return;
		const making = detail.makings.find((known) => known.name === value.slice(2));
		if (!making) return;
		if (making.fields.some((inner) => inner.required)) pending = making.name;
		else void store.make(key, { $making: making.name });
	}

	const pendingFields = $derived(
		detail?.makings.find((making) => making.name === pending)?.fields.filter((f) => f.required) ??
			[]
	);
	const ready = $derived(
		pendingFields.every((inner) => drafts[inner.key] !== undefined && drafts[inner.key] !== '')
	);

	function finish() {
		if (pending === undefined || !ready) return;
		void store.make(key, { $making: pending, ...drafts });
		pending = undefined;
		drafts = {};
	}

	const madeFields = $derived(
		written?.kind === 'made'
			? (detail?.makings.find((making) => making.name === written.making)?.fields ?? [])
			: []
	);
</script>

<div class="flex flex-col rounded-control border border-line">
	<div class="flex items-center">
		<button
			type="button"
			aria-expanded={open}
			class="flex min-h-9 min-w-0 flex-1 cursor-default items-center gap-2 px-2.5 text-left outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-primary/70"
			onclick={() => (open = !open)}
		>
			<ChevronRight
				class={[
					'size-3.5 shrink-0 text-faint transition-transform duration-150',
					open && 'rotate-90'
				]}
			/>
			<span class={['shrink-0 text-[13px]', summary ? 'text-fg' : 'text-muted']}
				>{label ?? codeWords(field.key)}</span
			>
			<span class="min-w-0 flex-1 truncate text-right font-mono text-xs text-faint">
				{summary ? defaultName(summary) : field.defaultCode ? 'default' : 'not set'}
			</span>
		</button>
		{#if onremove}
			<Button
				variant="ghost-muted"
				size="icon-sm"
				class="mr-0.5 size-7!"
				label="Take it out"
				disabled={!canWrite}
				onclick={onremove}
			>
				<X />
			</Button>
		{/if}
	</div>

	{#if open}
		<div class="flex flex-col gap-2.5 border-t border-line p-2.5">
			{#if plainDoc(field.describe)}
				<p class="text-xs text-faint">{firstSentence(plainDoc(field.describe) ?? '')}</p>
			{/if}
			{#if !detail}
				<p class="flex items-center gap-2 text-xs text-muted">
					<LoaderCircle class="size-3.5 animate-spin" /> Reading it
				</p>
			{:else}
				<Select
					class="w-full"
					title={label ?? codeWords(field.key)}
					{options}
					bind:value={() => choice, pick}
				/>

				{#if pending !== undefined}
					<div class="flex flex-col gap-2">
						<p class="text-xs text-faint">It needs these before it can be used.</p>
						{#each pendingFields as inner (inner.key)}
							<label class="flex flex-col gap-1">
								<span class="text-xs text-muted">{codeWords(inner.key)}</span>
								{#if inner.type === 'number' || inner.type === 'integer'}
									<NumberField
										value={(drafts[inner.key] as number | undefined) ?? null}
										integer={inner.type === 'integer'}
										optional
										label={codeWords(inner.key)}
										onchange={(next) => (drafts[inner.key] = next)}
									/>
								{:else if inner.type === 'enum'}
									<Select
										class="w-full"
										options={(inner.values ?? []).map((value) => ({ value, label: value }))}
										bind:value={
											() => String(drafts[inner.key] ?? inner.values?.[0] ?? ''),
											(next) => (drafts[inner.key] = next)
										}
									/>
								{:else}
									<TextField
										value={String(drafts[inner.key] ?? '')}
										label={codeWords(inner.key)}
										onchange={(next) => (drafts[inner.key] = next.trim())}
									/>
								{/if}
							</label>
						{/each}
						<div class="flex gap-1.5">
							<Button size="sm" variant="primary" disabled={!ready || !canWrite} onclick={finish}>
								Use it
							</Button>
							<Button size="sm" onclick={() => (pending = undefined)}>Leave it</Button>
						</div>
					</div>
				{:else if written?.kind === 'code'}
					<CodeNote text="Written as code:" code={written.code} line={written.line} />
				{:else if written?.kind === 'made'}
					{#each madeFields as inner (inner.key)}
						{@const innerKey = `${key}.${inner.key}`}
						{#if inner.type === 'object'}
							<ObjectSetting
								{store}
								key={innerKey}
								field={inner}
								summary={written.code[inner.key]?.code.replace(/\s+/g, ' ')}
							/>
						{:else if inner.type === 'array' || inner.type === 'map'}
							<CollectionSetting
								{store}
								key={innerKey}
								field={inner}
								written={written.code[inner.key]?.code}
							/>
						{:else if inner.type === 'code'}
							{#if written.code[inner.key]}
								<div class="flex items-baseline gap-2">
									<span class="text-[13px] text-muted">{codeWords(inner.key)}</span>
									<code class="min-w-0 flex-1 truncate font-mono text-xs text-faint"
										>{written.code[inner.key]?.code}</code
									>
								</div>
							{/if}
						{:else}
							<ConfigField
								{store}
								spec={{
									key: innerKey,
									label: codeWords(inner.key),
									hint: plainDoc(inner.describe)
								}}
							/>
						{/if}
					{/each}
				{/if}
			{/if}
		</div>
	{/if}
</div>
