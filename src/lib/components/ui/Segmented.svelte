<script lang="ts" generics="Value extends string">
	import type { Component } from 'svelte';

	/**
	 * A few choices side by side, one of them picked, like tabs. `sm` is as tall as the small
	 * buttons of a panel's header.
	 */
	let {
		value = $bindable(),
		options,
		label,
		size = 'md',
		class: className = ''
	}: {
		value: Value;
		options: readonly {
			value: Value;
			label: string;
			icon?: Component;
			dot?: boolean;
			/** A number of problems, say, in red after the label. */
			count?: number;
		}[];
		/** Read out for the whole group. */
		label: string;
		size?: 'sm' | 'md';
		class?: string;
	} = $props();
</script>

<div
	role="tablist"
	aria-label={label}
	class={[
		'flex items-center gap-0.5 rounded-control border border-input bg-tint p-0.5',
		size === 'sm' ? 'h-8' : 'h-9',
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
				'relative flex h-full min-w-0 cursor-default items-center justify-center gap-1.5 rounded-[6px] px-2.5 text-[13px] font-medium transition-colors outline-none no-drag focus-visible:ring-2 focus-visible:ring-primary/70 [&_svg]:size-3.5 [&_svg]:shrink-0',
				// Small ones sit in a header and are as wide as their words, big ones share the width.
				size === 'sm' ? 'flex-none' : 'flex-1',
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
			{#if option.count}
				<span class="rounded-full bg-bad/15 px-1.5 text-xs text-bad tabular-nums">
					{option.count}
				</span>
			{/if}
		</button>
	{/each}
</div>
