<script lang="ts">
	import Eraser from '~icons/lucide/eraser';
	import ArrowDownToLine from '~icons/lucide/arrow-down-to-line';
	import { editor } from '#lib/state/editor.svelte.ts';
	import Panel from './Panel.svelte';
	import Button from './ui/Button.svelte';
	import type { ConsoleLine } from '../../../shared/api.ts';

	/** Everything the CLI and the running app print, like Unity's console. */

	let onlyProblems = $state(false);
	let follow = $state(true);
	let list = $state<HTMLDivElement>();

	const isProblem = (line: ConsoleLine) =>
		line.level === 'error' || line.level === 'warn' || line.level === 'stderr';

	const lines = $derived(
		onlyProblems ? editor.consoleLines.filter(isProblem) : editor.consoleLines
	);
	const problems = $derived(editor.consoleLines.filter(isProblem).length);

	const colors: Record<ConsoleLine['level'], string> = {
		info: 'text-fg',
		step: 'text-muted',
		success: 'text-good',
		warn: 'text-warn',
		error: 'text-bad',
		stderr: 'text-bad/85',
		output: 'text-fg/80'
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
		<div class="mr-1 flex items-center rounded-control border border-line p-0.5">
			<button
				type="button"
				aria-pressed={!onlyProblems}
				class="h-6 rounded-[5px] px-2 text-xs font-medium text-muted hover:text-fg aria-pressed:bg-selected aria-pressed:text-fg"
				onclick={() => (onlyProblems = false)}
			>
				All
			</button>
			<button
				type="button"
				aria-pressed={onlyProblems}
				class="flex h-6 items-center gap-1.5 rounded-[5px] px-2 text-xs font-medium text-muted hover:text-fg aria-pressed:bg-selected aria-pressed:text-fg"
				onclick={() => (onlyProblems = true)}
			>
				Problems
				{#if problems > 0}
					<span class="rounded-full bg-bad/15 px-1.5 text-[11px] text-bad tabular-nums">
						{problems}
					</span>
				{/if}
			</button>
		</div>
		<Button
			variant="ghost-muted"
			size="icon-sm"
			label="Keep scrolled to the newest line"
			aria-pressed={follow}
			onclick={() => (follow = !follow)}
		>
			<ArrowDownToLine />
		</Button>
		<Button
			variant="ghost-muted"
			size="icon-sm"
			label="Clear"
			onclick={() => editor.clearConsole()}
		>
			<Eraser />
		</Button>
	{/snippet}

	<div
		bind:this={list}
		onscroll={onScroll}
		class="selectable min-h-0 flex-1 overflow-auto border-t border-line py-1.5 font-mono text-[12.5px] leading-[1.65]"
	>
		{#each lines as line (line.id)}
			<div class="flex gap-4 px-4 hover:bg-tint">
				<span class="shrink-0 text-faint tabular-nums">{time(line.time)}</span>
				<span class={['min-w-0 break-words whitespace-pre-wrap', colors[line.level]]}
					>{line.text}</span
				>
			</div>
		{:else}
			<p class="px-4 py-2 font-sans text-[13px] text-faint">
				{onlyProblems
					? 'No problems.'
					: 'Nothing here yet. What your app and the CLI print shows up here.'}
			</p>
		{/each}
	</div>
</Panel>
