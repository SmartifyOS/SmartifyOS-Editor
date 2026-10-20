<script lang="ts">
	import ArrowLeft from '~icons/lucide/arrow-left';
	import FolderOpen from '~icons/lucide/folder-open';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import Monitor from '~icons/lucide/monitor-check';
	import RefreshCw from '~icons/lucide/refresh-cw';
	import Wrench from '~icons/lucide/wrench';
	import type { Component } from 'svelte';
	import { goto } from '$app/navigation';
	import { editor } from '#lib/state/editor.svelte.ts';
	import { remembered } from '#lib/state/remembered.svelte.ts';
	import CheckRow from '../CheckRow.svelte';
	import Button from '../ui/Button.svelte';
	import Switch from '../ui/Switch.svelte';
	import SettingsGroup from './SettingsGroup.svelte';
	import SettingsRow from './SettingsRow.svelte';

	/**
	 * The settings page, in place of the editor: a section at a time, picked on the left. The
	 * first is this computer, what the CLI's doctor says about it.
	 */

	type SectionId = 'computer' | 'updates' | 'projects';
	const sections: { id: SectionId; label: string; icon: Component }[] = [
		{ id: 'computer', label: 'This computer', icon: Monitor },
		{ id: 'updates', label: 'Updates', icon: RefreshCw },
		{ id: 'projects', label: 'Projects', icon: FolderOpen }
	];

	const section = remembered<SectionId>('settings.section', 'computer');
	const current = $derived(sections.find((s) => s.id === section.value) ?? sections[0]);
	const canRun = $derived(!editor.busy && editor.cli?.found === true);

	// Asked again every time the page opens, it may have changed since.
	void editor.checkComputer();

	async function pickNewCarFolder() {
		const folder = await window.smartify.files.pickFolder(
			'Where should new cars go?',
			editor.settings?.newCarFolder ?? undefined
		);
		if (folder) await editor.changeSettings({ newCarFolder: folder });
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape' && editor.overlays === 0) void goto('#/');
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="flex min-h-0 flex-1">
	<nav class="flex w-60 shrink-0 flex-col gap-0.5 border-r border-line bg-card p-2">
		{#each sections as item (item.id)}
			<Button
				variant="ghost"
				class="justify-start font-normal"
				aria-pressed={section.value === item.id}
				onclick={() => (section.value = item.id)}
			>
				<item.icon class="text-muted" />
				{item.label}
			</Button>
		{/each}
		<div class="flex-1"></div>
		<Button variant="ghost-muted" class="justify-start font-normal" onclick={() => goto('#/')}>
			<ArrowLeft /> Back
		</Button>
	</nav>

	<div class="min-w-0 flex-1 overflow-auto bg-bg">
		<div class="mx-auto flex w-full max-w-[46rem] flex-col gap-8 px-8 py-10">
			<h1 class="px-1 text-xl font-semibold tracking-tight">{current?.label}</h1>

			{#if section.value === 'computer'}
				{@render computer()}
			{:else if section.value === 'updates'}
				{@render updates()}
			{:else}
				{@render projects()}
			{/if}
		</div>
	</div>
</div>

{#snippet computer()}
	{#snippet recheck()}
		<Button size="sm" disabled={editor.checkingComputer} onclick={() => editor.checkComputer()}>
			<RefreshCw class={editor.checkingComputer ? 'animate-spin' : ''} /> Check again
		</Button>
	{/snippet}
	<SettingsGroup title="What SmartifyOS needs" actions={recheck}>
		{#if editor.computer}
			{#each editor.computer.checks as check (check.id)}
				<CheckRow
					{check}
					class="px-4 py-3.5"
					fixDisabled={!canRun}
					onfix={() => editor.setUpComputer(check)}
				/>
			{/each}
		{:else if editor.checkingComputer}
			<p class="flex items-center gap-2 px-4 py-3.5 text-muted">
				<LoaderCircle class="size-4 animate-spin" /> Checking this computer
			</p>
		{:else}
			<p class="px-4 py-3.5 text-muted">
				This computer could not be checked. The tools behind the editor may need an update.
			</p>
		{/if}
	</SettingsGroup>

	<SettingsGroup title="Setup">
		<SettingsRow
			title="Get this computer ready"
			description="Installs Flutter, which SmartifyOS is built with, unless this computer has it. Then it asks about PlatformIO, which builds the devices on your CAN bus, and checks everything again. It ran once by itself after installing."
		>
			<Button size="sm" disabled={!canRun} onclick={() => editor.setUpComputer()}>
				<Wrench /> Run setup
			</Button>
		</SettingsRow>
	</SettingsGroup>
{/snippet}

{#snippet updates()}
	<SettingsGroup title="Keeping it up to date">
		<SettingsRow
			title="Look for updates in the background"
			description="Every few hours, for the editor and the tools behind it. They download by themselves, and the editor asks before it restarts for one."
		>
			{#if editor.settings}
				<Switch
					label="Look for updates in the background"
					checked={editor.settings.backgroundUpdates}
					onchange={(on) => editor.changeSettings({ backgroundUpdates: on })}
				/>
			{/if}
		</SettingsRow>
		<SettingsRow title="Look now">
			{#snippet description()}
				SmartifyOS Editor {editor.version}{#if editor.cli?.found}, its tools (the SmartifyOS CLI) {editor
						.cli.version}{/if}
			{/snippet}
			<Button
				size="sm"
				disabled={editor.update.status === 'checking'}
				onclick={() => editor.checkForUpdates()}
			>
				<RefreshCw class={editor.update.status === 'checking' ? 'animate-spin' : ''} />
				Check for updates
			</Button>
		</SettingsRow>
	</SettingsGroup>
{/snippet}

{#snippet projects()}
	<SettingsGroup title="New cars">
		<SettingsRow
			title="Where new cars go"
			description={editor.settings?.newCarFolder ??
				'Next to the car you opened last, or in Documents for the first one.'}
		>
			{#if editor.settings?.newCarFolder}
				<Button size="sm" onclick={() => editor.changeSettings({ newCarFolder: null })}>
					Reset
				</Button>
			{/if}
			<Button size="sm" onclick={pickNewCarFolder}>Choose…</Button>
		</SettingsRow>
	</SettingsGroup>

	<SettingsGroup title="Recent projects">
		<SettingsRow
			title="The list on the start screen"
			description={editor.recent.length === 1
				? 'It has 1 project. Clearing it leaves the project itself as it is.'
				: `It has ${editor.recent.length} projects. Clearing it leaves the projects themselves as they are.`}
		>
			<Button size="sm" disabled={editor.recent.length === 0} onclick={() => editor.forgetAll()}>
				Clear the list
			</Button>
		</SettingsRow>
	</SettingsGroup>
{/snippet}
