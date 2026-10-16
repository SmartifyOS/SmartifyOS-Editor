<script lang="ts">
	import { editor } from '#lib/state/editor.svelte.ts';
	import { remembered } from '#lib/state/remembered.svelte.ts';
	import CarPanel from './CarPanel.svelte';
	import ConsolePanel from './ConsolePanel.svelte';
	import InspectorPanel from './InspectorPanel.svelte';
	import Splitter from './Splitter.svelte';
	import Viewport from './Viewport.svelte';

	/** The editor's panels around the live preview, laid out like Unity's. */

	const left = remembered('layout.left', 260);
	const right = remembered('layout.right', 300);
	const bottom = remembered('layout.bottom', 220);

	// svelte-ignore state_referenced_locally
	let selected = $state<string | undefined>(editor.project?.car.smartifyOs.name);

	function onKey(event: KeyboardEvent) {
		const mod = window.smartify.platform === 'darwin' ? event.metaKey : event.ctrlKey;
		if (!mod || event.altKey) return;
		const key = event.key.toLowerCase();
		if (key === 'p' && !event.shiftKey) {
			event.preventDefault();
			editor.toggleRun();
		} else if (key === 'r') {
			event.preventDefault();
			if (event.shiftKey) editor.restart();
			else editor.reload();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="flex min-h-0 flex-1 gap-1 p-1">
	<div class="flex min-h-0 shrink-0 flex-col" style:width="{left.value}px">
		<CarPanel bind:selected />
	</div>
	<Splitter bind:size={left.value} edge="left" min={180} max={480} />

	<div class="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
		<div class="flex min-h-0 flex-1 flex-col">
			<Viewport />
		</div>
		<Splitter bind:size={bottom.value} edge="bottom" min={90} max={600} />
		<div class="flex min-h-0 shrink-0 flex-col" style:height="{bottom.value}px">
			<ConsolePanel />
		</div>
	</div>

	<Splitter bind:size={right.value} edge="right" min={220} max={520} />
	<div class="flex min-h-0 shrink-0 flex-col" style:width="{right.value}px">
		<InspectorPanel {selected} />
	</div>
</div>
