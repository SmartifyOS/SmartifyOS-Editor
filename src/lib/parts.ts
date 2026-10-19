import AppWindow from '~icons/lucide/app-window';
import Armchair from '~icons/lucide/armchair';
import BatteryFull from '~icons/lucide/battery-full';
import Bell from '~icons/lucide/bell';
import CarFront from '~icons/lucide/car-front';
import CircleDot from '~icons/lucide/circle-dot';
import DoorOpen from '~icons/lucide/door-open';
import Droplet from '~icons/lucide/droplet';
import Fan from '~icons/lucide/fan';
import Fuel from '~icons/lucide/fuel';
import Gauge from '~icons/lucide/gauge';
import Info from '~icons/lucide/info';
import LayoutDashboard from '~icons/lucide/layout-dashboard';
import LayoutGrid from '~icons/lucide/layout-grid';
import Lightbulb from '~icons/lucide/lightbulb';
import Lock from '~icons/lucide/lock';
import Map from '~icons/lucide/map';
import Maximize from '~icons/lucide/maximize';
import Music from '~icons/lucide/music';
import PictureInPicture from '~icons/lucide/picture-in-picture-2';
import Pin from '~icons/lucide/pin';
import RectangleHorizontal from '~icons/lucide/rectangle-horizontal';
import Route from '~icons/lucide/route';
import Settings from '~icons/lucide/settings';
import Snowflake from '~icons/lucide/snowflake';
import Star from '~icons/lucide/star';
import Thermometer from '~icons/lucide/thermometer';
import Timer from '~icons/lucide/timer';
import ToggleRight from '~icons/lucide/toggle-right';
import Video from '~icons/lucide/video';
import Volume from '~icons/lucide/volume-2';
import Wrench from '~icons/lucide/wrench';
import Zap from '~icons/lucide/zap';
import type { Component } from 'svelte';
import type { Part, PartKind, PartVariant } from '../../shared/cli.ts';

/**
 * The editor's words for the windows, quick settings tiles and home screen widgets the CLI
 * makes (`smartify-os window create` and the others), said for someone who has never written
 * an app.
 */

export interface KindWords {
	/** In the car panel and the inspector: `Windows`. */
	plural: string;
	/** One of them: `window`. */
	one: string;
	/** What the button that makes one says: `New window`. */
	create: string;
	/** What it is, in a sentence or two, and where the driver finds it. */
	about: string;
	/** What filling it in is called: `Write what it shows`. */
	write: string;
	/** What putting one on screen in the preview is called: `Open it in the preview`. */
	show: string;
	/** What the dialog suggests as a name. */
	example: string;
	/** Shown when there is none of them. */
	icon: Component;
	variants: {
		id: PartVariant;
		flag: string;
		label: string;
		hint: string;
		/** What one of this kind is, said after {@link KindWords.about}. */
		describe: string;
		icon: Component;
	}[];
}

export const kindWords: Record<PartKind, KindWords> = {
	window: {
		plural: 'Windows',
		one: 'window',
		create: 'New window',
		about:
			'A screen of its own, like an app on a phone. The driver opens it from its icon in the app list, the grid button in the bar.',
		write: 'Write what it shows',
		show: 'Open it in the preview',
		example: 'Trip computer',
		icon: AppWindow,
		variants: [
			{
				id: 'fullscreen',
				flag: 'fullscreen',
				label: 'Full screen',
				hint: 'Fills the screen, like most apps',
				describe: 'It fills the whole screen while it is open.',
				icon: Maximize
			},
			{
				id: 'floating',
				flag: 'floating',
				label: 'Floating',
				hint: 'Smaller, with the home screen around it',
				describe: 'It floats over the home screen while it is open, smaller than the screen.',
				icon: PictureInPicture
			}
		]
	},
	tile: {
		plural: 'Quick settings tiles',
		one: 'tile',
		create: 'New tile',
		about:
			'A quick switch or button in the quick settings, the shade the driver pulls down from the top of the screen. For things they reach for while driving.',
		write: 'Write what it does',
		show: 'Show the quick settings in the preview',
		example: 'Interior light',
		icon: ToggleRight,
		variants: [
			{
				id: 'toggle',
				flag: 'switch',
				label: 'A switch',
				hint: 'Turns something on and off, like a light',
				describe: 'It is a switch: tapping it turns something on or off.',
				icon: ToggleRight
			},
			{
				id: 'button',
				flag: 'button',
				label: 'A button',
				hint: 'Does the same thing every time, like opening the trunk',
				describe: 'It is a button: tapping it does the same thing every time.',
				icon: CircleDot
			}
		]
	},
	widget: {
		plural: 'Home screen widgets',
		one: 'widget',
		create: 'New widget',
		about: 'Something on the home screen, next to the car.',
		write: 'Write what it shows',
		show: 'Show it on the home screen',
		example: 'Oil temperature',
		icon: LayoutGrid,
		variants: [
			{
				id: 'card',
				flag: 'card',
				label: 'A card',
				hint: 'Shows up by itself where the layout has cards, and can be swiped away',
				describe:
					'It is a card: it shows up by itself where the layout has cards, and the driver can swipe it away.',
				icon: RectangleHorizontal
			},
			{
				id: 'pinned',
				flag: 'pinned',
				label: 'Always there',
				hint: 'Stays where the driver puts it, by holding an area of the home screen',
				describe:
					'It stays where it is put: the driver adds it by holding an area of the home screen.',
				icon: Pin
			}
		]
	}
};

