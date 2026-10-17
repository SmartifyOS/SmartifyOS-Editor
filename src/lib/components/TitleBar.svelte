<script lang="ts">
	import ChevronDown from '~icons/lucide/chevron-down';
	import FolderOpen from '~icons/lucide/folder-open';
	import FolderX from '~icons/lucide/folder-x';
	import Plus from '~icons/lucide/plus';
	import ExternalLink from '~icons/lucide/external-link';
	import HardDriveDownload from '~icons/lucide/hard-drive-download';
	import VsCode from '~icons/logos/visual-studio-code';
	import Play from '~icons/lucide/play';
	import Square from '~icons/lucide/square';
	import RotateCcw from '~icons/lucide/rotate-ccw';
	import Zap from '~icons/lucide/zap';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import SettingsIcon from '~icons/lucide/settings';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import icon from '#lib/assets/icon.png';
	import { clickOutside, coversViewport } from '#lib/attachments.ts';
	import { exportChoices } from '#lib/exports.ts';
	import { shortcut } from '#lib/shortcuts.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import Button from './ui/Button.svelte';
	import Kbd from './ui/Kbd.svelte';

	const platform = window.smartify.platform;

	let menuOpen = $state(false);
	const onSettings = $derived(page.route.id === '/settings');
	let exportOpen = $state(false);

	const others = $derived(editor.recent.filter((p) => p.path !== editor.project?.path).slice(0, 8));
	const status = $derived(editor.preview.status);
	const revealLabel =
		platform === 'darwin'
			? 'Show in Finder'
			: platform === 'win32'
				? 'Show in Explorer'
				: 'Show in files';

	function pick(action: () => void) {
		menuOpen = false;
		exportOpen = false;
		action();
	}

	const exportable = $derived(
		exportChoices.filter((choice) => !choice.needsDevices || editor.project?.devices.length)
	);
</script>

<header
	class={[
		// 48px of content and its 1px border, centered on the macOS window buttons.
		'relative flex h-[49px] shrink-0 items-center gap-1 border-b border-line bg-bg drag',
		platform === 'darwin' ? 'pr-3 pl-[84px]' : 'pr-36 pl-3'
	]}
>
	<img src={icon} alt="" class="mr-1.5 size-6 rounded-md" draggable="false" />

	{#if onSettings}
		<span class="text-sm font-medium">Settings</span>
	{:else if editor.project}
		<div class="relative">
			<Button
				variant="ghost"
				size="sm"
				class="text-sm"
				aria-expanded={menuOpen}
				onclick={() => (menuOpen = !menuOpen)}
			>
				{editor.project.name}
				<ChevronDown class="text-muted" />
			</Button>

			{#if menuOpen}
				<div
					{@attach coversViewport}
					{@attach clickOutside(() => (menuOpen = false))}
					class="absolute top-10 left-0 z-50 w-[22rem] rounded-xl p-1 shadow-float glass no-drag"
				>
					{#if others.length > 0}
						<div class="px-2.5 pt-2 pb-1 text-xs font-medium text-faint">Recent projects</div>
						{#each others as project (project.path)}
							<button
								type="button"
								disabled={!project.exists}
								class="flex w-full flex-col rounded-lg px-2.5 py-2 text-left hover:bg-hover disabled:opacity-40"
								onclick={() => pick(() => editor.open(project.path))}
							>
								<span class="text-sm">{project.name}</span>
								<span class="truncate text-xs text-faint">{project.path}</span>
							</button>
						{/each}
						<div class="mx-1 my-1 h-px bg-line"></div>
					{/if}
					{@render item(Plus, "Create a new car's app…", () => (editor.newCarDialog = true))}
					{@render item(FolderOpen, 'Open another project…', () => editor.open())}
					{@render item(VsCode, 'Open in VS Code', () => editor.openInVsCode())}
					{@render item(ExternalLink, revealLabel, () => {
						if (editor.project) window.smartify.projects.reveal(editor.project.path);
					})}
					{@render item(FolderX, 'Close project', () => editor.close())}
				</div>
			{/if}
		</div>

		<!-- The run controls, centered on the window like Unity's play bar. -->
		<div class="absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5">
			<Button
				variant={editor.running ? 'outline' : 'primary'}
				size="sm"
				class="min-w-28 pr-1.5"
				disabled={status === 'stopping'}
				onclick={() => editor.toggleRun()}
			>
				{#if status === 'starting' || status === 'stopping'}
					<LoaderCircle class="animate-spin" />
					{status === 'starting' ? 'Starting' : 'Stopping'}
				{:else if status === 'running'}
					<Square class="size-3.5!" /> Stop
				{:else}
					<Play /> Run
				{/if}
				<Kbd keys={shortcut('P')} class="ml-auto" />
			</Button>
			<Button
				variant="outline"
				size="icon-sm"
				label={`Hot reload, shows your changes (${shortcut('R')})`}
				disabled={status !== 'running'}
				onclick={() => editor.reload()}
			>
				<Zap />
			</Button>
			<Button
				variant="outline"
				size="icon-sm"
				label={`Restart the app (${shortcut('R', { shift: true })})`}
				disabled={status !== 'running'}
				onclick={() => editor.restart()}
			>
				<RotateCcw />
			</Button>
		</div>
	{:else}
		<span class="text-sm font-medium">SmartifyOS Editor</span>
	{/if}

	<div class="flex-1"></div>

	{#if editor.project && !onSettings}
		<div class="relative">
			<Button
				size="sm"
				aria-expanded={exportOpen}
				disabled={editor.busy || !editor.cli?.found}
				onclick={() => (exportOpen = !exportOpen)}
			>
				<HardDriveDownload /> Export
				<ChevronDown class="text-muted" />
			</Button>

			{#if exportOpen}
				<div
					{@attach coversViewport}
					{@attach clickOutside(() => (exportOpen = false))}
					class="absolute top-10 right-0 z-50 w-[19rem] rounded-xl p-1 shadow-float glass no-drag"
				>
					{#each exportable as choice (choice.label)}
						<button
							type="button"
							class="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-hover"
							onclick={() => pick(() => void editor.runTask(choice.task))}
						>
							<choice.icon class="mt-0.5 size-4 shrink-0 text-muted" />
							<span class="flex flex-col">
								<span class="text-sm">{choice.label}</span>
								<span class="text-xs text-faint">{choice.hint}</span>
							</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
	<!-- With a project open the settings are at the bottom of the car panel. -->
	{#if !editor.project && !onSettings}
		<Button
			variant="ghost-muted"
			size="icon-sm"
			label={`Settings (${shortcut(',')})`}
			onclick={() => goto('#/settings')}
		>
			<SettingsIcon />
		</Button>
	{/if}
</header>

{#snippet item(Icon: typeof FolderOpen, text: string, action: () => void)}
	<button
		type="button"
		class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-hover"
		onclick={() => pick(action)}
	>
		<Icon class="size-4 text-muted" />
		{text}
	</button>
{/snippet}
