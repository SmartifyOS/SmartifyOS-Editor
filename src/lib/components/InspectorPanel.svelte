<script lang="ts">
	import CircleArrowUp from '~icons/lucide/circle-arrow-up';
	import VsCode from '~icons/logos/visual-studio-code';
	import FolderInput from '~icons/lucide/folder-input';
	import HardDriveDownload from '~icons/lucide/hard-drive-download';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import MousePointerClick from '~icons/lucide/mouse-pointer-click';
	import RefreshCw from '~icons/lucide/refresh-cw';
	import Trash from '~icons/lucide/trash-2';
	import Undo from '~icons/lucide/undo-2';
	import Usb from '~icons/lucide/usb';
	import type { Component, Snippet } from 'svelte';
	import type { DeviceInfo, PackageInfo } from '../../../shared/cli.ts';
	import { commands } from '#lib/commands.ts';
	import { exportChoices } from '#lib/exports.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import type { TaskSpec } from '#lib/state/task.svelte.ts';
	import Panel from './Panel.svelte';
	import Button from './ui/Button.svelte';

	/**
	 * What is picked in the car panel, and what can be done with it: the car as a whole, its
	 * SmartifyOS or an extension, or a device. Later this is where their settings are edited,
	 * with the change showing in the preview.
	 */

	type Package = PackageInfo & { switchedOn?: boolean | null; core: boolean };

	const project = $derived(editor.project);
	const updates = $derived(editor.carUpdates);
	const canRun = $derived(!editor.busy && editor.cli?.found === true);

	const item = $derived.by(
		():
			| { kind: 'car' }
			| { kind: 'package'; info: Package }
			| { kind: 'device'; info: DeviceInfo }
			| undefined => {
			const picked = editor.selection;
			if (!project) return undefined;
			if (picked.kind === 'car') return { kind: 'car' };
			if (picked.kind === 'device') {
				const info = project.devices.find((device) => device.folder === picked.folder);
				return info && { kind: 'device', info };
			}
			const { smartifyOs, extensions } = project.car;
			if (smartifyOs.name === picked.name) {
				return { kind: 'package', info: { ...smartifyOs, core: true } };
			}
			const extension = extensions.find((e) => e.name === picked.name);
			return extension && { kind: 'package', info: { ...extension, core: false } };
		}
	);

	const run = (spec: TaskSpec) => () => void editor.runTask(spec);

	async function link() {
		const folder = await window.smartify.files.pickFolder(
			'The folder with the copy, the one with its pubspec.yaml'
		);
		if (folder) await editor.runTask(commands.link(folder));
	}

	function source(info: PackageInfo): string {
		const from = info.source;
		if (from.kind === 'git') return from.url ?? 'git';
		if (from.kind === 'path') return from.path ?? 'a folder';
		return from.kind;
	}
</script>