/** The order the kinds are shown in. */
export const partKinds: PartKind[] = ['window', 'tile', 'widget'];

/**
 * The icons the CLI offers (`partIcons` in its `src/core/project/parts.ts`), by their names in
 * Flutter's `Icons`, each with the closest one the editor can draw to show it.
 */
export const partIcons: { id: string; label: string; icon: Component }[] = [
	{ id: 'directions_car', label: 'Car', icon: CarFront },
	{ id: 'speed', label: 'Gauge', icon: Gauge },
	{ id: 'local_gas_station', label: 'Fuel', icon: Fuel },
	{ id: 'battery_full', label: 'Battery', icon: BatteryFull },
	{ id: 'bolt', label: 'Power', icon: Zap },
	{ id: 'thermostat', label: 'Temperature', icon: Thermometer },
	{ id: 'water_drop', label: 'Fluid', icon: Droplet },
	{ id: 'air', label: 'Fan', icon: Fan },
	{ id: 'ac_unit', label: 'Air conditioning', icon: Snowflake },
	{ id: 'event_seat', label: 'Seat', icon: Armchair },
	{ id: 'lightbulb', label: 'Light', icon: Lightbulb },
	{ id: 'lock', label: 'Lock', icon: Lock },
	{ id: 'door_front_door', label: 'Door', icon: DoorOpen },
	{ id: 'videocam', label: 'Camera', icon: Video },
	{ id: 'map', label: 'Map', icon: Map },
	{ id: 'route', label: 'Trip', icon: Route },
	{ id: 'music_note', label: 'Music', icon: Music },
	{ id: 'volume_up', label: 'Sound', icon: Volume },
	{ id: 'timer', label: 'Timer', icon: Timer },
	{ id: 'build', label: 'Tools', icon: Wrench },
	{ id: 'notifications', label: 'Alert', icon: Bell },
	{ id: 'info', label: 'Info', icon: Info },
	{ id: 'settings', label: 'Settings', icon: Settings },
	{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
	{ id: 'star', label: 'Star', icon: Star }
];

/** The icon a new one of each kind starts with, the same as the CLI's. */
export const defaultIcons: Record<PartKind, string> = {
	window: 'dashboard',
	tile: 'bolt',
	widget: 'info'
};

/** What the editor draws for an icon from Flutter's `Icons`, the kind's own for any other. */
export function iconFor(kind: PartKind, icon: string | null): Component {
	return partIcons.find((known) => known.id === icon)?.icon ?? kindWords[kind].icon;
}

/**
 * Whether `show` can put one on screen in the running app. A widget that is not a card is
 * only on the home screen once the driver adds it there.
 */
/** What picks a part in the car panel: its file, and which one in it, since a file can have several. */
export function partKey(part: Part): string {
	return `${part.file}#${part.id ?? part.line}`;
}

export function canShow(part: Part): boolean {
	return part.kind !== 'widget' || part.variant === 'card';
}
