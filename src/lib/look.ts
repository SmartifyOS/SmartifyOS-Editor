import Box from '~icons/lucide/box';
import ImageIcon from '~icons/lucide/image';
import PenTool from '~icons/lucide/pen-tool';
import type { Component } from 'svelte';
import type { BarChoice, CarLookName } from '../../shared/cli.ts';

/**
 * The choices for how a car's app looks, in the words `smartify-os create` and
 * `smartify-os appearance` use. A copy of the CLI's lists (which are a copy of core's), so a new
 * built-in layout or theme is a change here too. While the app runs, its own list (with the
 * car's own layouts and themes) is used instead.
 */

export const layouts = [
	{
		id: 'classic',
		label: 'Classic',
		hint: 'The car filling the screen, cards sliding in above it'
	},
	{ id: 'split', label: 'Split', hint: 'The car in a panel, widgets next to it' },
	{ id: 'sidebar', label: 'Sidebar', hint: "A bar down the driver's side, next to open apps" },
	{ id: 'tiles', label: 'Tiles', hint: "A grid of widgets like a phone's, and a dock" },
	{ id: 'focus', label: 'Focus', hint: 'The speed, big, and very little else' },
	{ id: 'portrait', label: 'Portrait', hint: 'For a screen standing upright' }
];

export const themes = [
	{ id: 'glass', label: 'Glass' },
	{ id: 'slate', label: 'Slate' },
	{ id: 'carbon', label: 'Carbon' },
	{ id: 'frost', label: 'Frost' },
	{ id: 'midnight', label: 'Midnight' },
	{ id: 'horizon', label: 'Horizon' },
	{ id: 'retro', label: 'Retro' }
];

export const bars: { id: BarChoice; label: string }[] = [
	{ id: 'infoDisplay', label: 'The info display' },
	{ id: 'dock', label: 'A dock of apps' },
	{ id: 'infoDisplayAndDock', label: 'Both' }
];

/** Each way to draw the car, with the files it takes and the CLI's flag for it. */
export const carLooks: {
	id: CarLookName;
	label: string;
	icon: Component;
	extensions: string[];
	flag: string;
}[] = [
	{ id: 'model3D', label: '3D model', icon: Box, extensions: ['glb'], flag: 'model-3d' },
	{ id: 'drawing2D', label: 'Drawing', icon: PenTool, extensions: ['svg'], flag: 'drawing' },
	{
		id: 'image',
		label: 'Picture',
		icon: ImageIcon,
		extensions: ['png', 'jpg', 'jpeg', 'webp'],
		flag: 'picture'
	}
];
