<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * A part of an inspector page under its title, divided from the one before by a hairline:
	 * the same spacing on every page, with `Fold` the one that folds away. Without a title it is
	 * only a group, like the buttons at the end of a page.
	 */
	let {
		title,
		actions,
		children
	}: {
		title?: string;
		/** At the end of the title line, a small icon button say. */
		actions?: Snippet;
		children: Snippet;
	} = $props();
</script>

<section class={['flex flex-col gap-2.5', title && 'border-t border-line pt-4']}>
	{#if title}
		<div class="flex h-6 items-center gap-2">
			<h3 class="min-w-0 flex-1 truncate text-[13px] font-semibold">{title}</h3>
			{@render actions?.()}
		</div>
	{/if}
	{@render children()}
</section>
