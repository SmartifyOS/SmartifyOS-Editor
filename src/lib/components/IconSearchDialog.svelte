<script lang="ts">
	import LoaderCircle from '~icons/lucide/loader-circle';
	import Search from '~icons/lucide/search';
	import { coversViewport } from '#lib/attachments.ts';
	import { materialIcons } from '#lib/materialIcons.svelte.ts';
	import Button from './ui/Button.svelte';

	/**
	 * Every icon in Flutter's `Icons` to pick from, found by its name. Opened from the "More
	 * icons" button under the few the inspector offers first.
	 */

	let {
		value,
		onpick,
		onclose
	}: { value: string | null; onpick: (name: string) => void; onclose: () => void } = $props();

	let query = $state('');
	let loaded = $state(false);
	const found = $derived(loaded ? materialIcons.search(query) : []);

	$effect(() => {
		void materialIcons.load().then(() => (loaded = true));
	});

	function pick(name: string) {
		onpick(name);
		onclose();
	}

	function onKey(event: KeyboardEvent) {
		// Kept from a dialog this one is opened over, which would close too.
		event.stopPropagation();
		if (event.key === 'Escape') onclose();
		if (event.key === 'Enter' && found.length === 1 && found[0]) pick(found[0].name);
	}
</script>

<div
	{@attach coversViewport}
	class="fixed inset-0 z-[110] grid place-items-center bg-black/45 p-6 backdrop-blur-[3px]"
	role="dialog"
	aria-modal="true"
	aria-labelledby="icon-search-title"
	tabindex="-1"
	onkeydown={onKey}
>
	<div
		class="flex h-full max-h-[40rem] w-full max-w-[40rem] flex-col rounded-2xl shadow-dialog glass"
	>
		<div class="flex flex-col gap-3 px-6 pt-6 pb-3">
			<h2 id="icon-search-title" class="text-base font-semibold">Pick an icon</h2>
			<label
				class="flex h-10 items-center gap-2 rounded-control border border-input bg-tint px-3 focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/25"
			>
				<Search class="size-4 shrink-0 text-faint" />
				<!-- svelte-ignore a11y_autofocus -->
				<input
					bind:value={query}
					placeholder="Search, like fuel, seat or light"
					aria-label="Search the icons"
					autofocus
					class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint"
				/>
			</label>
		</div>

		<div class="min-h-0 flex-1 overflow-auto px-6 pb-4">
			{#if !loaded}
				<div class="grid h-full place-items-center">
					<LoaderCircle class="size-5 animate-spin text-faint" />
				</div>
			{:else if found.length === 0}
				<p class="py-8 text-center text-[13px] text-muted">
					No icon is called that. Try another word.
				</p>
			{:else}
				<div class="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1">
					{#each found as icon (icon.name)}
						{@const picked = icon.name === value}
						<button
							type="button"
							title={`Icons.${icon.name}`}
							aria-pressed={picked}
							class={[
								'flex flex-col items-center gap-1.5 rounded-lg border px-1 py-2.5 transition-colors',
								picked
									? 'border-primary/60 bg-primary/10 text-primary'
									: 'border-transparent text-muted hover:bg-hover hover:text-fg'
							]}
							onclick={() => pick(icon.name)}
						>
							<svg viewBox="0 0 24 24" class="size-6" aria-hidden="true">
								<!-- Paths from the icon set that ships with the editor. -->
								{@html materialIcons.body(icon.name)}
							</svg>
							<span class="line-clamp-2 text-center text-xs leading-tight break-words">
								{icon.label}
							</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex items-center gap-2 border-t border-line px-6 py-4">
			<span class="flex-1 text-[13px] text-muted">
				{loaded ? `${found.length} of ${materialIcons.all.length} icons` : ''}
			</span>
			<Button size="sm" onclick={onclose}>Cancel</Button>
		</div>
	</div>
</div>
