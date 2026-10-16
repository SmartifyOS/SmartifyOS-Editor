<script lang="ts">
	import Play from '~icons/lucide/play';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import AppWindow from '~icons/lucide/app-window';
	import TriangleAlert from '~icons/lucide/triangle-alert';
	import { editor } from '#lib/state/editor.svelte.ts';
	import { remembered } from '#lib/state/remembered.svelte.ts';
	import Panel from './Panel.svelte';

	/**
	 * The live preview. The running app is a real window of its own, which the main process
	 * keeps exactly over the frame in here (see electron/preview/), so this component only
	 * says where the frame is and shows what is going on while there is no app to show.
	 */

	const aspects = [
		{ id: 'free', label: 'Fill', ratio: undefined },
		{ id: '16:9', label: '16:9', ratio: 16 / 9 },
		{ id: '8:3', label: '8:3 (1280×480)', ratio: 8 / 3 },
		{ id: '5:3', label: '5:3 (800×480)', ratio: 5 / 3 },
		{ id: '4:3', label: '4:3', ratio: 4 / 3 }
	] as const;

	const aspect = remembered('viewport.aspect', 'free');
	const mod = window.smartify.platform === 'darwin' ? '⌘' : 'Ctrl+';

	let area = $state<HTMLDivElement>();
	let frame = $state<HTMLDivElement>();
	let areaWidth = $state(0);
	let areaHeight = $state(0);

	/** The largest frame of the chosen shape that fits, with a little room around it. */
	const size = $derived.by(() => {
		const ratio = aspects.find((a) => a.id === aspect.value)?.ratio;
		const pad = ratio ? 16 : 0;
		const width = Math.max(0, areaWidth - pad * 2);
		const height = Math.max(0, areaHeight - pad * 2);
		if (!ratio) return { width, height };
		return width / height > ratio
			? { width: Math.round(height * ratio), height }
			: { width, height: Math.round(width / ratio) };
	});

	const covered = $derived(editor.overlays > 0);
	let lastSent = '';

	function report() {
		if (!frame) return;
		let rect: { x: number; y: number; width: number; height: number } | null = null;
		if (!covered && document.visibilityState === 'visible') {
			const box = frame.getBoundingClientRect();
			rect = { x: box.x, y: box.y, width: box.width, height: box.height };
		}
		const key = JSON.stringify(rect);
		if (key === lastSent) return;
		lastSent = key;
		window.smartify.preview.setViewport(rect);
	}

	$effect(() => {
		if (!area) return;
		const observer = new ResizeObserver(([entry]) => {
			if (!entry) return;
			areaWidth = entry.contentRect.width;
			areaHeight = entry.contentRect.height;
		});
		observer.observe(area);
		const onChange = () => report();
		window.addEventListener('resize', onChange);
		document.addEventListener('visibilitychange', onChange);
		return () => {
			observer.disconnect();
			window.removeEventListener('resize', onChange);
			document.removeEventListener('visibilitychange', onChange);
			window.smartify.preview.setViewport(null);
			lastSent = '';
		};
	});

	// Measured after the frame has its new size, and whenever a dialog opens or closes.
	$effect(() => {
		void size.width;
		void size.height;
		void covered;
		requestAnimationFrame(report);
	});

	const lastLine = $derived.by(() => {
		for (let i = editor.consoleLines.length - 1; i >= 0; i--) {
			const line = editor.consoleLines[i];
			if (line?.source === 'preview' && line.text.trim()) return line.text.split('\n')[0];
		}
		return undefined;
	});

	const preview = $derived(editor.preview);
	const modeLabel = $derived(
		preview.status !== 'running'
			? undefined
			: preview.mode === 'embedded'
				? 'Embedded'
				: preview.mode === 'overlay'
					? 'Following the editor'
					: 'Own window'
	);
</script>

<Panel title="Preview">
	{#snippet actions()}
		{#if modeLabel}
			<span class="mr-2 flex items-center gap-1.5 text-xs text-faint">
				<span class="size-1.5 rounded-full bg-good"></span>{modeLabel}
			</span>
		{/if}
		<select
			bind:value={aspect.value}
			title="The shape of your car's screen"
			class="h-6 rounded-md border border-line bg-raised px-1.5 text-xs text-muted outline-none hover:text-fg"
		>
			{#each aspects as option (option.id)}
				<option value={option.id}>{option.label}</option>
			{/each}
		</select>
	{/snippet}

	<div bind:this={area} class="relative min-h-0 flex-1 overflow-hidden bg-frame">
		<div
			bind:this={frame}
			class={[
				'absolute top-1/2 left-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden',
				aspect.value !== 'free' && 'ring-1 ring-line-strong'
			]}
			style:width="{size.width}px"
			style:height="{size.height}px"
		>
			<div class="flex max-w-md flex-col items-center gap-3 p-6 text-center">
				{#if preview.status === 'idle'}
					<button
						type="button"
						aria-label="Run your car's app"
						class="grid size-14 place-items-center rounded-full bg-accent-soft text-accent transition-colors hover:bg-accent hover:text-frame"
						onclick={() => editor.toggleRun()}
					>
						<Play class="ml-0.5 size-6" />
					</button>
					<div class="font-medium">Run your car's app to see it here</div>
					<div class="text-xs text-faint">{mod}P runs and stops it, {mod}R shows your changes.</div>
				{:else if preview.status === 'starting'}
					<LoaderCircle class="size-6 animate-spin text-accent" />
					<div class="font-medium">Starting your car's app</div>
					<div class="line-clamp-2 font-mono text-xs break-all text-faint">
						{lastLine ?? 'The first start builds it, which takes a while.'}
					</div>
				{:else if preview.status === 'stopping'}
					<LoaderCircle class="size-6 animate-spin text-muted" />
					<div class="text-muted">Stopping</div>
				{:else if preview.status === 'running' && preview.mode === 'separate'}
					<AppWindow class="size-7 text-muted" />
					<div class="font-medium">Your app runs in its own window</div>
					{#if preview.note}
						<div class="text-xs text-faint">{preview.note}</div>
					{/if}
				{:else if preview.status === 'running'}
					<div class="text-xs text-faint">Your app shows here</div>
				{:else if preview.status === 'failed'}
					<TriangleAlert class="size-7 text-bad" />
					<div class="selectable font-medium">{preview.message}</div>
					{#if preview.hint}
						<div class="selectable text-xs whitespace-pre-line text-muted">{preview.hint}</div>
					{/if}
					<button
						type="button"
						class="mt-1 rounded-md bg-raised px-3 py-1.5 hover:bg-hover"
						onclick={() => editor.toggleRun()}
					>
						Try again
					</button>
				{/if}
			</div>
		</div>
	</div>
</Panel>
