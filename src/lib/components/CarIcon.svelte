<script lang="ts">
	import type { Component } from 'svelte';
	import type { ClassValue } from 'svelte/elements';
	import { partIcons } from '#lib/parts.ts';
	import { materialIcons } from '#lib/materialIcons.svelte.ts';

	/**
	 * One of the car's icons, by its name in Flutter's `Icons`: the editor's own drawing of it for
	 * the ones the editor offers first, the Material icon the car shows for any other, and
	 * `fallback` until that is loaded, or for a name that is not an icon.
	 */

	let {
		name,
		fallback,
		class: className
	}: {
		name: string | null;
		fallback: Component<{ class?: ClassValue }>;
		class?: ClassValue;
	} = $props();

	const own = $derived(partIcons.find((known) => known.id === name)?.icon);
	const body = $derived(name && !own ? materialIcons.body(name) : undefined);

	$effect(() => {
		if (name && !own) void materialIcons.load();
	});
</script>

{#if own}
	{@const Own = own}
	<Own class={className} />
{:else if body}
	<svg viewBox="0 0 24 24" class={className} aria-hidden="true">
		<!-- Paths from the icon set that ships with the editor, never anything typed in. -->
		{@html body}
	</svg>
{:else}
	{@const Fallback = fallback}
	<Fallback class={className} />
{/if}
