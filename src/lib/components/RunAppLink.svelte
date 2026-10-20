<script lang="ts">
	import LoaderCircle from '~icons/lucide/loader-circle';
	import { editor } from '#lib/state/editor.svelte.ts';

	/**
	 * A link in a line of text that starts the car's app, for the places that can only show
	 * something while it runs. Drawn like the More and Less of a setting's explanation.
	 */
	let { label = 'Run it' }: { label?: string } = $props();

	const status = $derived(editor.preview.status);
</script>

{#if status === 'starting'}
	<span class="inline-flex items-center gap-1 text-faint">
		<LoaderCircle class="size-3 animate-spin" /> Starting
	</span>
{:else if status !== 'running' && status !== 'stopping'}
	<button
		type="button"
		class="cursor-default text-fg underline decoration-line-strong underline-offset-2 hover:decoration-fg"
		onclick={() => editor.toggleRun()}>{label}</button
	>
{/if}
