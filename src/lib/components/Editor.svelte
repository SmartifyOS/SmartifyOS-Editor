<script lang="ts">
	import { untrack } from 'svelte';
	import { isCommand } from '#lib/shortcuts.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import { bus } from '#lib/state/bus.svelte.ts';
	import { look } from '#lib/state/look.svelte.ts';
	import { parts } from '#lib/state/parts.svelte.ts';
	import { settingsPages } from '#lib/state/settings.svelte.ts';
	import { remembered } from '#lib/state/remembered.svelte.ts';
	import CarPanel from './CarPanel.svelte';
	import ConsolePanel from './ConsolePanel.svelte';
	import InspectorPanel from './InspectorPanel.svelte';
	import Splitter from './Splitter.svelte';
	import Viewport from './Viewport.svelte';

	/** The editor's areas around the live preview, laid out like Unity's. */

	// How the car looks, read again whenever the car is (a task may have changed it), and what
	// the running app has to offer.
	$effect(() => {
		if (!editor.project) return;
		void look.read();
		void parts.read();
		void settingsPages.read();
	});
	// A file changed outside the editor, in VS Code most likely: what it shows from that file is
	// read again, so the inspector never shows something the file no longer says.
	$effect(() => {
		const paths = editor.filesChanged?.paths;
		if (!paths) return;
		const any = (...prefixes: string[]) =>
			paths.some((path) => prefixes.some((prefix) => path.startsWith(prefix)));
		const main = any('lib/main.dart', 'pubspec.yaml');
		untrack(() => {
			if (main) void look.read();
			if (main || any('lib/windows/', 'lib/quick_settings/', 'lib/home_widgets/')) {
				void parts.read();
			}
			if (main || any('lib/settings/')) void settingsPages.read();
		});
	});

	// Only when it starts or stops, not on every change of how it is shown.
	const appRunning = $derived(editor.preview.status === 'running');
	$effect(() => {
		if (appRunning) {
			void look.describe();
			bus.follow();
		} else {
			look.forgetApp();
			bus.stop();
		}
	});

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
