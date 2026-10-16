<script lang="ts">
	import Eraser from '~icons/lucide/eraser';
	import ArrowDownToLine from '~icons/lucide/arrow-down-to-line';
	import CircleAlert from '~icons/lucide/circle-alert';
	import { editor } from '#lib/state/editor.svelte.ts';
	import IconButton from './IconButton.svelte';
	import Panel from './Panel.svelte';
	import type { ConsoleLine } from '../../../shared/api.ts';

	/** Everything the CLI and the running app print, like Unity's console. */

	let onlyProblems = $state(false);
	let follow = $state(true);
	let list = $state<HTMLDivElement>();

	const lines = $derived(
		onlyProblems
			? editor.consoleLines.filter(
					(line) => line.level === 'error' || line.level === 'warn' || line.level === 'stderr'
				)
			: editor.consoleLines
	);
	const problems = $derived(
		editor.consoleLines.filter((line) => line.level === 'error' || line.level === 'stderr').length
	);

	const colors: Record<ConsoleLine['level'], string> = {
		info: 'text-fg',
		step: 'text-muted',
		success: 'text-good',
		warn: 'text-warn',
		error: 'text-bad',
		stderr: 'text-bad/80',
		output: 'text-muted'
	};

	function time(ms: number): string {
		return new Date(ms).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	// Stays at the bottom while following, and stops following once scrolled up.
	$effect(() => {
		void lines.length;
		if (follow && list) requestAnimationFrame(() => list?.scrollTo({ top: list.scrollHeight }));
	});

	function onScroll() {
		if (!list) return;
		follow = list.scrollHeight - list.scrollTop - list.clientHeight < 24;
	}
</script>

<Panel title="Console">
	{#snippet actions()}
		<IconButton
			label={onlyProblems ? 'Show everything' : 'Show only problems'}
			active={onlyProblems}
			onclick={() => (onlyProblems = !onlyProblems)}
		>
			<CircleAlert class={['size-3.5', problems > 0 && !onlyProblems && 'text-bad']} />
		</IconButton>
		<IconButton
			label="Keep scrolled to the newest line"
			active={follow}
			onclick={() => (follow = !follow)}
		>
			<ArrowDownToLine class="size-3.5" />
		</IconButton>
		<IconButton label="Clear" onclick={() => editor.clearConsole()}>
			<Eraser class="size-3.5" />
		</IconButton>
	{/snippet}

	<div
		bind:this={list}
		onscroll={onScroll}
		class="selectable min-h-0 flex-1 overflow-auto py-1 font-mono text-xs leading-5"
	>
		{#each lines as line (line.id)}
			<div class="flex gap-3 px-3 hover:bg-raised/60">
				<span class="shrink-0 text-faint tabular-nums">{time(line.time)}</span>
				<span class={['min-w-0 break-words whitespace-pre-wrap', colors[line.level]]}
					>{line.text}</span
				>
			</div>
		{:else}
			<p class="px-3 py-1 font-sans text-faint">
				{onlyProblems
					? 'No problems.'
					: 'Nothing here yet. What your app and the CLI print shows up here.'}
			</p>
		{/each}
	</div>
</Panel>
