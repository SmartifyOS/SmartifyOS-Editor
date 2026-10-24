import CircleArrowUp from '~icons/lucide/circle-arrow-up';
import Cpu from '~icons/lucide/cpu';
import Eye from '~icons/lucide/eye';
import FolderInput from '~icons/lucide/folder-input';
import FolderOpen from '~icons/lucide/folder-open';
import HardDriveDownload from '~icons/lucide/hard-drive-download';
import Plus from '~icons/lucide/plus';
import RefreshCw from '~icons/lucide/refresh-cw';
import Trash from '~icons/lucide/trash-2';
import Undo from '~icons/lucide/undo-2';
import Usb from '~icons/lucide/usb';
import VsCode from '~icons/logos/visual-studio-code';
import type { MenuItem } from './components/ui/ContextMenu.svelte';
import { commands } from './commands.ts';
import { canShow, kindWords } from './parts.ts';
import { areaInfo } from './setup.ts';
import { config } from './state/config.svelte.ts';
import { editor, type Selection } from './state/editor.svelte.ts';
import { parts } from './state/parts.svelte.ts';
import { settingsPages } from './state/settings.svelte.ts';

/**
 * What the right click menu of each thing in the car panel offers: the same as its inspector,
 * without having to pick it first.
 */

const revealLabel =
	window.smartify.platform === 'darwin'
		? 'Show in Finder'
		: window.smartify.platform === 'win32'
			? 'Show in Explorer'
			: 'Show in files';

/** Points a package of the car at a copy of it in a folder, asking which folder. */
export async function linkCopy(): Promise<void> {
	const folder = await window.smartify.files.pickFolder(
		'The folder with the copy, the one with its pubspec.yaml'
	);
	if (folder) await editor.runTask(commands.link(folder));
}

