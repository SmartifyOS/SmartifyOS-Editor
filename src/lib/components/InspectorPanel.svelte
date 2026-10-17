<script lang="ts">
	import CircleArrowUp from '~icons/lucide/circle-arrow-up';
	import Cpu from '~icons/lucide/cpu';
	import Eye from '~icons/lucide/eye';
	import TriangleAlert from '~icons/lucide/triangle-alert';
	import VsCode from '~icons/logos/visual-studio-code';
	import VsCodeMono from '~icons/mdi/microsoft-visual-studio-code';
	import FolderInput from '~icons/lucide/folder-input';
	import HardDriveDownload from '~icons/lucide/hard-drive-download';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import MousePointerClick from '~icons/lucide/mouse-pointer-click';
	import RefreshCw from '~icons/lucide/refresh-cw';
	import Trash from '~icons/lucide/trash-2';
	import Undo from '~icons/lucide/undo-2';
	import Usb from '~icons/lucide/usb';
	import type { Component, Snippet } from 'svelte';
	import type { DeviceInfo, PackageInfo, Part, SettingsPageInfo } from '../../../shared/cli.ts';
	import { linkCopy } from '#lib/carActions.ts';
	import { commands } from '#lib/commands.ts';
	import { exportChoices } from '#lib/exports.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import type { TaskSpec } from '#lib/state/task.svelte.ts';
	import { canShow, kindWords, partIcons } from '#lib/parts.ts';
	import { bus } from '#lib/state/bus.svelte.ts';
	import { parts } from '#lib/state/parts.svelte.ts';
	import TextField from './ui/TextField.svelte';
	import BusSimulator from './BusSimulator.svelte';
	import CarLook from './CarLook.svelte';
	import SettingsPageInspector from './SettingsPageInspector.svelte';
	import { settingsPages } from '#lib/state/settings.svelte.ts';
	import Panel from './Panel.svelte';
	import Button from './ui/Button.svelte';

	/**
	 * What is picked in the car panel, and what can be done with it: the car as a whole, its
	 * SmartifyOS or an extension, or a device. How the car looks is edited here too, with the
	 * change showing in the preview.
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
			| { kind: 'canDevice'; name: string; title: string; node: number }
			| { kind: 'part'; part: Part }
			| { kind: 'settings'; page: SettingsPageInfo }
			| undefined => {
			const picked = editor.selection;
			if (!project) return undefined;
			if (picked.kind === 'car') return { kind: 'car' };
			if (picked.kind === 'settings') {
				const page = settingsPages.find(picked.file);
				return page && { kind: 'settings', page };
			}
			if (picked.kind === 'part') {
				const part = parts.find(picked.part, picked.file);
				return part && { kind: 'part', part };
			}
			if (picked.kind === 'canDevice') {
				const device = bus.network?.devices.find((known) => known.name === picked.name);
				return device && { kind: 'canDevice', ...device };
			}
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
			{:else if item.kind === 'canDevice'}
				{@render canDeviceView(item.name, item.title, item.node)}
			{:else if item.kind === 'part'}
				{@render partView(item.part)}
			{:else if item.kind === 'settings'}
				<SettingsPageInspector page={item.page} />
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

		<CarLook />

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
			{@render action(FolderInput, 'Use a copy from a folder…', linkCopy, 'ghost-muted')}
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

	<BusSimulator name={info.name} />
{/snippet}

{#snippet partView(part: Part)}
	{@const words = kindWords[part.kind]}
	{@const variant = words.variants.find((known) => known.id === part.variant)}
	{@render heading(part.name ?? part.id ?? part.file, part.file)}

	{#snippet what()}
		<p class="text-[13px] text-muted">{words.about} {variant?.describe ?? ''}</p>
		{#if !part.registered}
			<p class="flex items-start gap-2 text-[13px] text-warn">
				<TriangleAlert class="mt-0.5 size-3.5 shrink-0" />
				lib/main.dart does not hand it to SmartifyOS, so your app does not have it.
			</p>
		{/if}
		<Button
			variant="primary"
			size="sm"
			class="w-full justify-start"
			onclick={() => editor.openInVsCode(undefined, part.file, part.line)}
		>
			<VsCodeMono />
			{words.write}
		</Button>
		{#if editor.preview.status === 'running' && canShow(part)}
			{@render action(Eye, words.show, () => void parts.show(part), 'outline', false)}
		{:else if editor.preview.status === 'running'}
			<p class="text-[13px] text-muted">
				To see it, hold an area of the home screen in the preview and add it there.
			</p>
		{/if}
		{#if parts.showProblem?.file === part.file}
			<p class="text-[13px] text-bad">{parts.showProblem.message}</p>
		{/if}
	{/snippet}
	{@render section(undefined, what)}

	{#snippet looks()}
		<div class="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-x-3">
			<span class="text-[13px] text-muted">Name</span>
			<TextField
				value={part.name ?? ''}
				placeholder={part.name === null ? 'Set in code' : ''}
				onchange={(name) => {
					if (name.trim()) void parts.edit(part, { name: name.trim() });
				}}
			/>
		</div>
		<div class="grid grid-cols-9 gap-1">
			{#each partIcons as choice (choice.id)}
				{@const picked = part.icon === choice.id}
				<button
					type="button"
					title={choice.label}
					aria-label={choice.label}
					aria-pressed={picked}
					disabled={!canRun || parts.busy > 0}
					class={[
						'grid aspect-square place-items-center rounded-md border transition-colors disabled:opacity-50',
						picked
							? 'border-primary/60 bg-primary/10 text-primary'
							: 'border-transparent text-muted hover:bg-hover hover:text-fg'
					]}
					onclick={() => {
						if (!picked) void parts.edit(part, { icon: choice.id });
					}}
				>
					<choice.icon class="size-4" />
				</button>
			{/each}
		</div>
		{#if part.icon && !partIcons.some((known) => known.id === part.icon)}
			<p class="text-xs text-faint">Its icon is Icons.{part.icon}, set in code.</p>
		{/if}
	{/snippet}
	{@render section('Name and icon', looks)}

	{#snippet danger()}
		{@render action(
			Trash,
			`Remove this ${words.one}`,
			() => void parts.remove(part),
			'ghost-muted'
		)}
	{/snippet}
	{@render section(undefined, danger)}
{/snippet}

{#snippet canDeviceView(name: string, title: string, node: number)}
	{@render heading(title, `${name}, node ${node}`)}

	{#snippet program()}
		<p class="text-[13px] text-muted">
			It is on your car's CAN bus, but has no program yet. Make one to put it on a board.
		</p>
		{@render action(Cpu, 'Make its program', run(commands.createDevice()))}
	{/snippet}
	{@render section(undefined, program)}

	<BusSimulator {name} />
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
