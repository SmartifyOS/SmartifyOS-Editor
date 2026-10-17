import ChevronsUpDown from '~icons/lucide/chevrons-up-down';
import Info from '~icons/lucide/info';
import MousePointerClick from '~icons/lucide/mouse-pointer-click';
import ToggleRight from '~icons/lucide/toggle-right';
import type { Component } from 'svelte';
import type { RowKind } from '../../shared/cli.ts';

/**
 * The editor's words for the rows of a settings page of the car's own, and the pages
 * SmartifyOS ships that one can go in (a copy of the CLI's `builtInPages`, used while the app
 * is not running to say which pages there are).
 */

export const rowWords: Record<
	RowKind,
	{ flag: string; label: string; hint: string; placeholder: string; icon: Component }
> = {
	toggle: {
		flag: 'switch',
		label: 'Switch',
		hint: 'On or off, like seat heating',
		placeholder: 'Seat heating',
		icon: ToggleRight
	},
	choice: {
		flag: 'choice',
		label: 'Choice',
		hint: 'One of a few options, like Low, Medium, High',
		placeholder: 'Fan speed',
		icon: ChevronsUpDown
	},
	action: {
		flag: 'button',
		label: 'Button',
		hint: 'Does something when tapped, like Reset trip',
		placeholder: 'Reset trip',
		icon: MousePointerClick
	},
	info: {
		flag: 'info',
		label: 'Information',
		hint: 'Shows something, like the next service',
		placeholder: 'Next service',
		icon: Info
	}
};

export const rowKinds: RowKind[] = ['toggle', 'choice', 'action', 'info'];

export const builtInPages: { id: string; title: string }[] = [
	{ id: 'root', title: 'Settings itself' },
	{ id: 'connectivity', title: 'Connectivity' },
	{ id: 'bluetooth', title: 'Bluetooth' },
	{ id: 'wifi', title: 'Wi-Fi' },
	{ id: 'mobile_data', title: 'Mobile data' },
	{ id: 'sound', title: 'Sound' },
	{ id: 'display', title: 'Display' },
	{ id: 'appearance', title: 'Appearance' },
	{ id: 'vehicle', title: 'Vehicle' },
	{ id: 'vehicle.can_devices', title: 'CAN bus devices' },
	{ id: 'date_time', title: 'Date & time' },
	{ id: 'language', title: 'Language' },
	{ id: 'system', title: 'System' },
	{ id: 'developer', title: 'Developer options' },
	{ id: 'about', title: 'About' }
];
