<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';
	import CarIcon from './CarIcon.svelte';

	/**
	 * The top of every inspector page: what is picked with its icon, where it is (a file or a
	 * package, in small code letters) and a line about what it is.
	 */
	let {
		title,
		icon,
		carIcon,
		detail,
		about,
		trailing
	}: {
		title: string;
		icon?: Component<{ class?: ClassValue }>;
		/** One of the car's own icons, by its name in Flutter's `Icons`, with `icon` until it draws. */
		carIcon?: string | null;
		detail?: string;
		about?: string;
		/** At the end of the title line, like a saving indicator. */
		trailing?: Snippet;
	} = $props();
</script>

<div class="flex flex-col gap-1">
	<div class="flex min-h-7 items-center gap-2">
		{#if icon && carIcon !== undefined}
			<CarIcon name={carIcon} fallback={icon} class="size-4 shrink-0 text-muted" />
		{:else if icon}
			{@const Icon = icon}
			<Icon class="size-4 shrink-0 text-muted" />
		{/if}
		<h2 class="min-w-0 flex-1 text-base font-semibold break-words">{title}</h2>
		{@render trailing?.()}
	</div>
	{#if detail}
		<div class="font-mono text-xs break-all text-faint">{detail}</div>
	{/if}
	{#if about}
		<p class="pt-0.5 text-[13px] text-muted">{about}</p>
	{/if}
</div>