export function actionsFor(selection: Selection): MenuItem[] {
	const project = editor.project;
	if (!project) return [];
	const canRun = !editor.busy && editor.cli?.found === true;
	const running = editor.preview.status === 'running';
	const updates = editor.carUpdates;
	const run = (spec: Parameters<typeof editor.runTask>[0]) => () => void editor.runTask(spec);

	switch (selection.kind) {
		case 'car':
			return [
				{ icon: VsCode, label: 'Open in VS Code', run: () => editor.openInVsCode() },
				{
					icon: FolderOpen,
					label: revealLabel,
					run: () => window.smartify.projects.reveal(project.path)
				},
				'separator',
				...(updates?.smartifyOs
					? [
							{
								icon: CircleArrowUp,
								label: `Update SmartifyOS to ${updates.smartifyOs}`,
								run: run(commands.updateSmartifyOs()),
								disabled: !canRun
							}
						]
					: []),
				{
					icon: Plus,
					label: 'Add an extension…',
					run: () => (editor.addExtensionDialog = true),
					disabled: !canRun
				}
			];

		case 'package': {
			const { smartifyOs, extensions } = project.car;
			const core = smartifyOs.name === selection.name;
			const info = core ? smartifyOs : extensions.find((e) => e.name === selection.name);
			if (!info) return [];
			const newer = core ? updates?.smartifyOs : updates?.extensions[info.name];
			const update = core
				? commands.updateSmartifyOs()
				: commands.updateExtension(info.name, info.title);
			const items: MenuItem[] = info.linkedTo
				? [
						{
							icon: Undo,
							label: 'Go back to the released one',
							run: run(commands.unlink(info.name, info.title)),
							disabled: !canRun
						}
					]
				: [
						newer
							? {
									icon: CircleArrowUp,
									label: `Update to ${newer}`,
									run: run(update),
									disabled: !canRun
								}
							: {
									icon: RefreshCw,
									label: 'Look for a newer version',
									run: run(update),
									disabled: !canRun
								},
						{
							icon: FolderInput,
							label: 'Use a copy from a folder…',
							run: () => void linkCopy(),
							disabled: !canRun
						}
					];
			if (!core) {
				items.push('separator', {
					icon: Trash,
					label: 'Remove from your car',
					run: run(commands.removeExtension(info.name, info.title)),
					disabled: !canRun,
					danger: true
				});
			}
			return items;
		}

		case 'part': {
			const part = parts.find(selection.part, selection.key);
			if (!part) return [];
			const words = kindWords[part.kind];
			return [
				{
					icon: VsCode,
					label: words.write,
					run: () => editor.openInVsCode(undefined, part.file, part.line)
				},
				...(running && canShow(part)
					? [{ icon: Eye, label: words.show, run: () => void parts.show(part) }]
					: []),
				// Only one the CLI made in a file of its own can be taken out by it.
				...(part.canChange.remove
					? [
							'separator' as const,
							{
								icon: Trash,
								label: `Remove this ${words.one}`,
								run: () => void parts.remove(part),
								disabled: !canRun || parts.busy > 0,
								danger: true
							}
						]
					: [])
			];
		}

		case 'settings': {
			const page = settingsPages.find(selection.key);
			if (!page) return [];
			return [
				{
					icon: VsCode,
					label: 'Open it in VS Code',
					run: () => editor.openInVsCode(undefined, page.file, page.line)
				},
				...(running
					? [
							{
								icon: Eye,
								label: 'Show it in the preview',
								run: () => void settingsPages.show(page)
							}
						]
					: []),
				...(page.editable
					? [
							'separator' as const,
							{
								icon: Trash,
								label: 'Remove this page',
								run: () => void settingsPages.remove(page),
								disabled: !canRun,
								danger: true
							}
						]
					: [])
			];
		}

		case 'device': {
			const info = project.devices.find((device) => device.folder === selection.folder);
			if (!info) return [];
			return [
				{
					icon: VsCode,
					label: 'Open its program in VS Code',
					run: () => editor.openInVsCode(info.folder, 'src/main.cpp')
				},
				'separator',
				{
					icon: Usb,
					label: 'Put it on its board',
					run: run(commands.flashDevice(info.name)),
					disabled: !canRun
				},
				{
					icon: HardDriveDownload,
					label: 'Export its firmware',
					run: run(commands.exportDevices([info.name])),
					disabled: !canRun
				}
			];
		}

		case 'canDevice':
			return [
				{
					icon: Cpu,
					label: 'Make its program',
					run: run(commands.createDevice(selection.name)),
					disabled: !canRun
				}
			];

		case 'usbDevice': {
			const program = project.devices.find(
				(device) => device.name === selection.name && device.connection === 'usb'
			);
			const defined = project.usbDevices.find((board) => board.name === selection.name);
			return [
				...(program
					? [
							{
								icon: VsCode,
								label: 'Open its program in VS Code',
								run: () => editor.openInVsCode(program.folder, 'src/main.cpp')
							},
							'separator' as const,
							{
								icon: Usb,
								label: 'Put it on its board',
								run: run(commands.flashDevice(selection.name)),
								disabled: !canRun
							},
							{
								icon: HardDriveDownload,
								label: 'Export its firmware',
								run: run(commands.exportDevices([selection.name])),
								disabled: !canRun
							}
						]
					: [
							{
								icon: Cpu,
								label: 'Make its program',
								run: run(commands.createDevice(selection.name, true)),
								disabled: !canRun || !defined
							}
						]),
				...(defined
					? [
							'separator' as const,
							{
								icon: VsCode,
								label: 'Open where your app defines it',
								run: () => editor.openInVsCode(undefined, defined.file, defined.line)
							}
						]
					: [])
			];
		}

		case 'setup': {
			const info = areaInfo(selection.area);
			const line = info.key ? config.line(info.key) : undefined;
			return [
				{
					icon: VsCode,
					label: 'Open it in VS Code',
					run: () => editor.openInVsCode(undefined, 'lib/main.dart', line)
				},
				...(running && info.show
					? [
							{
								icon: Eye,
								label: 'Show it in the preview',
								run: () => void config.showArea(selection.area)
							}
						]
					: [])
			];
		}
	}
}
