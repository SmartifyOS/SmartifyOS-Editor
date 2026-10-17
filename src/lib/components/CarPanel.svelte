<script lang="ts">
	import Box from '~icons/lucide/box';
	import SettingsIcon from '~icons/lucide/settings';
	import Car from '~icons/lucide/car-front';
	import CircleArrowUp from '~icons/lucide/circle-arrow-up';
	import VsCode from '~icons/logos/visual-studio-code';
	import Cpu from '~icons/lucide/cpu';
	import Plus from '~icons/lucide/plus';
	import Puzzle from '~icons/lucide/puzzle';
	import ChevronRight from '~icons/lucide/chevron-right';
	import RefreshCw from '~icons/lucide/refresh-cw';
	import type { Component, Snippet } from 'svelte';
	import { actionsFor } from '#lib/carActions.ts';
	import type { DeviceCreated } from '../../../shared/cli.ts';
	import { goto } from '$app/navigation';
	import { commands } from '#lib/commands.ts';
	import { iconFor, kindWords, partKinds } from '#lib/parts.ts';
	import { bus } from '#lib/state/bus.svelte.ts';
	import { parts } from '#lib/state/parts.svelte.ts';
	import { settingsPages } from '#lib/state/settings.svelte.ts';
	import { editor, type Selection } from '#lib/state/editor.svelte.ts';
	import { remembered } from '#lib/state/remembered.svelte.ts';
	import { shortcut } from '#lib/shortcuts.ts';
	import Panel from './Panel.svelte';
	import Button from './ui/Button.svelte';
	import ContextMenu, { type MenuItem } from './ui/ContextMenu.svelte';

	/**
	 * The car's parts, like Unity's hierarchy, all under the car: what it runs, its own windows,
	 * tiles and widgets, and the devices on its CAN bus, each section folding away. Picking one
	 * shows it in the inspector, and right clicking it offers what its inspector does. The
	 * editor's own settings sit at the bottom.
	 */

	let refreshing = $state(false);
	/** The right click menu that is open, where it was opened. */
	let menu = $state<{ x: number; y: number; items: MenuItem[] }>();

	function openMenu(event: MouseEvent, items: MenuItem[]) {
		event.preventDefault();
		if (items.length > 0) menu = { x: event.clientX, y: event.clientY, items };
	}

	/** The sections folded away, which the window remembers. */
	const collapsed = remembered<string[]>('car.collapsed', []);

	function toggle(key: string) {
		collapsed.value = collapsed.value.includes(key)
			? collapsed.value.filter((known) => known !== key)
			: [...collapsed.value, key];
	}

	async function refresh() {
		refreshing = true;
		try {
			await editor.refreshProject();
			void editor.checkCarUpdates();
		} finally {
			refreshing = false;
		}
	}

	const addExtension = () => (editor.addExtensionDialog = true);
	const newSettingsPage = () => (settingsPages.dialog = true);

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
		if (picked.kind === 'part' && selection.kind === 'part') {
			return picked.file === selection.file;
		}
		if (picked.kind === 'settings' && selection.kind === 'settings') {
			return picked.file === selection.file;
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

			<div class="ml-[17px] flex flex-col border-l border-line pl-1.5">
				{#snippet components()}
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
					{@render add('Add an extension', addExtension)}
				{/snippet}
				{@render group(
					'components',
					'SmartifyOS and extensions',
					1 + car.extensions.length,
					components,
					{ icon: Plus, label: 'Add an extension…', run: addExtension, disabled: !canRun }
				)}

				{#each partKinds as kind (kind)}
					{@const words = kindWords[kind]}
					{@const list = parts.lists?.[kind] ?? []}
					{#snippet items()}
						{#each list as part (part.file)}
							{@render row(
								{ kind: 'part', part: kind, file: part.file },
								part.name ?? part.id ?? part.file,
								null,
								iconFor(kind, part.icon),
								{ faint: !part.registered, hint: 'It is not in lib/main.dart' }
							)}
						{/each}
						{@render add(words.create, () => (parts.dialog = kind))}
					{/snippet}
					{@render group(kind, words.plural, list.length, items, {
						icon: Plus,
						label: `${words.create}…`,
						run: () => (parts.dialog = kind),
						disabled: !canRun
					})}
				{/each}

				{#snippet settings()}
					{#each settingsPages.pages ?? [] as page (page.file)}
						{@render row(
							{ kind: 'settings', file: page.file },
							page.title ?? page.id ?? page.file,
							null,
							page.icon ? iconFor('window', page.icon) : SettingsIcon,
							{ faint: !page.registered, hint: 'It is not in lib/main.dart' }
						)}
					{/each}
					{@render add('New settings page', newSettingsPage)}
				{/snippet}
				{@render group('settings', 'Settings pages', settingsPages.pages?.length ?? 0, settings, {
					icon: Plus,
					label: 'New settings page…',
					run: newSettingsPage,
					disabled: !canRun
				})}

				{#snippet devices()}
					{#each project.devices as device (device.folder)}
						{@render row(
							{ kind: 'device', folder: device.folder },
							device.name,
							device.version,
							Cpu,
							{ online: onBus.get(device.name)?.online }
						)}
					{/each}
					{#each withoutProgram as device (device.name)}
						{@render row({ kind: 'canDevice', name: device.name }, device.title, null, Cpu, {
							online: device.online,
							faint: true,
							hint: 'It has no program yet'
						})}
					{/each}
					{@render add('Make a device', makeDevice)}
				{/snippet}
				{@render group(
					'devices',
					'Devices on the CAN bus',
					project.devices.length + withoutProgram.length,
					devices,
					{ icon: Plus, label: 'Make a device', run: () => void makeDevice(), disabled: !canRun }
				)}
			</div>
		</div>
	{/if}

	<div class="mt-auto flex shrink-0 px-2 py-1.5">
		<Button
			variant="ghost-muted"
			size="icon-sm"
			label={`Settings (${shortcut(',')})`}
			onclick={() => goto('#/settings')}
		>
			<SettingsIcon class="size-5!" />
		</Button>
	</div>
</Panel>

<!-- Made anew for each right click, as one can close the last and open the next at once. -->
{#if menu}
	{#key menu}
		<ContextMenu {...menu} onclose={() => (menu = undefined)} />
	{/key}
{/if}

{#snippet row(
	selection: Selection,
	title: string,
	version: string | null,
	Icon: Component,
	{
		off = false,
		update,
		online = false,
		faint = false,
		hint
	}: { off?: boolean; update?: string; online?: boolean; faint?: boolean; hint?: string } = {}
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
		oncontextmenu={(event) => {
			editor.selection = selection;
			openMenu(event, actionsFor(selection));
		}}
	>
		<Icon class={['size-4 shrink-0', picked ? 'text-fg' : 'text-muted']} />
		<span
			class={['truncate', off && 'text-faint line-through', faint && !picked && 'text-muted']}
			title={faint ? hint : undefined}>{title}</span
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

{#snippet group(key: string, title: string, count: number, children: Snippet, create: MenuItem)}
	{@const open = !collapsed.value.includes(key)}
	<button
		type="button"
		aria-expanded={open}
		class="mt-1 flex h-8 items-center gap-1.5 rounded-lg pr-2.5 pl-1.5 text-xs font-medium text-faint transition-colors hover:bg-hover hover:text-muted"
		onclick={() => toggle(key)}
		oncontextmenu={(event) => openMenu(event, [create])}
	>
		<ChevronRight
			class={['size-3.5 shrink-0 transition-transform duration-150', open && 'rotate-90']}
		/>
		<span class="truncate">{title}</span>
		{#if count > 0}
			<span class="ml-auto font-mono">{count}</span>
		{/if}
	</button>
	{#if open}
		<div class="mb-1 ml-[13px] flex flex-col gap-0.5 border-l border-line pl-1.5">
			{@render children()}
		</div>
	{/if}
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
