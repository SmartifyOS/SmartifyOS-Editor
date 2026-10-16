<script lang="ts">
	import Car from '~icons/lucide/car-front';
	import Box from '~icons/lucide/box';
	import Puzzle from '~icons/lucide/puzzle';
	import RefreshCcw from '~icons/lucide/refresh-ccw';
	import ChevronDown from '~icons/lucide/chevron-down';
	import { editor } from '#lib/state/editor.svelte.ts';
	import IconButton from './IconButton.svelte';
	import Panel from './Panel.svelte';

	/** The car's parts, like Unity's hierarchy. Picking one shows it in the inspector. */
	let { selected = $bindable() }: { selected: string | undefined } = $props();

	let refreshing = $state(false);

	async function refresh() {
		refreshing = true;
		try {
			await editor.refreshProject();
		} finally {
			refreshing = false;
		}
	}

	const car = $derived(editor.project?.car);
</script>

<Panel title="Car">
	{#snippet actions()}
		<IconButton label="Read the car again" disabled={refreshing} onclick={refresh}>
			<RefreshCcw class={['size-3.5', refreshing && 'animate-spin']} />
		</IconButton>
	{/snippet}

	{#if car && editor.project}
		<div class="flex flex-col gap-px overflow-auto p-1.5">
			<div class="flex h-7 items-center gap-2 px-2 font-medium">
				<ChevronDown class="size-3.5 text-faint" />
				<Car class="size-4 text-accent" />
				<span class="truncate">{editor.project.name}</span>
			</div>

			{@render row(car.smartifyOs.name, car.smartifyOs.title, car.smartifyOs.version, Box)}

			{#each car.extensions as extension (extension.name)}
				{@render row(
					extension.name,
					extension.title,
					extension.version,
					Puzzle,
					extension.switchedOn === false
				)}
			{/each}

			{#if car.extensions.length === 0}
				<p class="px-8 py-1 text-xs text-faint">No extensions yet</p>
			{/if}
		</div>
	{/if}
</Panel>

{#snippet row(name: string, title: string, version: string | null, Icon: typeof Box, off = false)}
	<button
		type="button"
		class={[
			'flex h-7 items-center gap-2 rounded-md pr-2 pl-8 text-left',
			selected === name ? 'bg-accent-soft text-fg' : 'hover:bg-hover'
		]}
		onclick={() => (selected = name)}
	>
		<Icon class={['size-4 shrink-0', selected === name ? 'text-accent' : 'text-muted']} />
		<span class={['truncate', off && 'text-faint line-through']}>{title}</span>
		{#if version}
			<span class="ml-auto shrink-0 text-xs text-faint">{version}</span>
		{/if}
	</button>
{/snippet}
