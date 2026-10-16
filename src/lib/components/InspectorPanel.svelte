<script lang="ts">
	import MousePointerClick from '~icons/lucide/mouse-pointer-click';
	import type { PackageInfo } from '../../../shared/cli.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import Panel from './Panel.svelte';

	/**
	 * What is picked in the car panel. For now it shows what the CLI knows about a package;
	 * this is where its settings will be edited, with the change showing in the preview.
	 */
	let { selected }: { selected: string | undefined } = $props();

	const item = $derived.by((): (PackageInfo & { switchedOn?: boolean | null }) | undefined => {
		const car = editor.project?.car;
		if (!car || !selected) return undefined;
		if (car.smartifyOs.name === selected) return car.smartifyOs;
		return car.extensions.find((extension) => extension.name === selected);
	});

	function source(info: PackageInfo): string {
		const from = info.source;
		if (from.kind === 'git') return from.url ?? 'git';
		if (from.kind === 'path') return from.path ?? 'a folder';
		return from.kind;
	}
</script>

<Panel title="Inspector" surface="card">
	{#if item}
		<div class="selectable flex flex-col gap-5 overflow-auto px-4 pt-1 pb-4">
			<div class="flex flex-col gap-0.5">
				<div class="text-base font-semibold">{item.title}</div>
				<div class="font-mono text-xs text-faint">{item.name}</div>
			</div>
			<dl class="flex flex-col gap-3 text-[13px]">
				{@render field('Version', item.version ?? item.commit?.slice(0, 7) ?? 'unknown', true)}
				{@render field('From', source(item), true)}
				{#if item.linkedTo}
					{@render field('Linked to', item.linkedTo, true)}
				{/if}
				{#if item.switchedOn !== undefined && item.switchedOn !== null}
					{@render field('Switched on', item.switchedOn ? 'Yes' : 'No, not in lib/main.dart')}
				{/if}
			</dl>
		</div>
	{:else}
		<div class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
			<MousePointerClick class="size-5 text-faint" />
			<p class="text-[13px] text-muted">Pick something in the car panel to see it here.</p>
		</div>
	{/if}
</Panel>

{#snippet field(label: string, value: string, mono = false)}
	<div class="flex flex-col gap-1">
		<dt class="text-xs font-medium text-faint">{label}</dt>
		<dd class={['break-all', mono && 'font-mono text-[12.5px]']}>{value}</dd>
	</div>
{/snippet}
