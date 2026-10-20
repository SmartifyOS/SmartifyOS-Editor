<script lang="ts" generics="Value extends string">
	import type { Component } from 'svelte';

	/** A few choices side by side, one of them picked, like tabs. */
	let {
		value = $bindable(),
		options,
		label,
		class: className = ''
	}: {
		value: Value;
		options: readonly { value: Value; label: string; icon?: Component; dot?: boolean }[];
		/** Read out for the whole group. */
		label: string;
		class?: string;
	} = $props();
</script>

<div
	role="tablist"
	aria-label={label}
	class={[
		'flex h-9 items-center gap-0.5 rounded-control border border-input bg-tint p-0.5',
		className
	]}
>
	{#each options as option (option.value)}
		{@const picked = option.value === value}
		<button
			type="button"
			role="tab"
			aria-selected={picked}
			class={[
				'relative flex h-full min-w-0 flex-1 cursor-default items-center justify-center gap-1.5 rounded-[6px] px-2 text-[13px] font-medium transition-colors outline-none no-drag focus-visible:ring-2 focus-visible:ring-primary/70 [&_svg]:size-3.5 [&_svg]:shrink-0',
				picked
					? 'bg-pressed text-fg inset-shadow-[0_1px_rgb(255_255_255/0.06)]'
					: 'text-muted hover:text-fg'
			]}
			onclick={() => (value = option.value)}
		>
			{#if option.icon}<option.icon />{/if}
			<span class="truncate">{option.label}</span>
			{#if option.dot}
				<span class="size-1.5 shrink-0 rounded-full bg-good" aria-hidden="true"></span>
			{/if}
		</button>
	{/each}
</div>
