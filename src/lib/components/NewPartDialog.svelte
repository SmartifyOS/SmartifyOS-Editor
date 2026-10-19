<script lang="ts">
	import LoaderCircle from '~icons/lucide/loader-circle';
	import VsCode from '~icons/logos/visual-studio-code';
	import type { PartKind, PartVariant } from '../../../shared/cli.ts';
	import { coversViewport } from '#lib/attachments.ts';
	import { defaultIcons, kindWords } from '#lib/parts.ts';
	import IconPicker from './IconPicker.svelte';
	import type { Problem } from '#lib/state/editor.svelte.ts';
	import { parts } from '#lib/state/parts.svelte.ts';
	import Button from './ui/Button.svelte';

	/**
	 * Makes a window, quick settings tile or home screen widget: what it is called, what kind it
	 * is and its icon. The CLI makes it (`smartify-os window create` and the others), and it opens
	 * in VS Code where what it shows or does is written.
	 */

	let { kind }: { kind: PartKind } = $props();

	const words = $derived(kindWords[kind]);
	let name = $state('');
	// svelte-ignore state_referenced_locally
	let variant = $state<PartVariant>(kindWords[kind].variants[0]!.id);
	// svelte-ignore state_referenced_locally
	let icon = $state(defaultIcons[kind]);
	let creating = $state(false);
	let problem = $state<Problem | undefined>();

	async function create() {
		if (!name.trim() || creating) return;
		creating = true;
		problem = undefined;
		problem = await parts.create(kind, name.trim(), variant, icon);
		creating = false;
		if (!problem) close();
	}

	function close() {
		parts.dialog = undefined;
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
	aria-labelledby="new-part-title"
>
	<div class="flex max-h-full w-full max-w-[34rem] flex-col rounded-2xl shadow-dialog glass">
		<div class="flex items-start gap-3.5 px-6 pt-6 pb-2">
			<span
				class="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-bg text-muted"
			>
				<words.icon class="size-5" />
			</span>
			<div class="flex flex-col gap-1">
				<h2 id="new-part-title" class="text-base font-semibold">{words.create}</h2>
				<p class="text-[13px] text-muted">{words.about}</p>
			</div>
		</div>

		<div class="flex min-h-0 flex-col gap-5 overflow-auto px-6 py-4">
			<label class="flex flex-col gap-2">
				<span class="font-medium">What is it called?</span>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					bind:value={name}
					placeholder={words.example}
					autofocus
					class="h-10 rounded-control border border-input bg-tint px-3 outline-none placeholder:text-faint focus:border-primary/70 focus:ring-2 focus:ring-primary/25"
					onkeydown={(event) => event.key === 'Enter' && void create()}
				/>
				<span class="text-[13px] text-muted">The driver reads this. You can change it later.</span>
			</label>

			<div class="flex flex-col gap-2">
				<span class="font-medium">What kind?</span>
				<div class="grid grid-cols-2 gap-2.5">
					{#each words.variants as choice (choice.id)}
						{@const picked = variant === choice.id}
						<button
							type="button"
							aria-pressed={picked}
							class={[
								'flex flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-colors',
								picked ? 'border-primary/60 bg-primary/10' : 'border-line bg-tint hover:bg-hover'
							]}
							onclick={() => (variant = choice.id)}
						>
							<choice.icon class={['size-5', picked ? 'text-primary' : 'text-muted']} />
							<span class="flex flex-col gap-0.5">
								<span class="font-medium">{choice.label}</span>
								<span class="text-[13px] text-muted">{choice.hint}</span>
							</span>
						</button>
					{/each}
				</div>
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

		<div class="flex items-center gap-2 border-t border-line px-6 py-4">
			<span class="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-muted">
				<VsCode class="size-3.5 shrink-0" />
				<span>Then it opens in VS Code, to {words.write.toLowerCase()}.</span>
			</span>
			<Button variant="ghost" size="sm" disabled={creating} onclick={close}>Cancel</Button>
			<Button variant="primary" size="sm" disabled={!name.trim() || creating} onclick={create}>
				{#if creating}<LoaderCircle class="animate-spin" />{/if}
				Create
			</Button>
		</div>
	</div>
</div>
