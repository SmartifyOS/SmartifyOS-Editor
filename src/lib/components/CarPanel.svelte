<script lang="ts">
	import Box from '~icons/lucide/box';
	import Car from '~icons/lucide/car-front';
	import CircleArrowUp from '~icons/lucide/circle-arrow-up';
	import VsCode from '~icons/logos/visual-studio-code';
	import Cpu from '~icons/lucide/cpu';
	import Plus from '~icons/lucide/plus';
	import Puzzle from '~icons/lucide/puzzle';
	import RefreshCw from '~icons/lucide/refresh-cw';
	import type { Component } from 'svelte';
	import type { DeviceCreated } from '../../../shared/cli.ts';
	import { commands } from '#lib/commands.ts';
	import { bus } from '#lib/state/bus.svelte.ts';
	import { editor, type Selection } from '#lib/state/editor.svelte.ts';
	import Panel from './Panel.svelte';
	import Button from './ui/Button.svelte';

	/**
	 * The car's parts, like Unity's hierarchy: what it runs, and the devices on its CAN bus.
	 * Picking one shows it in the inspector.
	 */

	let refreshing = $state(false);

	async function refresh() {
		refreshing = true;
		try {
			await editor.refreshProject();
			void editor.checkCarUpdates();
		} finally {
			refreshing = false;
		}
	}

	async function makeDevice() {
		const result = await editor.runTask(commands.createDevice());
		if (!result.ok) return;
		editor.selection = { kind: 'device', folder: (result.data as DeviceCreated).folder };
	}

	function isPicked(selection: Selection): boolean {
		const picked = editor.selection;
		if (picked.kind !== selection.kind) return false;
		if (picked.kind === 'package' && selection.kind === 'package') {
			return picked.name === selection.name;
		}
		if (picked.kind === 'device' && selection.kind === 'device') {
			return picked.folder === selection.folder;
		}
		if (picked.kind === 'canDevice' && selection.kind === 'canDevice') {
			return picked.name === selection.name;
		}
		return true;
	}

	/** The running app's devices on the bus, by name, to show which are there. */
	const onBus = $derived(new Map(bus.network?.devices.map((device) => [device.name, device])));
	/** Devices the running app has on its bus that have no program yet. */
	const withoutProgram = $derived(
		bus.network?.devices.filter(
			(device) => !editor.project?.devices.some((known) => known.name === device.name)
		) ?? []
	);

	const project = $derived(editor.project);
	const updates = $derived(editor.carUpdates);
	const canRun = $derived(!editor.busy && editor.cli?.found === true);
</script>

<Panel title="Car" surface="card">
	{#snippet actions()}
		<Button
			variant="ghost-muted"
			size="icon-sm"
			label="Open your car's app in VS Code"
			onclick={() => editor.openInVsCode()}
		>
			<VsCode />
		</Button>
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

	{#if project}
		{@const car = project.car}
		<div class="flex flex-col gap-0.5 overflow-auto px-2 pb-2">
			{@render row({ kind: 'car' }, project.name, null, Car)}

			<div class="ml-[17px] flex flex-col gap-0.5 border-l border-line pl-2">
				{@render row(
					{ kind: 'package', name: car.smartifyOs.name },
					car.smartifyOs.title,
					car.smartifyOs.version,
					Box,
					{ update: updates?.smartifyOs ?? undefined }
				)}
				{#each car.extensions as extension (extension.name)}
					{@render row(
						{ kind: 'package', name: extension.name },
						extension.title,
						extension.version,
						Puzzle,
						{ off: extension.switchedOn === false, update: updates?.extensions[extension.name] }
					)}
				{/each}
				{@render add('Add an extension', () => (editor.addExtensionDialog = true))}
			</div>

			<h3 class="px-2.5 pt-4 pb-1 text-xs font-medium text-faint">Devices on the CAN bus</h3>
			<div class="ml-[17px] flex flex-col gap-0.5 border-l border-line pl-2">
				{#each project.devices as device (device.folder)}
					{@render row(
						{ kind: 'device', folder: device.folder },
						device.name,
						device.version,
						Cpu,
						{
							online: onBus.get(device.name)?.online
						}
					)}
				{/each}
				{#each withoutProgram as device (device.name)}
					{@render row({ kind: 'canDevice', name: device.name }, device.title, null, Cpu, {
						online: device.online,
						faint: true
					})}
				{/each}
				{@render add('Make a device', makeDevice)}
			</div>
		</div>
	{/if}
</Panel>

{#snippet row(
	selection: Selection,
	title: string,
	version: string | null,
	Icon: Component,
	{
		off = false,
		update,
		online = false,
		faint = false
	}: { off?: boolean; update?: string; online?: boolean; faint?: boolean } = {}
)}
	{@const picked = isPicked(selection)}
	<button
		type="button"
		class={[
			'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-left transition-colors',
			picked ? 'bg-selected text-fg' : 'text-fg/90 hover:bg-hover',
			selection.kind === 'car' && 'font-medium'
		]}
		onclick={() => (editor.selection = selection)}
	>
		<Icon class={['size-4 shrink-0', picked ? 'text-fg' : 'text-muted']} />
		<span
			class={['truncate', off && 'text-faint line-through', faint && !picked && 'text-muted']}
			title={faint ? 'It has no program yet' : undefined}>{title}</span
		>
		{#if online}
			<span class="size-1.5 shrink-0 rounded-full bg-good" title="It is there"></span>
		{/if}
		{#if update}
			<span class="ml-auto" title={`${update} is out`}>
				<CircleArrowUp class="size-3.5 text-primary" />
			</span>
		{/if}
		{#if version}
			<span class={['shrink-0 font-mono text-xs text-faint', !update && 'ml-auto']}>{version}</span>
		{/if}
	</button>
{/snippet}

{#snippet add(label: string, onclick: () => void)}
	<Button
		variant="ghost-muted"
		size="sm"
		class="h-9 justify-start px-2.5 font-normal"
		disabled={!canRun}
		{onclick}
	>
		<Plus />
		{label}
	</Button>
{/snippet}
