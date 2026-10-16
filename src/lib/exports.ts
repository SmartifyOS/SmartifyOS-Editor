import type { Component } from 'svelte';
import Cpu from '~icons/lucide/cpu';
import HardDriveDownload from '~icons/lucide/hard-drive-download';
import RefreshCw from '~icons/lucide/refresh-cw';
import { commands } from './commands.ts';
import type { TaskSpec } from './state/task.svelte.ts';

/** What can be exported onto a USB stick for the car, for the Export menu and the inspector. */
export interface ExportChoice {
	label: string;
	hint: string;
	icon: Component;
	task: TaskSpec;
	/** Only there for a car with devices. */
	needsDevices: boolean;
}

export const exportChoices: ExportChoice[] = [
	{
		label: 'Export installer',
		hint: 'A USB stick that sets up a new car',
		icon: HardDriveDownload,
		task: commands.exportInstaller(),
		needsDevices: false
	},
	{
		label: 'Export update',
		hint: 'For a car that runs SmartifyOS already',
		icon: RefreshCw,
		task: commands.exportUpdate(),
		needsDevices: false
	},
	{
		label: 'Export firmware',
		hint: 'New firmware for the devices on your CAN bus',
		icon: Cpu,
		task: commands.exportDevices(),
		needsDevices: true
	}
];
