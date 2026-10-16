<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	/** A small square button holding one icon, with its label as the tooltip. */
	let {
		label,
		children,
		active = false,
		class: className = '',
		...rest
	}: HTMLButtonAttributes & { label: string; children: Snippet; active?: boolean } = $props();
</script>

<button
	type="button"
	title={label}
	aria-label={label}
	class={[
		'grid size-7 shrink-0 place-items-center rounded-md text-muted transition-colors no-drag hover:bg-hover hover:text-fg disabled:pointer-events-none disabled:opacity-40',
		active && 'bg-active text-fg',
		className
	]}
	{...rest}
>
	{@render children()}
</button>
