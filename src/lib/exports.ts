import type { Component } from 'svelte';
import Cpu from '~icons/lucide/cpu';
import HardDriveDownload from '~icons/lucide/hard-drive-download';
import RefreshCw from '~icons/lucide/refresh-cw';
import type { Project } from '../../shared/api.ts';
import { commands } from './commands.ts';
import type { TaskSpec } from './state/task.svelte.ts';

/** What can be exported onto a USB stick for the car, for the Export menu and the inspector. */
export interface ExportChoice {
	label: string;
	hint: string;
	icon: Component;
	task: TaskSpec;
	/** Only there for a car with devices that have a program. */
	needsDevices: boolean;
}

/** The choices there are for this car. */
export function exportsFor(project: Project | undefined): ExportChoice[] {
	const devices = (project?.devices.length ?? 0) > 0;
	return exportChoices.filter((choice) => !choice.needsDevices || devices);
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
		hint: 'New firmware for your devices, on the CAN bus or on USB',
		icon: Cpu,
		task: commands.exportDevices(),
		needsDevices: true
	}
];
