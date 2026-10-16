<script lang="ts">
	import Check from '~icons/lucide/check';
	import Link from '~icons/lucide/link';
	import Puzzle from '~icons/lucide/puzzle';
	import Search from '~icons/lucide/search';
	import type { CatalogExtension } from '../../../shared/api.ts';
	import { coversViewport } from '#lib/attachments.ts';
	import { commands } from '#lib/commands.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import Button from './ui/Button.svelte';

	/**
	 * Adds an extension to the car: one of the ones the editor recommends, found by searching,
	 * or any other by pasting its GitHub address into the same field. Adding it is the CLI's
	 * `extension add`, in the task dialog.
	 */

	let query = $state('');
	let catalog = $state<CatalogExtension[] | undefined>();

	void window.smartify.catalog.extensions().then((list) => (catalog = list));

	/** Internal: a GitHub address the way two of them can be compared. */
	function key(url: string): string {
		return url
			.trim()
			.toLowerCase()
			.replace(/^(https?:\/\/)?(www\.)?/, '')
			.replace(/(\.git)?\/?$/, '');
	}

	const installed = $derived(
		new Set(
			(editor.project?.car.extensions ?? []).flatMap((extension) =>
				extension.source.url ? [key(extension.source.url)] : []
			)
		)
	);

	const found = $derived.by(() => {
		const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
		return (catalog ?? []).filter((extension) => {
			const text = `${extension.title} ${extension.description}`.toLowerCase();
			return words.every((word) => text.includes(word));
		});
	});

	// Something with a slash and no spaces is an address, `someone/smartify_os_dashcam` too,
	// which `extension add` takes as well.
	const address = $derived(/^\S+\/\S+$/.test(query.trim()) ? query.trim() : undefined);

	function add(url: string) {
		editor.addExtensionDialog = false;
		void editor.runTask(commands.addExtension(url));
	}

	function close() {
		editor.addExtensionDialog = false;
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	{@attach coversViewport}
	class="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-6 backdrop-blur-[3px]"
	role="dialog"
	aria-modal="true"
	aria-labelledby="add-extension-title"
>
	<div
		class="flex h-[min(36rem,100%)] w-full max-w-[38rem] flex-col rounded-2xl shadow-dialog glass"
	>
		<div class="flex flex-col gap-4 px-6 pt-6 pb-4">
			<div class="flex flex-col gap-1">
				<h2 id="add-extension-title" class="text-base font-semibold">Add an extension</h2>
				<p class="text-muted">Extensions add features to your car, like Android Auto.</p>
			</div>
			<label
				class="flex h-10 items-center gap-2.5 rounded-control border border-input bg-tint px-3 focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/25"
			>
				<Search class="size-4 shrink-0 text-muted" />
				<!-- svelte-ignore a11y_autofocus -->
				<input
					bind:value={query}
					autofocus
					placeholder="Search, or paste a GitHub address"
					class="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint"
				/>
			</label>
		</div>

		<div class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-auto px-6 pb-4">
			{#if address}
				<div
					class="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3.5"
				>
					<Link class="size-4 shrink-0 text-primary" />
					<span class="min-w-0 flex-1 truncate font-mono text-[13px]">{address}</span>
					<Button variant="primary" size="sm" onclick={() => add(address)}>Add</Button>
				</div>
			{/if}

			{#each found as extension (extension.url)}
				{@const added = installed.has(key(extension.url))}
				<div class="flex items-start gap-3 rounded-xl border border-line bg-tint p-3.5">
					<span
						class="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-bg text-muted"
					>
						<Puzzle class="size-4" />
					</span>
					<div class="flex min-w-0 flex-1 flex-col gap-0.5">
						<span class="font-medium">{extension.title}</span>
						<span class="text-[13px] text-muted">{extension.description}</span>
						<a
							href={extension.url}
							target="_blank"
							rel="noreferrer"
							class="truncate font-mono text-xs text-faint hover:text-fg hover:underline"
						>
							{extension.url.replace(/^https?:\/\//, '')}
						</a>
					</div>
					{#if added}
						<span class="flex h-8 shrink-0 items-center gap-1.5 text-[13px] text-muted">
							<Check class="size-4 text-good" /> In your car
						</span>
					{:else}
						<Button size="sm" disabled={!editor.cli?.found} onclick={() => add(extension.url)}>
							Add
						</Button>
					{/if}
				</div>
			{:else}
				{#if catalog && !address}
					<p class="px-1 py-6 text-center text-[13px] text-muted">
						Nothing found for "{query.trim()}". If you know where it is, paste its GitHub address
						above.
					</p>
				{/if}
			{/each}
		</div>

		<div class="flex justify-end gap-2 border-t border-line px-6 py-4">
			<Button variant="ghost" size="sm" onclick={close}>Close</Button>
		</div>
	</div>
</div>
