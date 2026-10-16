<script lang="ts" module>
	/** Where VS Code is downloaded, for every system. */
	const downloadUrl = 'https://code.visualstudio.com/download';

	/**
	 * What to add to VS Code for SmartifyOS. Running the app needs none of them (the editor
	 * does that), they show suggestions and mistakes while typing.
	 */
	const vsCodeExtensions = [
		{
			id: 'Dart-Code.flutter',
			name: 'Flutter',
			hint: "For your car's app. It brings the Dart extension along, which does the work.",
			forDevices: false
		},
		{
			id: 'platformio.platformio-ide',
			name: 'PlatformIO IDE',
			hint: 'For the programs of your devices. It sets up its own ESP32 tools the first time.',
			forDevices: true
		}
	];
</script>

<script lang="ts">
	import Download from '~icons/lucide/download';
	import ExternalLink from '~icons/lucide/external-link';
	import { coversViewport } from '#lib/attachments.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import Button from './ui/Button.svelte';

	/**
	 * Says VS Code is needed to edit the car's app or a device's program, with where to get it
	 * and what to add to it. Opened when VS Code is not found, or could not be started.
	 */
	let { folder, file, message }: { folder?: string; file?: string; message?: string } = $props();

	const hasDevices = $derived((editor.project?.devices.length ?? 0) > 0);
	const wanted = $derived(vsCodeExtensions.filter((e) => !e.forDevices || hasDevices));

	function close() {
		editor.vscodeDialog = undefined;
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	{@attach coversViewport}
	class="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-6 backdrop-blur-[3px]"
	role="dialog"
	aria-modal="true"
	aria-labelledby="vscode-title"
>
	<div class="flex w-full max-w-[30rem] flex-col rounded-2xl shadow-dialog glass">
		<div class="flex flex-col gap-4 p-6">
			{#if message}
				<div class="flex flex-col gap-1.5">
					<h2 id="vscode-title" class="text-base font-semibold">VS Code did not start</h2>
					<p class="selectable text-muted">{message}</p>
				</div>
			{:else}
				<div class="flex flex-col gap-1.5">
					<h2 id="vscode-title" class="text-base font-semibold">VS Code is needed for this</h2>
					<p class="text-muted">
						Your car's app and the programs of its devices are edited in VS Code, a free code
						editor. Install it, then come back and try again.
					</p>
				</div>
				<a
					href={downloadUrl}
					target="_blank"
					rel="noreferrer"
					class="flex items-center gap-2 self-start font-medium text-primary hover:underline"
				>
					<Download class="size-4" /> Download VS Code
				</a>

				<div class="flex flex-col gap-2">
					<p class="text-[13px] text-muted">
						Then add {wanted.length === 1 ? 'this extension' : 'these extensions'} to it. In VS Code,
						open Extensions on the left and search for the name.
					</p>
					<ul class="flex flex-col gap-1">
						{#each wanted as extension (extension.id)}
							<li class="rounded-xl border border-line bg-tint px-3.5 py-2.5">
								<a
									href={`https://marketplace.visualstudio.com/items?itemName=${extension.id}`}
									target="_blank"
									rel="noreferrer"
									class="flex items-center gap-1.5 font-medium hover:underline"
								>
									{extension.name}
									<ExternalLink class="size-3.5 text-muted" />
								</a>
								<p class="text-[13px] text-muted">{extension.hint}</p>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

		<div class="flex justify-end gap-2 border-t border-line px-6 py-4">
			<Button variant="ghost" size="sm" onclick={close}>Close</Button>
			<Button variant="primary" size="sm" onclick={() => editor.openInVsCode(folder, file)}>
				Try again
			</Button>
		</div>
	</div>
</div>
