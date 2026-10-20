<script lang="ts" module>
	import { remembered } from '#lib/state/remembered.svelte.ts';

	/** Which folds are open or closed, for every setup page at once, which the window remembers. */
	const folds = remembered<Record<string, boolean>>('setup.folds', {});
</script>

<script lang="ts">
	import ChevronRight from '~icons/lucide/chevron-right';
	import type { Snippet } from 'svelte';

	/**
	 * A part of a setup page under its title, folding away like a component in Unity's
	 * inspector. `header` goes at the end of the title line, a switch say.
	 */
	let {
		id,
		title,
		closed = false,
		header,
		children
	}: {
		/** What the window remembers it by. */
		id: string;
		title: string;
		/** Folded away until opened. */
		closed?: boolean;
		header?: Snippet;
		children: Snippet;
	} = $props();

	const open = $derived(folds.value[id] ?? !closed);
</script>

<section class="flex flex-col gap-2.5 border-t border-line pt-3">
	<div class="flex h-6 items-center gap-2">
		<button
			type="button"
			aria-expanded={open}
			class="-ml-1 flex min-w-0 cursor-default items-center gap-1 rounded-md py-0.5 pr-1.5 pl-1 text-xs font-medium text-faint transition-colors outline-none hover:text-muted focus-visible:ring-2 focus-visible:ring-primary/70"
			onclick={() => (folds.value = { ...folds.value, [id]: !open })}
		>
			<ChevronRight
				class={['size-3.5 shrink-0 transition-transform duration-150', open && 'rotate-90']}
			/>
			<span class="truncate">{title}</span>
		</button>
		{#if header}
			<div class="ml-auto flex items-center">{@render header()}</div>
		{/if}
	</div>
	{#if open}
		{@render children()}
	{/if}
</section>
