<script lang="ts">
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

<Panel title="Inspector">
	{#if item}
		<div class="selectable flex flex-col gap-4 overflow-auto p-3">
			<div>
				<div class="text-base font-medium">{item.title}</div>
				<div class="font-mono text-xs text-faint">{item.name}</div>
			</div>
			<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
				<dt class="text-faint">Version</dt>
				<dd>{item.version ?? item.commit?.slice(0, 7) ?? 'unknown'}</dd>
				<dt class="text-faint">From</dt>
				<dd class="break-all">{source(item)}</dd>
				{#if item.linkedTo}
					<dt class="text-faint">Linked to</dt>
					<dd class="break-all">{item.linkedTo}</dd>
				{/if}
				{#if item.switchedOn !== undefined && item.switchedOn !== null}
					<dt class="text-faint">Switched on</dt>
					<dd>{item.switchedOn ? 'Yes' : 'No, not in lib/main.dart'}</dd>
				{/if}
			</dl>
		</div>
	{:else}
		<p class="p-3 text-xs text-faint">Pick something in the car panel to see it here.</p>
	{/if}
</Panel>
