<script lang="ts">
	import ChevronDown from '~icons/lucide/chevron-down';
	import FolderOpen from '~icons/lucide/folder-open';
	import FolderX from '~icons/lucide/folder-x';
	import ExternalLink from '~icons/lucide/external-link';
	import Play from '~icons/lucide/play';
	import Square from '~icons/lucide/square';
	import RotateCw from '~icons/lucide/rotate-cw';
	import Zap from '~icons/lucide/zap';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import logo from '#lib/assets/logo.svg';
	import { clickOutside, coversViewport } from '#lib/attachments.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import IconButton from './IconButton.svelte';

	const platform = window.smartify.platform;
	const mod = platform === 'darwin' ? '⌘' : 'Ctrl+';

	let menuOpen = $state(false);

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
		action();
	}
</script>

<header
	class={[
		'relative flex h-10 shrink-0 items-center gap-2 border-b border-line bg-panel drag',
		platform === 'darwin' ? 'pr-3 pl-20' : 'pr-36 pl-3'
	]}
>
	<img src={logo} alt="SmartifyOS" class="h-3.5 opacity-90" draggable="false" />

	{#if editor.project}
		<span class="text-faint">/</span>
		<div class="relative">
			<button
				type="button"
				class="flex h-7 items-center gap-1.5 rounded-md px-2 font-medium no-drag hover:bg-hover"
				onclick={() => (menuOpen = !menuOpen)}
			>
				{editor.project.name}
				<ChevronDown class="size-3.5 text-muted" />
			</button>

			{#if menuOpen}
				<div
					{@attach coversViewport}
					{@attach clickOutside(() => (menuOpen = false))}
					class="absolute top-9 left-0 z-50 w-80 rounded-lg border border-line-strong bg-raised p-1 shadow-2xl shadow-black/60 no-drag"
				>
					{#if others.length > 0}
						<div
							class="px-2.5 pt-1.5 pb-1 text-[11px] font-medium tracking-wide text-faint uppercase"
						>
							Recent
						</div>
						{#each others as project (project.path)}
							<button
								type="button"
								disabled={!project.exists}
								class="flex w-full flex-col rounded-md px-2.5 py-1.5 text-left hover:bg-hover disabled:opacity-40"
								onclick={() => pick(() => editor.open(project.path))}
							>
								<span>{project.name}</span>
								<span class="truncate text-xs text-faint">{project.path}</span>
							</button>
						{/each}
						<div class="my-1 h-px bg-line"></div>
					{/if}
					<button
						type="button"
						class="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 hover:bg-hover"
						onclick={() => pick(() => editor.open())}
					>
						<FolderOpen class="size-4 text-muted" /> Open another project…
					</button>
					<button
						type="button"
						class="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 hover:bg-hover"
						onclick={() =>
							pick(() => editor.project && window.smartify.projects.reveal(editor.project.path))}
					>
						<ExternalLink class="size-4 text-muted" />
						{revealLabel}
					</button>
					<button
						type="button"
						class="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 hover:bg-hover"
						onclick={() => pick(() => editor.close())}
					>
						<FolderX class="size-4 text-muted" /> Close project
					</button>
				</div>
			{/if}
		</div>

		<!-- The run controls, centered on the window like Unity's play bar. -->
		<div
			class="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-frame p-0.5"
		>
			<button
				type="button"
				title={editor.running ? `Stop (${mod}P)` : `Run your car's app (${mod}P)`}
				disabled={status === 'stopping'}
				class={[
					'flex h-7 items-center gap-1.5 rounded-md px-3 font-medium transition-colors no-drag disabled:opacity-50',
					editor.running
						? 'bg-active text-fg hover:bg-line-strong'
						: 'bg-accent text-frame hover:bg-accent-strong'
				]}
				onclick={() => editor.toggleRun()}
			>
				{#if status === 'starting' || status === 'stopping'}
					<LoaderCircle class="size-3.5 animate-spin" />
					{status === 'starting' ? 'Starting' : 'Stopping'}
				{:else if status === 'running'}
					<Square class="size-3" /> Stop
				{:else}
					<Play class="size-3.5" /> Run
				{/if}
			</button>
			<IconButton
				label={`Hot reload, shows your changes (${mod}R)`}
				disabled={status !== 'running'}
				onclick={() => editor.reload()}
			>
				<Zap class="size-4" />
			</IconButton>
			<IconButton
				label={`Restart the app (${platform === 'darwin' ? '⇧⌘R' : 'Ctrl+Shift+R'})`}
				disabled={status !== 'running'}
				onclick={() => editor.restart()}
			>
				<RotateCw class="size-4" />
			</IconButton>
		</div>
	{/if}

	<div class="flex-1"></div>

	{#if editor.cli?.found}
		<span class="text-xs text-faint" title={editor.cli.path}>CLI {editor.cli.version}</span>
	{/if}
</header>
