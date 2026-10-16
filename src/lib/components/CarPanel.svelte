<script lang="ts">
	import Car from '~icons/lucide/car-front';
	import Box from '~icons/lucide/box';
	import Puzzle from '~icons/lucide/puzzle';
	import RefreshCw from '~icons/lucide/refresh-cw';
	import { editor } from '#lib/state/editor.svelte.ts';
	import Panel from './Panel.svelte';
	import Button from './ui/Button.svelte';

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

<Panel title="Car" surface="card">
	{#snippet actions()}
		<Button
			variant="ghost-muted"
			size="icon-sm"
			label="Read the car again"
			disabled={refreshing}
			onclick={refresh}
		>
			<RefreshCw class={refreshing ? 'animate-spin' : ''} />
		</Button>
	{/snippet}

	{#if car && editor.project}
		<div class="flex flex-col gap-0.5 overflow-auto px-2 pb-2">
			<div class="flex h-9 items-center gap-2.5 px-2.5 font-medium">
				<Car class="size-4 text-muted" />
				<span class="truncate">{editor.project.name}</span>
			</div>

			<div class="ml-[17px] flex flex-col gap-0.5 border-l border-line pl-2">
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
					<p class="px-2.5 py-1.5 text-[13px] text-faint">No extensions yet</p>
				{/if}
			</div>
		</div>
	{/if}
</Panel>

{#snippet row(name: string, title: string, version: string | null, Icon: typeof Box, off = false)}
	<button
		type="button"
		class={[
			'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-left transition-colors',
			selected === name ? 'bg-selected text-fg' : 'text-fg/90 hover:bg-hover'
		]}
		onclick={() => (selected = name)}
	>
		<Icon class={['size-4 shrink-0', selected === name ? 'text-fg' : 'text-muted']} />
		<span class={['truncate', off && 'text-faint line-through']}>{title}</span>
		{#if version}
			<span class="ml-auto shrink-0 font-mono text-xs text-faint">{version}</span>
		{/if}
	</button>
{/snippet}
