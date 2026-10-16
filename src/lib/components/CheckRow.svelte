<script lang="ts">
	import CircleCheck from '~icons/lucide/circle-check';
	import CircleX from '~icons/lucide/circle-x';
	import TriangleAlert from '~icons/lucide/triangle-alert';
	import type { DoctorCheck } from '../../../shared/cli.ts';
	import Button from './ui/Button.svelte';

	/**
	 * One thing the doctor checked on this computer. When a command puts it right, that is a
	 * button (`onfix`) instead of the CLI's hint, which says to type it.
	 */
	let {
		check,
		onfix,
		fixDisabled = false,
		class: className = ''
	}: {
		check: DoctorCheck;
		onfix?: () => void;
		fixDisabled?: boolean;
		class?: string;
	} = $props();

	const fixable = $derived(check.status !== 'ok' && check.fix !== undefined);
</script>

<div class={['flex items-start gap-3', className]}>
	{#if check.status === 'ok'}
		<CircleCheck class="mt-0.5 size-4 shrink-0 text-good" />
	{:else if check.status === 'warning'}
		<TriangleAlert class="mt-0.5 size-4 shrink-0 text-warn" />
	{:else}
		<CircleX class="mt-0.5 size-4 shrink-0 text-bad" />
	{/if}
	<div class="selectable flex min-w-0 flex-1 flex-col gap-0.5">
		<span
			><span class="font-medium">{check.title}</span>
			<span class="text-muted">{check.summary}</span></span
		>
		{#if check.status !== 'ok'}
			{#if check.neededFor}<span class="text-[13px] text-muted">{check.neededFor}</span>{/if}
			{#if check.hint && !fixable}
				<span class="text-[13px] break-words whitespace-pre-line text-muted">{check.hint}</span>
			{/if}
		{/if}
	</div>
	{#if fixable && onfix}
		<Button size="sm" disabled={fixDisabled} onclick={onfix}>Set it up</Button>
	{/if}
</div>