<Panel title="Inspector" surface="card">
	{#if project && item}
		<div class="selectable flex flex-col gap-6 overflow-auto px-4 pt-1 pb-4">
			{#if item.kind === 'car'}
				{@render carView()}
			{:else if item.kind === 'package'}
				{@render packageView(item.info)}
			{:else}
				{@render deviceView(item.info)}
			{/if}
		</div>
	{:else}
		<div class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
			<MousePointerClick class="size-5 text-faint" />
			<p class="text-[13px] text-muted">Pick something in the car panel to see it here.</p>
		</div>
	{/if}
</Panel>

{#snippet carView()}
	{#if project}
		{@render heading(project.name, project.path)}

		{#snippet updateList()}
			{#if !updates}
				<p class="flex items-center gap-2 text-[13px] text-muted">
					<LoaderCircle class="size-3.5 animate-spin" /> Looking for updates
				</p>
			{:else if updates.failed}
				<p class="text-[13px] text-muted">Could not look for updates. Is this computer online?</p>
				{@render action(RefreshCw, 'Look again', () => editor.checkCarUpdates(), 'ghost-muted')}
			{:else}
				{@const extensions = Object.keys(updates.extensions).length}
				{#if updates.smartifyOs}
					{@render action(
						CircleArrowUp,
						`Update SmartifyOS to ${updates.smartifyOs}`,
						run(commands.updateSmartifyOs()),
						'primary'
					)}
				{/if}
				{#if extensions > 0}
					{@render action(
						CircleArrowUp,
						extensions === 1 ? 'Update 1 extension' : `Update ${extensions} extensions`,
						run(commands.updateExtensions())
					)}
				{/if}
				{#if !updates.smartifyOs && extensions === 0}
					<p class="text-[13px] text-muted">Everything in your car is up to date.</p>
				{/if}
			{/if}
		{/snippet}
		{@render section('Updates', updateList)}

		{#snippet usb()}
			<p class="text-[13px] text-muted">SmartifyOS goes onto the car on a USB stick.</p>
			{#each exportChoices as choice (choice.label)}
				{#if !choice.needsDevices || project.devices.length > 0}
					{@render action(choice.icon, choice.label, run(choice.task))}
				{/if}
			{/each}
		{/snippet}
		{@render section('Put it on your car', usb)}

		{#snippet edit()}
			{@render action(VsCode, 'Open in VS Code', () => editor.openInVsCode(), 'outline', false)}
		{/snippet}
		{@render section("Your car's app", edit)}
	{/if}
{/snippet}

{#snippet packageView(info: Package)}
	{@const newer = info.core ? updates?.smartifyOs : updates?.extensions[info.name]}
	{@render heading(info.title, info.name)}

	<dl class="flex flex-col gap-3 text-[13px]">
		{@render field('Version', info.version ?? info.commit?.slice(0, 7) ?? 'unknown', true)}
		{@render field('From', source(info), true)}
		{#if info.linkedTo}
			{@render field('Linked to', info.linkedTo, true)}
		{/if}
		{#if info.switchedOn !== undefined && info.switchedOn !== null}
			{@render field('Switched on', info.switchedOn ? 'Yes' : 'No, not in lib/main.dart')}
		{/if}
	</dl>

	{#snippet actions()}
		{#if info.linkedTo}
			{@render action(
				Undo,
				'Go back to the released one',
				run(commands.unlink(info.name, info.title))
			)}
		{:else}
			{@const update = info.core
				? commands.updateSmartifyOs()
				: commands.updateExtension(info.name, info.title)}
			{#if newer}
				{@render action(CircleArrowUp, `Update to ${newer}`, run(update), 'primary')}
			{:else}
				{@render action(RefreshCw, 'Look for a newer version', run(update))}
			{/if}
		{/if}
		{#if !info.core}
			{@render action(
				Trash,
				'Remove from your car',
				run(commands.removeExtension(info.name, info.title))
			)}
		{/if}
		{#if !info.linkedTo}
			{@render action(FolderInput, 'Use a copy from a folder…', link, 'ghost-muted')}
		{/if}
	{/snippet}
	{@render section(undefined, actions)}
{/snippet}

{#snippet deviceView(info: DeviceInfo)}
	{@render heading(info.name, info.folder)}

	<dl class="flex flex-col gap-3 text-[13px]">
		{@render field('Firmware version', info.version, true)}
		{#if info.board}{@render field('Board', info.board, true)}{/if}
	</dl>

	{#snippet code()}
		{@render action(
			VsCode,
			'Open its program in VS Code',
			() => editor.openInVsCode(info.folder, 'src/main.cpp'),
			'outline',
			false
		)}
	{/snippet}
	{@render section(undefined, code)}

	{#snippet firmware()}
		<p class="text-[13px] text-muted">
			A new board gets its first program over a USB cable. After that it can be updated in the car
			too, from a USB stick.
		</p>
		{@render action(Usb, 'Put it on its board', run(commands.flashDevice(info.name)))}
		{@render action(
			HardDriveDownload,
			'Export its firmware',
			run(commands.exportDevices([info.name]))
		)}
	{/snippet}
	{@render section('Firmware', firmware)}
{/snippet}

{#snippet heading(title: string, detail: string)}
	<div class="flex flex-col gap-0.5">
		<div class="text-base font-semibold">{title}</div>
		<div class="font-mono text-xs break-all text-faint">{detail}</div>
	</div>
{/snippet}

{#snippet section(title: string | undefined, children: Snippet)}
	<section class="flex flex-col gap-2">
		{#if title}<h3 class="text-xs font-medium text-faint">{title}</h3>{/if}
		{@render children()}
	</section>
{/snippet}

{#snippet action(
	Icon: Component,
	label: string,
	onclick: () => void,
	variant: 'primary' | 'outline' | 'ghost-muted' = 'outline',
	runsCli = true
)}
	<Button {variant} size="sm" class="w-full justify-start" disabled={runsCli && !canRun} {onclick}>
		<Icon />
		{label}
	</Button>
{/snippet}

{#snippet field(label: string, value: string, mono = false)}
	<div class="flex flex-col gap-1">
		<dt class="text-xs font-medium text-faint">{label}</dt>
		<dd class={['break-all', mono && 'font-mono text-[12.5px]']}>{value}</dd>
	</div>
{/snippet}
