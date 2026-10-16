<script lang="ts">
	import type { Snippet } from 'svelte';

	/** A few settings that belong together: a heading, and a card with a row for each. */
	let { title, actions, children }: { title: string; actions?: Snippet; children: Snippet } =
		$props();
</script>

<section class="flex flex-col gap-2.5">
	<div class="flex h-8 items-center justify-between gap-3 px-1">
		<h2 class="text-[13px] font-medium text-muted">{title}</h2>
		{@render actions?.()}
	</div>
	<div class="flex flex-col divide-y divide-line rounded-xl border border-line bg-card">
		{@render children()}
	</div>
</section>
