<script lang="ts">
	import Play from '~icons/lucide/play';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import AppWindow from '~icons/lucide/app-window';
	import TriangleAlert from '~icons/lucide/triangle-alert';
	import MonitorPlay from '~icons/lucide/monitor-play';
	import { shortcut } from '#lib/shortcuts.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import { remembered } from '#lib/state/remembered.svelte.ts';
	import Panel from './Panel.svelte';
	import Button from './ui/Button.svelte';
	import Kbd from './ui/Kbd.svelte';
	import Select from './ui/Select.svelte';

	/**
	 * The live preview. The running app is a real window of its own, which the main process
	 * keeps exactly over the frame in here (see electron/preview/), so this component only
	 * says where the frame is and shows what is going on while there is no app to show.
	 */

	const aspects = [
		{ value: 'free', label: 'Fill', ratio: undefined },
		{ value: '16:9', label: '16:9', ratio: 16 / 9 },
		{ value: '8:3', label: '8:3 (1280×480)', ratio: 8 / 3 },
		{ value: '5:3', label: '5:3 (800×480)', ratio: 5 / 3 },
		{ value: '4:3', label: '4:3', ratio: 4 / 3 }
	] as const;

	/** Room around the frame, so it reads as a screen on a canvas. */
	const padding = 16;

	const aspect = remembered('viewport.aspect', 'free');

	let area = $state<HTMLDivElement>();
	let frame = $state<HTMLDivElement>();
	let areaWidth = $state(0);
	let areaHeight = $state(0);

	/** The largest frame of the chosen shape that fits. */
	const size = $derived.by(() => {
		const ratio = aspects.find((a) => a.value === aspect.value)?.ratio;
		const width = Math.max(0, areaWidth - padding * 2);
		const height = Math.max(0, areaHeight - padding * 2);
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
			<span class="mr-1.5 flex items-center gap-2 text-[13px] text-muted">
				<span class="size-2 rounded-full bg-good shadow-[0_0_8px] shadow-good/60"></span>
				{modeLabel}
			</span>
		{/if}
		<Select bind:value={aspect.value} options={aspects} title="The shape of your car's screen" />
	{/snippet}

	<div bind:this={area} class="relative min-h-0 flex-1 overflow-hidden border-t border-line canvas">
		<div
			bind:this={frame}
			class="absolute top-1/2 left-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-[10px] border border-line bg-bg"
			style:width="{size.width}px"
			style:height="{size.height}px"
		>
			<div class="flex max-w-sm flex-col items-center gap-4 p-6 text-center">
				{#if preview.status === 'idle'}
					<span class="grid size-12 place-items-center rounded-xl border border-line bg-card">
						<MonitorPlay class="size-5 text-muted" />
					</span>
					<div class="flex flex-col gap-1">
						<div class="text-base font-medium">Your car's app shows here</div>
						<div class="text-[13px] text-muted">
							Run it, then press <Kbd keys={shortcut('R')} class="mx-0.5 text-fg" /> after a change to
							see it straight away.
						</div>
					</div>
					<Button variant="primary" onclick={() => editor.toggleRun()}>
						<Play /> Run <Kbd keys={shortcut('P')} class="ml-1" />
					</Button>
				{:else if preview.status === 'starting'}
					<LoaderCircle class="size-6 animate-spin text-primary" />
					<div class="flex flex-col gap-1">
						<div class="text-base font-medium">Starting your car's app</div>
						<div class="line-clamp-2 font-mono text-xs break-all text-faint">
							{lastLine ?? 'The first start builds it, which takes a while.'}
						</div>
					</div>
				{:else if preview.status === 'stopping'}
					<LoaderCircle class="size-6 animate-spin text-muted" />
					<div class="text-muted">Stopping</div>
				{:else if preview.status === 'running' && preview.mode === 'separate'}
					<span class="grid size-12 place-items-center rounded-xl border border-line bg-card">
						<AppWindow class="size-5 text-muted" />
					</span>
					<div class="flex flex-col gap-1">
						<div class="text-base font-medium">Your app runs in its own window</div>
						{#if preview.note}
							<div class="text-[13px] text-muted">{preview.note}</div>
						{/if}
					</div>
				{:else if preview.status === 'running'}
					<LoaderCircle class="size-5 animate-spin text-faint" />
				{:else if preview.status === 'failed'}
					<span class="grid size-12 place-items-center rounded-xl border border-bad/25 bg-bad/10">
						<TriangleAlert class="size-5 text-bad" />
					</span>
					<div class="flex flex-col gap-1">
						<div class="selectable text-base font-medium">{preview.message}</div>
						{#if preview.hint}
							<div class="selectable text-[13px] whitespace-pre-line text-muted">
								{preview.hint}
							</div>
						{/if}
					</div>
					<Button onclick={() => editor.toggleRun()}>Try again</Button>
				{/if}
			</div>
		</div>
	</div>
</Panel>
