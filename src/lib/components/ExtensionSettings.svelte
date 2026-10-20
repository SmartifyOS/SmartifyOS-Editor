<script lang="ts">
	import LoaderCircle from '~icons/lucide/loader-circle';
	import VsCode from '~icons/logos/visual-studio-code';
	import { codeWords, firstSentence, plainDoc } from '#lib/codeNames.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import { extensionSettings } from '#lib/state/extensionSettings.svelte.ts';
	import CollectionSetting from './CollectionSetting.svelte';
	import ObjectSetting from './ObjectSetting.svelte';
	import ConfigField from './setup/ConfigField.svelte';
	import Fold from './setup/Fold.svelte';
	import Button from './ui/Button.svelte';

	/**
	 * An extension's settings in its inspector: what its class takes in `lib/main.dart`, read from
	 * the extension's own code, with its doc comments as the explanations. One with settings of its
	 * own is folded away until it is opened. The ones only code can give (a list of the car's own
	 * commands, say) are listed apart.
	 */
	let { name }: { name: string } = $props();

	const store = $derived(extensionSettings(name));
	const result = $derived(store.result);
	$effect(() => {
		void store.read();
	});

	/** Settings with settings or items of their own, each folded away until it is opened. */
	const folded = ['object', 'array', 'map'];
	const simple = $derived(
		result?.fields.filter((field) => field.type !== 'code' && !folded.includes(field.type)) ?? []
	);
	const objects = $derived(result?.fields.filter((field) => folded.includes(field.type)) ?? []);
	const codeOnly = $derived(result?.fields.filter((field) => field.type === 'code') ?? []);
</script>

{#if !result}
	{#if store.problem}
		<p class="text-[13px] text-muted">{store.problem}</p>
	{:else}
		<p class="flex items-center gap-2 text-[13px] text-muted">
			<LoaderCircle class="size-3.5 animate-spin" /> Reading its settings
		</p>
	{/if}
{:else if result.fields.length === 0}
	<p class="text-[13px] text-muted">It has no settings.</p>
{:else if !result.switchedOn}
	<p class="text-[13px] text-muted">
		It is not switched on in lib/main.dart, which is where its settings go.
	</p>
{:else}
	{#if simple.length > 0 || objects.length > 0}
		<Fold id={`extension.${name}.settings`} title="Settings">
			<div class="flex flex-col gap-3">
				{#each simple as field (field.key)}
					<ConfigField
						{store}
						spec={{ key: field.key, label: codeWords(field.key), hint: plainDoc(field.describe) }}
					/>
				{/each}
				{#if objects.length > 0}
					<div class="flex flex-col gap-1.5">
						{#each objects as field (field.key)}
							{#if field.type === 'object'}
								<ObjectSetting
									{store}
									key={field.key}
									{field}
									summary={result.code[field.key]?.code.replace(/\s+/g, ' ')}
								/>
							{:else}
								<CollectionSetting
									{store}
									key={field.key}
									{field}
									written={result.code[field.key]?.code}
								/>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		</Fold>
	{/if}
	{#if codeOnly.length > 0}
		<Fold id={`extension.${name}.code`} title="Only in code" closed>
			<div class="flex flex-col gap-2.5">
				<p class="text-xs text-faint">
					These take something only code can give. Write them in lib/main.dart.
				</p>
				{#each codeOnly as field (field.key)}
					{@const written = result.code[field.key]}
					<div class="flex flex-col gap-0.5">
						<div class="flex items-baseline gap-2">
							<span class="text-[13px]">{codeWords(field.key)}</span>
							{#if written}
								<code class="min-w-0 flex-1 truncate font-mono text-xs text-muted"
									>{written.code}</code
								>
							{:else}
								<span class="text-xs text-faint">not set</span>
							{/if}
						</div>
						{#if field.describe}
							<p class="text-xs text-faint">{firstSentence(plainDoc(field.describe) ?? '')}</p>
						{/if}
					</div>
				{/each}
				<Button
					size="sm"
					class="w-full justify-start"
					onclick={() => editor.openInVsCode(undefined, 'lib/main.dart', result.line ?? undefined)}
				>
					<VsCode /> Open it in VS Code
				</Button>
			</div>
		</Fold>
	{/if}
	{#if store.problem}
		<p class="text-[13px] text-bad">{store.problem}</p>
	{/if}
{/if}
