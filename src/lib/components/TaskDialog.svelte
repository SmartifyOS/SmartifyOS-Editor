<script lang="ts">
	import Check from '~icons/lucide/check';
	import CircleAlert from '~icons/lucide/circle-alert';
	import CircleCheck from '~icons/lucide/circle-check';
	import CircleX from '~icons/lucide/circle-x';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import TriangleAlert from '~icons/lucide/triangle-alert';
	import X from '~icons/lucide/x';
	import { coversViewport } from '#lib/attachments.ts';
	import { nextSteps } from '../../../shared/next-steps.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import type { Task } from '#lib/state/task.svelte.ts';
	import type { DoctorCheck } from '../../../shared/cli.ts';
	import CheckRow from './CheckRow.svelte';
	import PromptForm from './PromptForm.svelte';
	import Button from './ui/Button.svelte';

	/**
	 * A command running on the car: what it does as it goes, the questions it asks, and how it
	 * ended. It can be moved out of the way while it works, the status bar shows it then.
	 */
	let { task }: { task: Task } = $props();

	function isCheck(data: unknown): data is DoctorCheck {
		const check = data as Partial<DoctorCheck> | null | undefined;
		return typeof check?.title === 'string' && typeof check.status === 'string';
	}

	const prompt = $derived(editor.prompts.find((open) => open.jobId === task.jobId));
	let list = $state<HTMLDivElement>();

	// The newest line stays in view.
	$effect(() => {
		void task.lines.length;
		void task.status;
		requestAnimationFrame(() => list?.scrollTo({ top: list.scrollHeight }));
	});

	function onKey(event: KeyboardEvent) {
		// A question handles its own Escape.
		if (event.key !== 'Escape' || prompt) return;
		if (task.status === 'running') task.hidden = true;
		else editor.dismissTask();
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	{@attach coversViewport}
	class="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-6 backdrop-blur-[3px]"
	role="dialog"
	aria-modal="true"
	aria-labelledby="task-title"
>
	<div class="flex max-h-full w-full max-w-[34rem] flex-col rounded-2xl shadow-dialog glass">
		<header class="flex items-center gap-3 px-6 pt-6 pb-4">
			{#if task.status === 'running'}
				<LoaderCircle class="size-5 shrink-0 animate-spin text-primary" />
			{:else if task.status === 'done'}
				<span class="grid size-6 shrink-0 place-items-center rounded-full bg-good/15 text-good">
					<Check class="size-4" />
				</span>
			{:else}
				<span class="grid size-6 shrink-0 place-items-center rounded-full bg-bad/15 text-bad">
					<X class="size-4" />
				</span>
			{/if}
			<h2 id="task-title" class="text-base font-semibold">{task.spec.title}</h2>
		</header>

		<div
			bind:this={list}
			class="selectable flex min-h-0 flex-1 flex-col gap-2.5 overflow-auto px-6 pb-5 text-[13.5px]"
		>
			{#each task.lines as line, index (index)}
				{#if line.kind === 'step'}
					<div class="flex gap-2.5">
						{#if line.status === 'done'}
							<CircleCheck class="mt-0.5 size-4 shrink-0 text-good" />
						{:else if line.status === 'error'}
							<CircleX class="mt-0.5 size-4 shrink-0 text-bad" />
						{:else}
							<LoaderCircle class="mt-0.5 size-4 shrink-0 animate-spin text-muted" />
						{/if}
						<span class={line.status === 'done' ? 'text-muted' : 'text-fg'}>{line.text}</span>
					</div>
				{:else if line.level === 'note'}
					{@const steps = nextSteps(line.data)}
					<!-- Next steps that all mean nothing here leave no note. -->
					{#if !steps || steps.length > 0}
						<div class="rounded-xl border border-line bg-tint px-3.5 py-3">
							{#if line.title}<div class="mb-1 font-medium">{line.title}</div>{/if}
							{#if steps && steps.length > 1}
								<ol class="flex list-decimal flex-col gap-1 pl-5 text-muted">
									{#each steps as step, number (number)}<li>{step}</li>{/each}
								</ol>
							{:else}
								<p class="whitespace-pre-line text-muted">{steps?.[0] ?? line.text}</p>
							{/if}
						</div>
					{/if}
				{:else if isCheck(line.data)}
					<!-- What the doctor found, which setup prints at its end. -->
					<CheckRow check={line.data} />
				{:else if line.level === 'warn' || line.level === 'error'}
					<div class="flex gap-2.5">
						{#if line.level === 'warn'}
							<TriangleAlert class="mt-0.5 size-4 shrink-0 text-warn" />
						{:else}
							<CircleX class="mt-0.5 size-4 shrink-0 text-bad" />
						{/if}
						<span class="whitespace-pre-line">{line.text}</span>
					</div>
				{:else if line.level === 'success'}
					<div class="flex gap-2.5">
						<CircleCheck class="mt-0.5 size-4 shrink-0 text-good" />
						<span class="whitespace-pre-line">{line.text}</span>
					</div>
				{:else}
					<p class="pl-[26px] whitespace-pre-line text-muted">{line.text}</p>
				{/if}
			{/each}

			{#if task.status === 'done' && task.outro}
				<p class="pt-1 font-medium">{task.outro}</p>
			{:else if task.problem}
				<div class="flex gap-3 rounded-xl border border-bad/25 bg-bad/[0.07] p-4">
					<CircleAlert class="mt-0.5 size-4 shrink-0 text-bad" />
					<div>
						<div class="font-medium">{task.problem.message}</div>
						{#if task.problem.hint}
							<p class="mt-1 whitespace-pre-line text-muted">{task.problem.hint}</p>
						{/if}
					</div>
				</div>
			{:else if task.lines.length === 0 && !prompt}
				<p class="text-muted">Starting…</p>
			{/if}
		</div>

		{#if prompt}
			{#key prompt.prompt.id}
				<PromptForm open={prompt} class="border-t border-line" />
			{/key}
		{:else}
			<div class="flex justify-end gap-2 border-t border-line px-6 py-4">
				{#if task.status === 'running'}
					<Button
						variant="ghost"
						size="sm"
						label="It keeps going, the bottom of the window shows how far it is"
						onclick={() => (task.hidden = true)}
					>
						Keep it going in the background
					</Button>
				{:else}
					<!-- svelte-ignore a11y_autofocus -->
					<Button variant="primary" size="sm" autofocus onclick={() => editor.dismissTask()}>
						Close
					</Button>
				{/if}
			</div>
		{/if}
	</div>
</div>
