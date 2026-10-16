<script lang="ts">
	import type { Snippet } from 'svelte';

	/** A panel of the editor: a header with its title and actions, and what it holds. */
	let {
		title,
		actions,
		children,
		class: className = ''
	}: { title: string; actions?: Snippet; children: Snippet; class?: string } = $props();
</script>

<section
	class={['flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-panel', className]}
>
	<header class="flex h-8 shrink-0 items-center gap-1 border-b border-line pr-1 pl-3">
		<h2 class="text-xs font-medium text-muted">{title}</h2>
		<div class="flex-1"></div>
		{@render actions?.()}
	</header>
	<div class="flex min-h-0 flex-1 flex-col">
		{@render children()}
	</div>
</section>
