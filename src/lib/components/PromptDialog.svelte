<script lang="ts">
	import { coversViewport } from '#lib/attachments.ts';
	import { editor, type OpenPrompt } from '#lib/state/editor.svelte.ts';

	/**
	 * A question the CLI asks while it works, answered here instead of in a terminal. Every
	 * kind of question the CLI's `--json` protocol has is drawn the same generic way, so a
	 * new command needs nothing here to be usable.
	 */
	let { open }: { open: OpenPrompt } = $props();

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

<div
	{@attach coversViewport}
	class="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-6 backdrop-blur-[2px]"
	role="dialog"
	aria-modal="true"
	aria-labelledby="prompt-message"
>
	<form
		onsubmit={submit}
		class="flex w-full max-w-md flex-col gap-4 rounded-xl border border-line-strong bg-raised p-5 shadow-2xl shadow-black/60"
	>
		<h2 id="prompt-message" class="text-[15px] font-medium whitespace-pre-line">
			{prompt.message}
		</h2>

		{#if prompt.kind === 'select'}
			<div class="flex max-h-80 flex-col gap-1 overflow-auto">
				{#each prompt.options ?? [] as option, index (index)}
					<button
						type="button"
						disabled={open.answered}
						class={[
							'flex flex-col rounded-lg border px-3 py-2 text-left transition-colors',
							option.value === prompt.initialValue
								? 'border-accent/50 bg-accent-soft'
								: 'border-line hover:bg-hover'
						]}
						onclick={() => editor.answer(open, option.value)}
					>
						<span>{option.label}</span>
						{#if option.hint}<span class="text-xs text-muted">{option.hint}</span>{/if}
					</button>
				{/each}
			</div>
		{:else if prompt.kind === 'multiselect'}
			<div class="flex max-h-80 flex-col gap-1 overflow-auto">
				{#each prompt.options ?? [] as option, index (index)}
					<label
						class="flex cursor-pointer items-start gap-3 rounded-lg border border-line px-3 py-2 hover:bg-hover"
					>
						<input
							type="checkbox"
							class="mt-0.5 accent-[var(--color-accent)]"
							checked={picked.includes(option.value)}
							onchange={() => toggle(option.value)}
						/>
						<span class="flex flex-col">
							<span>{option.label}</span>
							{#if option.hint}<span class="text-xs text-muted">{option.hint}</span>{/if}
						</span>
					</label>
				{/each}
			</div>
		{:else if prompt.kind === 'text' || prompt.kind === 'password'}
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type={prompt.kind === 'password' ? 'password' : 'text'}
				bind:value={text}
				placeholder={prompt.placeholder}
				autofocus
				class="rounded-lg border border-line-strong bg-frame px-3 py-2 outline-none focus:border-accent"
			/>
		{/if}

		{#if open.invalid}
			<p class="text-xs text-bad">{open.invalid}</p>
		{/if}

		<div class="flex justify-end gap-2">
			<button
				type="button"
				class="rounded-lg px-3 py-1.5 text-muted hover:bg-hover hover:text-fg"
				onclick={() => editor.cancelPrompt(open)}
			>
				Cancel
			</button>
			{#if prompt.kind === 'confirm'}
				<button
					type="button"
					disabled={open.answered}
					class="rounded-lg bg-active px-4 py-1.5 hover:bg-line-strong"
					onclick={() => editor.answer(open, false)}
				>
					No
				</button>
				<!-- svelte-ignore a11y_autofocus -->
				<button
					type="button"
					disabled={open.answered}
					autofocus
					class="rounded-lg bg-accent px-4 py-1.5 font-medium text-frame hover:bg-accent-strong"
					onclick={() => editor.answer(open, true)}
				>
					Yes
				</button>
			{:else if prompt.kind !== 'select'}
				<button
					type="submit"
					disabled={open.answered}
					class="rounded-lg bg-accent px-4 py-1.5 font-medium text-frame hover:bg-accent-strong"
				>
					Continue
				</button>
			{/if}
		</div>
	</form>
</div>
