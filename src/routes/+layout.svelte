<script lang="ts">
	import './layout.css';
	import { goto } from '$app/navigation';
	import type { LayoutProps } from './$types';
	import AddExtensionDialog from '#lib/components/AddExtensionDialog.svelte';
	import NewCarDialog from '#lib/components/NewCarDialog.svelte';
	import PromptDialog from '#lib/components/PromptDialog.svelte';
	import StatusBar from '#lib/components/StatusBar.svelte';
	import TaskDialog from '#lib/components/TaskDialog.svelte';
	import TitleBar from '#lib/components/TitleBar.svelte';
	import UpdateDialog from '#lib/components/UpdateDialog.svelte';
	import VsCodeDialog from '#lib/components/VsCodeDialog.svelte';
	import { isCommand } from '#lib/shortcuts.ts';
	import { editor } from '#lib/state/editor.svelte.ts';

	/** The window around every page: the title bar, the status bar, and the dialogs. */
	let { children }: LayoutProps = $props();

	$effect(() => editor.start());

	// The app menu has Settings on macOS, the other systems have no menu bar.
	$effect(() => window.smartify.settings.onOpen(() => void goto('#/settings')));

	function onKey(event: KeyboardEvent) {
		if (isCommand(event) && event.key === ',') {
			event.preventDefault();
			void goto('#/settings');
		}
	}

	// The task dialog asks its own command's questions.
	const prompt = $derived(editor.prompts.find((open) => open.jobId !== editor.task?.jobId));
	const update = $derived(editor.update);
</script>

<svelte:head>
	<title>SmartifyOS Editor</title>
</svelte:head>

<svelte:window onkeydown={onKey} />

<div class="flex h-screen flex-col">
	<TitleBar />
	{@render children()}
	<StatusBar />
</div>

{#if editor.newCarDialog}
	<NewCarDialog />
{/if}

{#if editor.addExtensionDialog}
	<AddExtensionDialog />
{/if}

{#if editor.task && !editor.task.hidden}
	<TaskDialog task={editor.task} />
{/if}

{#if editor.vscodeDialog}
	<VsCodeDialog {...editor.vscodeDialog} />
{/if}

{#if prompt}
	{#key `${prompt.jobId}:${prompt.prompt.id}`}
		<PromptDialog open={prompt} />
	{/key}
{:else if editor.updateDialog && update.status === 'ready'}
	<UpdateDialog version={update.version} notesUrl={update.notesUrl} />
{/if}
