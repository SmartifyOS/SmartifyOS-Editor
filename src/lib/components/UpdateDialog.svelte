<script lang="ts">
	import icon from '#lib/assets/icon.png';
	import { coversViewport } from '#lib/attachments.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import Button from './ui/Button.svelte';

	/**
	 * Says a downloaded update is ready, and restarts into it. Opens by itself once per
	 * version; "Later" leaves it for the next quit, or for the button in the status bar.
	 */
	let { version, notesUrl }: { version: string; notesUrl?: string } = $props();

	function later() {
		editor.updateDialog = false;
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') later();
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	{@attach coversViewport}
	class="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-6 backdrop-blur-[3px]"
	role="dialog"
	aria-modal="true"
	aria-labelledby="update-title"
>
	<div class="flex w-full max-w-[26rem] flex-col rounded-2xl shadow-dialog glass">
		<div class="flex flex-col items-center gap-4 px-6 pt-7 pb-6 text-center">
			<img src={icon} alt="" class="size-14 rounded-[13px] shadow-float" draggable="false" />
			<div class="flex flex-col gap-1.5">
				<h2 id="update-title" class="text-base font-semibold">An update is ready</h2>
				<p class="text-[13.5px] text-muted">
					SmartifyOS Editor {version} is downloaded. Restart to start using it.
					{#if editor.running}Your car's app stops while the editor restarts.{/if}
				</p>
				{#if notesUrl}
					<a
						href={notesUrl}
						target="_blank"
						rel="noreferrer"
						class="text-[13px] font-medium text-primary hover:underline"
					>
						See what is new
					</a>
				{/if}
			</div>
		</div>
		<div class="flex justify-end gap-2 border-t border-line px-6 py-4">
			<Button variant="ghost" size="sm" onclick={later}>Later</Button>
			<!-- svelte-ignore a11y_autofocus -->
			<Button variant="primary" size="sm" autofocus onclick={() => editor.restartToUpdate()}>
				Restart now
			</Button>
		</div>
	</div>
</div>
