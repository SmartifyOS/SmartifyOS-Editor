<script lang="ts">
	import Editor from '#lib/components/Editor.svelte';
	import NewCarDialog from '#lib/components/NewCarDialog.svelte';
	import PromptDialog from '#lib/components/PromptDialog.svelte';
	import StatusBar from '#lib/components/StatusBar.svelte';
	import TitleBar from '#lib/components/TitleBar.svelte';
	import UpdateDialog from '#lib/components/UpdateDialog.svelte';
	import Welcome from '#lib/components/Welcome.svelte';
	import { editor } from '#lib/state/editor.svelte.ts';

	const prompt = $derived(editor.prompts[0]);
	const update = $derived(editor.update);
</script>

<div class="flex h-screen flex-col">
	<TitleBar />
	{#if editor.project}
		{#key editor.project.path}
			<Editor />
		{/key}
	{:else}
		<Welcome />
	{/if}
	<StatusBar />
</div>

{#if editor.newCarDialog}
	<NewCarDialog />
{/if}

{#if prompt}
	{#key `${prompt.jobId}:${prompt.prompt.id}`}
		<PromptDialog open={prompt} />
	{/key}
{:else if editor.updateDialog && update.status === 'ready'}
	<UpdateDialog version={update.version} notesUrl={update.notesUrl} />
{/if}
