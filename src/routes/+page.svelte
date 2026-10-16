<script lang="ts">
	import Editor from '#lib/components/Editor.svelte';
	import Welcome from '#lib/components/Welcome.svelte';
	import { editor } from '#lib/state/editor.svelte.ts';
</script>

{#if editor.project}
	{#key editor.project.path}
		<Editor />
	{/key}
{:else}
	<Welcome />
{/if}
