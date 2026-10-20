<script lang="ts">
	import LoaderCircle from '~icons/lucide/loader-circle';
	import VsCode from '~icons/logos/visual-studio-code';
	import { editor } from '#lib/state/editor.svelte.ts';
	import { extensionSettings } from '#lib/state/extensionSettings.svelte.ts';
	import ConfigField from './setup/ConfigField.svelte';
	import Fold from './setup/Fold.svelte';
	import Button from './ui/Button.svelte';

	/**
	 * An extension's settings in its inspector: what its class takes in `lib/main.dart`, read from
	 * the extension's own code, with its doc comments as the explanations. The ones only code can
	 * give (a list of the car's own commands, say) are listed apart.
	 */
	let { name }: { name: string } = $props();

	const store = $derived(extensionSettings(name));
	const result = $derived(store.result);
	$effect(() => {
		void store.read();
	});

	const simple = $derived(result?.fields.filter((field) => field.type !== 'code') ?? []);
	const codeOnly = $derived(result?.fields.filter((field) => field.type === 'code') ?? []);

	/** A name in code as words: `wakeWordSpellings` is "Wake word spellings". */
	function words(key: string): string {
		const spaced = key
			.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
			.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
			.toLowerCase();
		const upper = new Set(['ai', 'id', 'ids', 'url', 'usb', 'gps', 'can', 'wifi', 'ui']);
		const said = spaced
			.split(' ')
			.map((word) => (upper.has(word) ? word.toUpperCase() : word))
			.join(' ');
		return said.charAt(0).toUpperCase() + said.slice(1);
	}

	/** A doc comment as plain text, its code in backticks said like the rest. */
	function plain(doc: string): string | undefined {
		return doc.replaceAll('`', '') || undefined;
	}

	/** The first sentence of a doc comment, for a line under a name. */
	function firstSentence(text: string): string {
		return /^[\s\S]+?[.!?](?=\s|$)/.exec(text)?.[0] ?? text;
	}
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
	{#if simple.length > 0}
		<Fold id={`extension.${name}.settings`} title="Settings">
			<div class="flex flex-col gap-3">
				{#each simple as field (field.key)}
					<ConfigField
						{store}
						spec={{ key: field.key, label: words(field.key), hint: plain(field.describe) }}
					/>
				{/each}
			</div>
		</Fold>
	{/if}
	{#if codeOnly.length > 0}
		<Fold id={`extension.${name}.code`} title="Only in code" closed={simple.length > 0}>
			<div class="flex flex-col gap-2.5">
				<p class="text-xs text-faint">
					These take something only code can give. Write them in lib/main.dart.
				</p>
				{#each codeOnly as field (field.key)}
					{@const written = result.code[field.key]}
					<div class="flex flex-col gap-0.5">
						<div class="flex items-baseline gap-2">
							<span class="text-[13px]">{words(field.key)}</span>
							{#if written}
								<code class="min-w-0 flex-1 truncate font-mono text-xs text-muted"
									>{written.code}</code
								>
							{:else}
								<span class="text-xs text-faint">not set</span>
							{/if}
						</div>
						{#if field.describe}
							<p class="text-xs text-faint">{firstSentence(plain(field.describe) ?? '')}</p>
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
