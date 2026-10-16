<script lang="ts">
	import { isCommand } from '#lib/shortcuts.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import { remembered } from '#lib/state/remembered.svelte.ts';
	import CarPanel from './CarPanel.svelte';
	import ConsolePanel from './ConsolePanel.svelte';
	import InspectorPanel from './InspectorPanel.svelte';
	import Splitter from './Splitter.svelte';
	import Viewport from './Viewport.svelte';

	/** The editor's areas around the live preview, laid out like Unity's. */

	const left = remembered('layout.left', 272);
	const right = remembered('layout.right', 312);
	const bottom = remembered('layout.bottom', 240);

	function onKey(event: KeyboardEvent) {
		if (!isCommand(event)) return;
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

<div class="flex min-h-0 flex-1">
	<div class="flex min-h-0 shrink-0 flex-col" style:width="{left.value}px">
		<CarPanel />
	</div>
	<Splitter bind:size={left.value} edge="left" min={200} max={480} />

	<div class="flex min-h-0 min-w-0 flex-1 flex-col">
		<div class="flex min-h-0 flex-1 flex-col">
			<Viewport />
		</div>
		<Splitter bind:size={bottom.value} edge="bottom" min={100} max={640} />
		<div class="flex min-h-0 shrink-0 flex-col" style:height="{bottom.value}px">
			<ConsolePanel />
		</div>
	</div>

	<Splitter bind:size={right.value} edge="right" min={240} max={560} />
	<div class="flex min-h-0 shrink-0 flex-col" style:width="{right.value}px">
		<InspectorPanel />
	</div>
</div>
