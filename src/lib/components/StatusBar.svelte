<script lang="ts">
	import ArrowDownToLine from '~icons/lucide/arrow-down-to-line';
	import CircleCheck from '~icons/lucide/circle-check';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import RefreshCw from '~icons/lucide/refresh-cw';
	import TriangleAlert from '~icons/lucide/triangle-alert';
	import Discord from '~icons/logos/discord-icon';
	import { editor } from '#lib/state/editor.svelte.ts';

	/**
	 * The strip along the bottom of the window: a way to ask for help on the left, then a task
	 * moved out of the way and updates, which only show when there is something to say, and on the right the versions of the CLI and the editor, which checks
	 * for updates when clicked.
	 */

	const discord = 'https://discord.gg/bRw7wJMnPZ';

	const update = $derived(editor.update);
	// "Up to date" is said for a moment after a check the user asked for.
	const upToDate = $derived(update.status === 'idle' && update.checkedAt !== undefined);
</script>

<footer
	class="flex h-8 shrink-0 items-center gap-3 border-t border-line bg-bg px-3 text-[12.5px] text-muted"
>
	<a
		href={discord}
		target="_blank"
		rel="noreferrer"
		class="-ml-1.5 flex h-6 items-center gap-1.5 rounded-md px-1.5 hover:bg-hover hover:text-fg"
		title="Ask a question on the SmartifyOS Discord"
	>
		<Discord class="size-4" /> Get help
	</a>

	{#if editor.task?.hidden}
		<button
			type="button"
			class="flex h-6 items-center gap-2 rounded-md px-1.5 text-fg/90 hover:bg-hover"
			title="Show how far it is"
			onclick={() => editor.task && (editor.task.hidden = false)}
		>
			<LoaderCircle class="size-3.5 animate-spin text-primary" />
			{editor.task.spec.title}
		</button>
	{/if}

	{#if update.status === 'checking'}
		<span class="flex items-center gap-2">
			<LoaderCircle class="size-3.5 animate-spin" /> Looking for updates
		</span>
	{:else if update.status === 'downloading'}
		<span class="flex items-center gap-2" title="It installs by itself, you can keep working">
			<ArrowDownToLine class="size-3.5 text-primary" />
			Downloading an update
			<span class="h-1 w-24 overflow-hidden rounded-full bg-hover">
				<span
					class={[
						'block h-full rounded-full bg-primary transition-[width] duration-300',
						update.percent === null && 'w-1/3 animate-pulse'
					]}
					style:width={update.percent === null ? undefined : `${update.percent}%`}
				></span>
			</span>
			{#if update.percent !== null}<span class="tabular-nums">{update.percent}%</span>{/if}
		</span>
	{:else if update.status === 'ready'}
		<button
			type="button"
			class="flex h-6 items-center gap-1.5 rounded-md bg-primary/15 px-2 font-medium text-fg transition-colors hover:bg-primary/25"
			onclick={() => (editor.updateDialog = true)}
		>
			<RefreshCw class="size-3.5 text-primary" /> Restart to update
		</button>
	{:else if update.status === 'restarting'}
		<span class="flex items-center gap-2">
			<LoaderCircle class="size-3.5 animate-spin" /> Restarting to update
		</span>
	{:else if update.status === 'updated'}
		<span class="flex items-center gap-2 text-fg/90">
			<CircleCheck class="size-3.5 text-good" /> Updated to the newest version
		</span>
	{:else if update.status === 'failed'}
		<button
			type="button"
			class="flex min-w-0 items-center gap-2 hover:text-fg"
			title="Try again"
			onclick={() => editor.checkForUpdates()}
		>
			<TriangleAlert class="size-3.5 shrink-0 text-warn" />
			<span class="truncate">{update.message}</span>
		</button>
	{:else if upToDate}
		<span class="flex items-center gap-2">
			<CircleCheck class="size-3.5 text-good" /> Everything is up to date
		</span>
	{/if}

	<div class="flex-1"></div>

	{#if editor.cli?.found}
		<span title={editor.cli.path}>CLI {editor.cli.version}</span>
	{/if}
	{#if editor.version}
		<button
			type="button"
			class="rounded px-1.5 py-0.5 hover:bg-hover hover:text-fg"
			title="Check for updates"
			onclick={() => editor.checkForUpdates()}
		>
			SmartifyOS Editor {editor.version}
		</button>
	{/if}
</footer>
