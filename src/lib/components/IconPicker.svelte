<script lang="ts">
	import CircleDashed from '~icons/lucide/circle-dashed';
	import Search from '~icons/lucide/search';
	import { partIcons } from '#lib/parts.ts';
	import CarIcon from './CarIcon.svelte';
	import IconSearchDialog from './IconSearchDialog.svelte';
	import Button from './ui/Button.svelte';

	/**
	 * Picks one of the car's icons: the few the editor offers first, the one picked when it is
	 * none of those, and every other icon in Flutter's `Icons` behind "More icons".
	 */

	let {
		value,
		onpick,
		disabled = false,
		large = false
	}: {
		value: string | null;
		onpick: (name: string) => void;
		disabled?: boolean;
		/** The bigger tiles of a dialog, rather than the inspector's. */
		large?: boolean;
	} = $props();

	let searching = $state(false);

	/** The picked one first when it is not among the few, so it shows as picked. */
	const choices = $derived([
		...(value && !partIcons.some((known) => known.id === value) ? [value] : []),
		...partIcons.map((known) => known.id)
	]);
</script>

<div class={['grid grid-cols-9', large ? 'gap-1.5' : 'gap-1']}>
	{#each choices as choice (choice)}
		{@const picked = value === choice}
		{@const label = partIcons.find((known) => known.id === choice)?.label ?? choice}
		<button
			type="button"
			title={label}
			aria-label={label}
			aria-pressed={picked}
			{disabled}
			class={[
				'grid aspect-square place-items-center border transition-colors disabled:opacity-50',
				large ? 'rounded-lg' : 'rounded-md',
				picked
					? 'border-primary/60 bg-primary/10 text-primary'
					: large
						? 'border-line bg-tint text-muted hover:bg-hover hover:text-fg'
						: 'border-transparent text-muted hover:bg-hover hover:text-fg'
			]}
			onclick={() => !picked && onpick(choice)}
		>
			<CarIcon name={choice} fallback={CircleDashed} class={large ? 'size-[18px]' : 'size-4'} />
		</button>
	{/each}
</div>
<Button size="sm" class="w-full justify-start" {disabled} onclick={() => (searching = true)}>
	<Search /> More icons…
</Button>

{#if searching}
	<IconSearchDialog
		{value}
		onpick={(name) => name !== value && onpick(name)}
		onclose={() => (searching = false)}
	/>
{/if}
