<script lang="ts">
	import Check from '~icons/lucide/check';
	import { editor, type OpenPrompt } from '#lib/state/editor.svelte.ts';
	import Button from './ui/Button.svelte';

	/**
	 * A question the CLI asks while it works, answered here instead of in a terminal. Every
	 * kind of question the CLI's `--json` protocol has is drawn the same generic way, so a
	 * new command needs nothing here to be usable. Shown in a dialog of its own
	 * (PromptDialog), or inside the task dialog for the command it belongs to.
	 */
	let { open, class: className = '' }: { open: OpenPrompt; class?: string } = $props();

	const prompt = $derived(open.prompt);
	// svelte-ignore state_referenced_locally
	let text = $state(typeof open.prompt.initialValue === 'string' ? open.prompt.initialValue : '');
	// svelte-ignore state_referenced_locally
	let picked = $state<unknown[]>(
		Array.isArray(open.prompt.initialValue) ? [...open.prompt.initialValue] : []
	);

	function toggle(value: unknown) {
		picked = picked.includes(value) ? picked.filter((v) => v !== value) : [...picked, value];
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (prompt.kind === 'multiselect') editor.answer(open, picked);
		else editor.answer(open, text);
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') editor.cancelPrompt(open);
	}
</script>

<svelte:window onkeydown={onKey} />

<form onsubmit={submit} aria-labelledby="prompt-message" class={['flex flex-col', className]}>
	<div class="flex flex-col gap-4 p-6">
		<h2 id="prompt-message" class="text-base font-semibold whitespace-pre-line">
			{prompt.message}
		</h2>

		{#if prompt.kind === 'select'}
			<div class="-mx-1 flex max-h-80 flex-col gap-1 overflow-auto px-1">
				{#each prompt.options ?? [] as option, index (index)}
					<button
						type="button"
						disabled={open.answered}
						class={[
							'flex flex-col rounded-xl border px-3.5 py-2.5 text-left transition-colors',
							option.value === prompt.initialValue
								? 'border-primary/50 bg-primary/10'
								: 'border-line bg-tint hover:bg-hover'
						]}
						onclick={() => editor.answer(open, option.value)}
					>
						<span class="font-medium">{option.label}</span>
						{#if option.hint}<span class="text-[13px] text-muted">{option.hint}</span>{/if}
					</button>
				{/each}
			</div>
		{:else if prompt.kind === 'multiselect'}
			<div class="-mx-1 flex max-h-80 flex-col gap-1 overflow-auto px-1">
				{#each prompt.options ?? [] as option, index (index)}
					{@const checked = picked.includes(option.value)}
					<button
						type="button"
						role="checkbox"
						aria-checked={checked}
						class="flex items-start gap-3 rounded-xl border border-line bg-tint px-3.5 py-2.5 text-left hover:bg-hover"
						onclick={() => toggle(option.value)}
					>
						<span
							class={[
								'mt-0.5 grid size-4 shrink-0 place-items-center rounded-[5px] border',
								checked ? 'border-primary bg-primary text-white' : 'border-line-strong'
							]}
						>
							{#if checked}<Check class="size-3" />{/if}
						</span>
						<span class="flex flex-col">
							<span class="font-medium">{option.label}</span>
							{#if option.hint}<span class="text-[13px] text-muted">{option.hint}</span>{/if}
						</span>
					</button>
				{/each}
			</div>
		{:else if prompt.kind === 'text' || prompt.kind === 'password'}
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type={prompt.kind === 'password' ? 'password' : 'text'}
				bind:value={text}
				placeholder={prompt.placeholder}
				autofocus
				class="h-10 rounded-control border border-input bg-tint px-3 outline-none placeholder:text-faint focus:border-primary/70 focus:ring-2 focus:ring-primary/25"
			/>
		{/if}

		{#if open.invalid}
			<p class="text-[13px] text-bad">{open.invalid}</p>
		{/if}
	</div>

	<div class="flex justify-end gap-2 border-t border-line px-6 py-4">
		<Button variant="ghost" size="sm" onclick={() => editor.cancelPrompt(open)}>Cancel</Button>
		{#if prompt.kind === 'confirm'}
			<Button size="sm" disabled={open.answered} onclick={() => editor.answer(open, false)}>
				No
			</Button>
			<!-- svelte-ignore a11y_autofocus -->
			<Button
				variant="primary"
				size="sm"
				disabled={open.answered}
				autofocus
				onclick={() => editor.answer(open, true)}
			>
				Yes
			</Button>
		{:else if prompt.kind !== 'select'}
			<Button variant="primary" size="sm" type="submit" disabled={open.answered}>Continue</Button>
		{/if}
	</div>
</form>
