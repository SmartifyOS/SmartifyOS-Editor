<script lang="ts">
	import Box from '~icons/lucide/box';
	import Car from '~icons/lucide/car-front';
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
	import Puzzle from '~icons/lucide/puzzle';
	import RefreshCw from '~icons/lucide/refresh-cw';
	import Trash from '~icons/lucide/trash-2';
	import Undo from '~icons/lucide/undo-2';
	import Usb from '~icons/lucide/usb';
	import type { Component } from 'svelte';
	import type { DeviceInfo, PackageInfo, Part, SettingsPageInfo } from '../../../shared/cli.ts';
	import { linkCopy } from '#lib/carActions.ts';
	import { commands } from '#lib/commands.ts';
	import { exportsFor } from '#lib/exports.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import type { TaskSpec } from '#lib/state/task.svelte.ts';
	import { canShow, kindWords, partKey } from '#lib/parts.ts';
	import { bus } from '#lib/state/bus.svelte.ts';
	import { parts } from '#lib/state/parts.svelte.ts';
	import RunAppLink from './RunAppLink.svelte';
	import TextField from './ui/TextField.svelte';
	import Switch from './ui/Switch.svelte';
	import CarIcon from './CarIcon.svelte';
	import ExtensionAdds from './ExtensionAdds.svelte';
	import ExtensionSettings from './ExtensionSettings.svelte';
	import IconPicker from './IconPicker.svelte';
	import BusSimulator from './BusSimulator.svelte';
	import UsbDeviceInspector from './UsbDeviceInspector.svelte';
	import SettingsPageInspector from './SettingsPageInspector.svelte';
	import SetupInspector from './setup/SetupInspector.svelte';
	import { setupAreas, type SetupArea } from '#lib/setup.ts';
	import ChevronRight from '~icons/lucide/chevron-right';
	import { settingsPages } from '#lib/state/settings.svelte.ts';
	import InspectorHeading from './InspectorHeading.svelte';
	import InspectorSection from './InspectorSection.svelte';
	import Panel from './Panel.svelte';
	import Button from './ui/Button.svelte';

	/**
	 * What is picked in the car panel, and what can be done with it: the car as a whole, its
	 * SmartifyOS or an extension, a device, or one of the setup pages, where how the car looks
	 * and works is edited with the change showing in the preview.
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
			| { kind: 'usbDevice'; name: string }
			| { kind: 'part'; part: Part }
			| { kind: 'settings'; page: SettingsPageInfo }
			| { kind: 'setup'; area: SetupArea }
			| undefined => {
			const picked = editor.selection;
			if (!project) return undefined;
			if (picked.kind === 'car') return { kind: 'car' };
			if (picked.kind === 'setup' || picked.kind === 'usbDevice') return picked;
			if (picked.kind === 'settings') {
				const page = settingsPages.find(picked.key);
				return page && { kind: 'settings', page };
			}
			if (picked.kind === 'part') {
				const part = parts.find(picked.part, picked.key);
				return part && { kind: 'part', part };
			}
			if (picked.kind === 'canDevice') {
				// The running app's, or the app's own definition while it is not running.
				const device =
					bus.network?.devices.find((known) => known.name === picked.name) ??
					project.canDevices.find((known) => known.name === picked.name);
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
		<div class="selectable flex flex-col gap-4 overflow-auto px-4 pt-1 pb-6">
			{#if item.kind === 'car'}
				{@render carView()}
			{:else if item.kind === 'package'}
				{@render packageView(item.info)}
			{:else if item.kind === 'canDevice'}
				{@render canDeviceView(item.name, item.title, item.node)}
			{:else if item.kind === 'usbDevice'}
				{#key item.name}
					<UsbDeviceInspector name={item.name} />
				{/key}
			{:else if item.kind === 'part'}
				{@render partView(item.part)}
			{:else if item.kind === 'settings'}
				<SettingsPageInspector page={item.page} />
			{:else if item.kind === 'setup'}
				{#key item.area}
					<SetupInspector area={item.area} />
				{/key}
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
		<InspectorHeading title={project.name} icon={Car} detail={project.path} />

		<InspectorSection title="Setup">
			<p class="text-[13px] text-muted">
				The pages changed most. Every other one is under Setup in the car panel.
			</p>
			{#each setupAreas.slice(0, 4) as area (area.id)}
				<Button
					size="sm"
					class="w-full justify-start"
					onclick={() => (editor.selection = { kind: 'setup', area: area.id })}
				>
					<area.icon />
					{area.title}
					<ChevronRight class="ml-auto text-muted" />
				</Button>
			{/each}
		</InspectorSection>

		<InspectorSection title="Updates">
			{#if !updates}
				<p class="flex items-center gap-2 text-[13px] text-muted">
					<LoaderCircle class="size-3.5 animate-spin" /> Looking for updates
				</p>
			{:else if updates.failed}
				<p class="text-[13px] text-muted">Could not look for updates. Is this computer online?</p>
				{@render action(RefreshCw, 'Look again', () => editor.checkCarUpdates())}
			{:else}
				{@const extensions = Object.keys(updates.extensions).length}
				{#if updates.smartifyOs}
					{@render action(
						CircleArrowUp,
						`Update SmartifyOS to ${updates.smartifyOs}`,
						run(commands.updateSmartifyOs()),
						{ variant: 'primary' }
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
		</InspectorSection>

		<InspectorSection title="Put it on your car">
			<p class="text-[13px] text-muted">
				SmartifyOS goes onto the car on a USB stick, or onto a tablet over its cable.
			</p>
			{#each exportsFor(project) as choice (choice.label)}
				{@render action(choice.icon, choice.label, run(choice.task))}
			{/each}
		</InspectorSection>

		<InspectorSection title="Your car's app">
			{@render action(VsCode, 'Open in VS Code', () => editor.openInVsCode(), { runsCli: false })}
		</InspectorSection>
	{/if}
{/snippet}

{#snippet packageView(info: Package)}
	{@const newer = info.core ? updates?.smartifyOs : updates?.extensions[info.name]}
	<InspectorHeading title={info.title} icon={info.core ? Box : Puzzle} detail={info.name} />

	<dl class="field-grid text-[13px]">
		{@render field('Version', info.version ?? info.commit?.slice(0, 7) ?? 'unknown', true)}
		{@render field('From', source(info), true)}
		{#if info.linkedTo}
			{@render field('Linked to', info.linkedTo, true)}
		{/if}
		{#if info.switchedOn !== undefined && info.switchedOn !== null}
			{@render field('Switched on', info.switchedOn ? 'Yes' : 'No, not in lib/main.dart')}
		{/if}
	</dl>

	<!-- What is done with it comes first, above its settings, which can be long. -->
	<InspectorSection>
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
				{@render action(CircleArrowUp, `Update to ${newer}`, run(update), { variant: 'primary' })}
			{:else}
				{@render action(RefreshCw, 'Look for a newer version', run(update))}
			{/if}
			{@render action(FolderInput, 'Use a copy from a folder…', linkCopy)}
		{/if}
	</InspectorSection>

	{#if !info.core}
		{#key info.name}
			<ExtensionAdds name={info.name} />
			<ExtensionSettings name={info.name} />
		{/key}

		<InspectorSection title="Remove">
			{@render action(
				Trash,
				'Remove from your car',
				run(commands.removeExtension(info.name, info.title)),
				{ danger: true }
			)}
		</InspectorSection>
	{/if}
{/snippet}

{#snippet deviceView(info: DeviceInfo)}
	<InspectorHeading title={info.name} icon={Cpu} detail={info.folder} />

	<dl class="field-grid text-[13px]">
		{@render field('Firmware version', info.version, true)}
		{#if info.board}{@render field('Board', info.board, true)}{/if}
	</dl>

	<InspectorSection>
		{@render action(
			VsCode,
			'Open its program in VS Code',
			() => editor.openInVsCode(info.folder, 'src/main.cpp'),
			{ runsCli: false }
		)}
	</InspectorSection>

	<InspectorSection title="Firmware">
		<p class="text-[13px] text-muted">
			A new board gets its first program over a USB cable. After that the car can update it from a
			USB stick.
		</p>
		{@render action(Usb, 'Put it on its board', run(commands.flashDevice(info.name)))}
		{@render action(
			HardDriveDownload,
			'Export its firmware',
			run(commands.exportDevices([info.name]))
		)}
	</InspectorSection>

	<BusSimulator name={info.name} />
{/snippet}

{#snippet partView(part: Part)}
	{@const words = kindWords[part.kind]}
	{@const variant = words.variants.find((known) => known.id === part.variant)}
	<InspectorHeading
		title={part.name ?? part.id ?? part.file}
		icon={words.icon}
		carIcon={part.icon}
		detail={part.file}
		about={`${words.about} ${variant?.describe ?? ''}`}
	/>

	<InspectorSection>
		{#if !part.registered && part.inAppList === false}
			{@render warning('It is not in the app list, and nothing in your app opens it yet.')}
		{:else if !part.registered}
			{@render warning(
				'Your app does not have it yet, since nothing hands it to SmartifyOS. That usually happens in lib/main.dart.'
			)}
		{/if}
		{@render action(
			VsCodeMono,
			words.write,
			() => editor.openInVsCode(undefined, part.file, part.line),
			{ variant: 'primary', runsCli: false }
		)}
		{#if editor.preview.status === 'running' && canShow(part)}
			{@render action(Eye, words.show, () => void parts.show(part), { runsCli: false })}
		{:else if editor.preview.status === 'running' && part.inAppList === false}
			<p class="text-[13px] text-muted">
				It is not in the app list, so open it in the preview the way your app does.
			</p>
		{:else if editor.preview.status === 'running'}
			<p class="text-[13px] text-muted">
				To see it, hold an area of the home screen in the preview and add it there.
			</p>
		{:else}
			<p class="text-[13px] text-muted">
				Run your car's app to see it in the preview. <RunAppLink />
			</p>
		{/if}
		{#if parts.showProblem?.key === partKey(part)}
			<p class="text-[13px] text-bad">{parts.showProblem.message}</p>
		{/if}
	</InspectorSection>

	<InspectorSection title="Name and icon">
		<div class="field-grid">
			<span class="text-[13px] text-muted">Name</span>
			{#if part.canChange.name}
				<TextField
					value={part.name ?? ''}
					placeholder={part.name === null ? 'Set in code' : ''}
					label="Name"
					onchange={(name) => {
						if (name.trim()) void parts.edit(part, { name: name.trim() });
					}}
				/>
			{:else}
				<span class="flex h-8 items-center gap-2 text-[13px]">
					{#if !part.canChange.icon}
						<CarIcon
							name={part.icon}
							fallback={kindWords[part.kind].icon}
							class="size-4 shrink-0 text-muted"
						/>
					{/if}
					<span class={['truncate', part.name === null && 'text-faint']}>
						{part.name ?? 'Set in code'}
					</span>
				</span>
			{/if}
		</div>
		{#if part.canChange.icon}
			<IconPicker
				value={part.icon}
				disabled={!canRun || parts.busy > 0}
				onpick={(icon) => void parts.edit(part, { icon })}
			/>
		{/if}
		{#if !part.canChange.name || !part.canChange.icon}
			{@const elsewhere = part.nameAt.file !== part.file}
			<!-- Written some other way than the editor writes them, so they are changed in the code. -->
			{@render warning(
				`Written outside this editor${elsewhere ? `, in ${part.nameAt.file}` : ''}, so change it in VS Code.`
			)}
			<!-- In its own file, the button above already opens it. -->
			{#if elsewhere}
				{@render action(
					VsCode,
					`Open ${part.nameAt.file.split('/').pop()}`,
					() => editor.openInVsCode(undefined, part.nameAt.file, part.nameAt.line),
					{ runsCli: false }
				)}
			{/if}
		{/if}
	</InspectorSection>

	<InspectorSection title="Where it shows">
		<div class="field-grid">
			{#if part.kind === 'window'}
				<span class="text-[13px] text-muted">In the app list</span>
				<div class="flex h-8 items-center">
					<Switch
						checked={part.inAppList ?? true}
						label="In the app list"
						disabled={!part.canChange.appList || !canRun || parts.busy > 0}
						onchange={(appList) => void parts.edit(part, { appList })}
					/>
				</div>
			{/if}
			<span class="text-[13px] text-muted">Order</span>
			{#if part.canChange.order}
				<TextField
					value={part.order?.toString() ?? ''}
					placeholder="100"
					label="Order"
					onchange={(text) => {
						const order = text.trim() === '' ? null : Number(text);
						if (order === null || Number.isInteger(order)) void parts.edit(part, { order });
					}}
				/>
			{:else}
				<span class="flex h-8 items-center text-[13px]">{part.order ?? 100}</span>
			{/if}
		</div>
		<p class="text-xs text-faint">
			{#if part.inAppList === false}
				Your app opens it some other way, with SmartifyOsNavigator.push.
			{/if}
			Smaller numbers come first{part.kind === 'window' ? ' in the app list' : ''}. Empty is 100.
		</p>
	</InspectorSection>

	{#if part.canChange.remove}
		<InspectorSection title="Remove">
			{@render action(Trash, `Remove this ${words.one}`, () => void parts.remove(part), {
				danger: true
			})}
		</InspectorSection>
	{/if}
{/snippet}

{#snippet canDeviceView(name: string, title: string, node: number)}
	<InspectorHeading {title} icon={Cpu} detail={`${name}, node ${node}`} />

	<InspectorSection>
		<p class="text-[13px] text-muted">
			It is on your car's CAN bus, but has no program yet. Make one to put it on a board.
		</p>
		{@render action(Cpu, 'Make its program', run(commands.createDevice(name)))}
	</InspectorSection>

	<BusSimulator {name} />
{/snippet}

{#snippet warning(text: string)}
	<p class="flex items-start gap-2 text-[13px] text-warn">
		<TriangleAlert class="mt-0.5 size-3.5 shrink-0" />
		{text}
	</p>
{/snippet}

{#snippet action(
	Icon: Component,
	label: string,
	onclick: () => void,
	{
		variant = 'outline',
		runsCli = true,
		danger = false
	}: { variant?: 'primary' | 'outline'; runsCli?: boolean; danger?: boolean } = {}
)}
	<Button
		{variant}
		size="sm"
		class={['w-full justify-start', danger && 'text-bad! hover:bg-bad/10!']}
		disabled={runsCli && !canRun}
		{onclick}
	>
		<Icon />
		{label}
	</Button>
{/snippet}

{#snippet field(label: string, value: string, mono = false)}
	<dt class="self-start text-muted">{label}</dt>
	<dd class={['break-all', mono && 'font-mono text-xs leading-5']}>{value}</dd>
{/snippet}
