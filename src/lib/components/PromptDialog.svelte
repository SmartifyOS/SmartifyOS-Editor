<script lang="ts">
	import { coversViewport } from '#lib/attachments.ts';
	import type { OpenPrompt } from '#lib/state/editor.svelte.ts';
	import PromptForm from './PromptForm.svelte';

	/** A question of a command that has no dialog of its own, asked in one. */
	let { open }: { open: OpenPrompt } = $props();
</script>

<div
	{@attach coversViewport}
	class="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-6 backdrop-blur-[3px]"
	role="dialog"
	aria-modal="true"
	aria-labelledby="prompt-message"
>
	<PromptForm {open} class="w-full max-w-[30rem] rounded-2xl shadow-dialog glass" />
</div>
