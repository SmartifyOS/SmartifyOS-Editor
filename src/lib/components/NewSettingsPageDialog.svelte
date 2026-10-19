<script lang="ts">
	import LoaderCircle from '~icons/lucide/loader-circle';
	import Settings from '~icons/lucide/settings';
	import { coversViewport } from '#lib/attachments.ts';
	import IconPicker from './IconPicker.svelte';
	import type { Problem } from '#lib/state/editor.svelte.ts';
	import { settingsPages } from '#lib/state/settings.svelte.ts';
	import Button from './ui/Button.svelte';
	import Select from './ui/Select.svelte';

	/**
	 * Makes a settings page of the car's own: what it is called, the page of Settings it goes
	 * in, and its icon. The CLI makes it (`smartify-os settings create`), then its rows are
	 * added in the inspector.
	 */

	let name = $state('');
	let parent = $state('vehicle');
	let icon = $state('settings');
	let creating = $state(false);
	let problem = $state<Problem | undefined>();

	const parents = $derived(settingsPages.parents());

	async function create() {
		if (!name.trim() || creating) return;
		creating = true;
		problem = await settingsPages.create(name.trim(), parent, icon);
		creating = false;
		if (!problem) close();
	}

	function close() {
		settingsPages.dialog = false;
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape' && !creating) close();
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	{@attach coversViewport}
	class="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-6 backdrop-blur-[3px]"
	role="dialog"
	aria-modal="true"
	aria-labelledby="new-settings-title"
>
	<div class="flex max-h-full w-full max-w-[34rem] flex-col rounded-2xl shadow-dialog glass">
		<div class="flex items-start gap-3.5 px-6 pt-6 pb-2">
			<span
				class="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-bg text-muted"
			>
				<Settings class="size-5" />
			</span>
			<div class="flex flex-col gap-1">
				<h2 id="new-settings-title" class="text-base font-semibold">New settings page</h2>
				<p class="text-[13px] text-muted">
					A page of your own in Settings, with switches, choices, buttons and information on it. The
					driver opens it from its row on the page you put it in.
				</p>
			</div>
		</div>

		<div class="flex min-h-0 flex-col gap-5 overflow-auto px-6 py-4">
			<label class="flex flex-col gap-2">
				<span class="font-medium">What is it called?</span>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					bind:value={name}
					placeholder="Seat heating"
					autofocus
					class="h-10 rounded-control border border-input bg-tint px-3 outline-none placeholder:text-faint focus:border-primary/70 focus:ring-2 focus:ring-primary/25"
					onkeydown={(event) => event.key === 'Enter' && void create()}
				/>
			</label>

			<div class="flex flex-col gap-2">
				<span class="font-medium">Where in Settings does it go?</span>
				<Select
					class="h-10 w-full"
					options={parents.map((page) => ({ value: page.id, label: page.title }))}
					bind:value={parent}
				/>
				<span class="text-[13px] text-muted">
					Its row shows up on that page. You can move it later.
				</span>
			</div>

			<div class="flex flex-col gap-2">
				<span class="font-medium">Which icon?</span>
				<IconPicker value={icon} large onpick={(picked) => (icon = picked)} />
			</div>

			{#if problem}
				<p class="text-[13px] text-bad">
					{problem.message}
					{#if problem.hint}<span class="text-muted">{problem.hint}</span>{/if}
				</p>
			{/if}
		</div>

		<div class="flex items-center justify-end gap-2 border-t border-line px-6 py-4">
			<Button variant="ghost" size="sm" disabled={creating} onclick={close}>Cancel</Button>
			<Button variant="primary" size="sm" disabled={!name.trim() || creating} onclick={create}>
				{#if creating}<LoaderCircle class="animate-spin" />{/if}
				Create
			</Button>
		</div>
	</div>
</div>
