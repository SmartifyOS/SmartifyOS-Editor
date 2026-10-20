<script lang="ts">
	import AppWindow from '~icons/lucide/app-window';
	import Eye from '~icons/lucide/eye';
	import Gauge from '~icons/lucide/gauge';
	import LayoutDashboard from '~icons/lucide/layout-dashboard';
	import LayoutGrid from '~icons/lucide/layout-grid';
	import Palette from '~icons/lucide/palette';
	import PanelTop from '~icons/lucide/panel-top';
	import SettingsIcon from '~icons/lucide/settings';
	import ToggleRight from '~icons/lucide/toggle-right';
	import type { Component } from 'svelte';
	import { codeWords } from '#lib/codeNames.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import { extensionSettings } from '#lib/state/extensionSettings.svelte.ts';
	import { look } from '#lib/state/look.svelte.ts';
	import RunAppLink from './RunAppLink.svelte';
	import Fold from './setup/Fold.svelte';

	/**
	 * What an extension adds to your car's app (its windows, widgets, tiles, settings pages and
	 * the rest), as the running app says, a few of each until more are asked for. Whatever can be
	 * put on screen is, with a click.
	 */
	let { name }: { name: string } = $props();

	// Its class, which is how the running app names it, comes with its settings.
	const store = $derived(extensionSettings(name));
	const className = $derived(store.result?.className);

	const running = $derived(editor.preview.status === 'running');
	const found = $derived(
		className ? look.app?.extensions?.find((known) => known.className === className) : undefined
	);

	const kinds: {
		id: string;
		title: string;
		icon: Component;
		show?: 'window' | 'widget' | 'tile' | 'settings';
	}[] = [
		{ id: 'windows', title: 'Windows', icon: AppWindow, show: 'window' },
		{ id: 'widgets', title: 'Home screen widgets', icon: LayoutDashboard, show: 'widget' },
		{ id: 'tiles', title: 'Quick settings tiles', icon: ToggleRight, show: 'tile' },
		{ id: 'settingsPages', title: 'Settings pages', icon: SettingsIcon, show: 'settings' },
		{ id: 'statusIcons', title: 'Status bar icons', icon: PanelTop },
		{ id: 'layouts', title: 'Layouts', icon: LayoutGrid },
		{ id: 'themes', title: 'Themes', icon: Palette },
		{ id: 'infoDisplayValues', title: 'Info display values', icon: Gauge }
	];

	/** How many of each kind are shown before "more". */
	const few = 3;
	let expanded = $state<string[]>([]);
</script>

<Fold id={`extension.${name}.adds`} title="What it adds">
	{#if !running}
		<p class="text-[13px] text-muted">Run your car's app to see what it adds. <RunAppLink /></p>
	{:else if !look.app?.extensions}
		<p class="text-[13px] text-muted">
			Seeing what it adds needs a newer SmartifyOS in your car. Update it in your car's inspector.
		</p>
	{:else if !found}
		<p class="text-[13px] text-muted">Your running app has not set it up.</p>
	{:else if kinds.every((kind) => !found.adds[kind.id]?.length)}
		<p class="text-[13px] text-muted">
			Nothing you can see in a list. It may add things later on, or only work in the background.
		</p>
	{:else}
		<div class="flex flex-col gap-3">
			{#each kinds as kind (kind.id)}
				{@const items = found.adds[kind.id] ?? []}
				{#if items.length > 0}
					{@const open = expanded.includes(kind.id)}
					<div class="flex flex-col gap-0.5">
						<p class="text-xs text-faint">{kind.title}</p>
						{#each open ? items : items.slice(0, few) as item (item.id)}
							{#if kind.show}
								<button
									type="button"
									class="group flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-left text-[13px] outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-primary/70"
									title="Show it in the preview"
									onclick={() => void editor.callApp('show', { kind: kind.show, id: item.id })}
								>
									<kind.icon class="size-4 shrink-0 text-muted" />
									<span class="min-w-0 flex-1 truncate">{item.title ?? codeWords(item.id)}</span>
									<Eye class="size-3.5 shrink-0 text-faint opacity-0 group-hover:opacity-100" />
								</button>
							{:else}
								<div class="flex h-8 items-center gap-2 px-2 text-[13px]">
									<kind.icon class="size-4 shrink-0 text-muted" />
									<span class="min-w-0 flex-1 truncate">{item.title ?? codeWords(item.id)}</span>
								</div>
							{/if}
						{/each}
						{#if items.length > few}
							<button
								type="button"
								class="flex h-7 cursor-default items-center px-2 text-left text-xs text-muted outline-none hover:text-fg"
								onclick={() =>
									(expanded = open
										? expanded.filter((known) => known !== kind.id)
										: [...expanded, kind.id])}
							>
								{open ? 'Fewer' : `${items.length - few} more`}
							</button>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</Fold>
