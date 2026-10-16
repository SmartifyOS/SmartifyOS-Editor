<script lang="ts">
	import type { Snippet } from 'svelte';

	/** One setting: what it is on the left, what changes it on the right. */
	let {
		title,
		description,
		children
	}: { title: string; description?: Snippet | string; children?: Snippet } = $props();
</script>

<div class="flex items-center gap-6 px-4 py-3.5">
	<div class="flex min-w-0 flex-1 flex-col gap-0.5">
		<span class="font-medium">{title}</span>
		{#if typeof description === 'string'}
			<span class="selectable text-[13px] text-muted">{description}</span>
		{:else if description}
			<div class="selectable text-[13px] text-muted">{@render description()}</div>
		{/if}
	</div>
	{#if children}
		<div class="flex shrink-0 items-center gap-2">{@render children()}</div>
	{/if}
</div>
