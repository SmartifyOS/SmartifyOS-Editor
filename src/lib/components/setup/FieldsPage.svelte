<script lang="ts">
	import type { FoldSpec, SetupArea } from '#lib/setup.ts';
	import { ownCode } from '#lib/setup.ts';
	import { config } from '#lib/state/config.svelte.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import Switch from '../ui/Switch.svelte';
	import CodeNote from './CodeNote.svelte';
	import ConfigField from './ConfigField.svelte';
	import Fold from './Fold.svelte';

	/**
	 * A setup page that is only settings, fold after fold. A fold for a config that is there or
	 * not (the reverse camera's lines) switches it on and off in its title.
	 */
	let { area, folds }: { area: SetupArea; folds: FoldSpec[] } = $props();

	const canWrite = $derived(editor.cli?.found === true && config.result !== undefined);
</script>

{#each ownCode[area] ?? [] as own (own.key)}
	{@const written = config.result?.code[own.key]}
	{#if written}
		<CodeNote text={`Your app uses ${own.what}:`} code={written.code} line={written.line} />
	{/if}
{/each}

{#each folds as fold (fold.id)}
	{#if folds.length === 1 && !fold.section}
		<!-- A page of one part needs no title over it, the page has one. -->
		<section class="border-t border-line pt-3">{@render body(fold)}</section>
	{:else}
		<Fold id={`${area}.${fold.id}`} title={fold.title} closed={fold.closed}>
			{#snippet header()}
				{@const sectionCode = fold.section ? config.result?.code[fold.section] : undefined}
				{#if fold.section && !sectionCode && config.field(fold.section)}
					<Switch
						checked={config.value(fold.section) === true}
						label={fold.title}
						disabled={!canWrite}
						onchange={(checked) => {
							if (fold.section)
								void (checked ? config.set(fold.section, true) : config.unset(fold.section));
						}}
					/>
				{/if}
			{/snippet}
			{@render body(fold)}
		</Fold>
	{/if}
{/each}

{#snippet body(fold: FoldSpec)}
	{@const on = fold.section ? config.value(fold.section) === true : true}
	{@const sectionCode = fold.section ? config.result?.code[fold.section] : undefined}
	{#if sectionCode}
		<CodeNote text="Set up in code:" code={sectionCode.code} line={sectionCode.line} />
	{:else if !on}
		<p class="text-[13px] text-muted">{fold.off}</p>
	{:else}
		<div class="flex flex-col gap-2.5">
			{#if fold.note}<p class="text-xs text-faint">{fold.note}</p>{/if}
			{#each fold.fields as spec (spec.key)}
				{#if !spec.when || config.value(spec.when) === true}
					<ConfigField {spec} />
				{/if}
			{/each}
		</div>
	{/if}
{/snippet}
