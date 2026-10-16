<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * An area of the editor: a header with its title and actions, and what it holds. Areas
	 * sit edge to edge, divided by hairlines, with `surface` telling the sidebars (card)
	 * from the middle (bg).
	 */
	let {
		title,
		actions,
		children,
		surface = 'bg',
		class: className = ''
	}: {
		title: string;
		actions?: Snippet;
		children: Snippet;
		surface?: 'bg' | 'card';
		class?: string;
	} = $props();
</script>

<section
	class={[
		'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
		surface === 'card' ? 'bg-card' : 'bg-bg',
		className
	]}
>
	<header class="flex h-11 shrink-0 items-center gap-1.5 pr-2 pl-4">
		<h2 class="text-[13px] font-medium text-muted">{title}</h2>
		<div class="flex-1"></div>
		{@render actions?.()}
	</header>
	<div class="flex min-h-0 flex-1 flex-col">
		{@render children()}
	</div>
</section>
