import Bell from '~icons/lucide/bell';
import Bluetooth from '~icons/lucide/bluetooth';
import Camera from '~icons/lucide/camera';
import Clock from '~icons/lucide/clock';
import Gauge from '~icons/lucide/gauge';
import HardDrive from '~icons/lucide/hard-drive';
import Info from '~icons/lucide/info';
import LayoutGrid from '~icons/lucide/layout-grid';
import Monitor from '~icons/lucide/monitor';
import Navigation from '~icons/lucide/navigation';
import Network from '~icons/lucide/network';
import Rotate3d from '~icons/lucide/rotate-3d';
import type { Component } from 'svelte';

/**
 * The setup pages of the inspector, one for each part of `SmartifyOs().init` that is plain
 * data, in the editor's own words. The CLI's `config` reads and writes them by key, and says
 * what each is and its default; what it is called here, and how it is laid out, is the editor's.
 */

export type SetupArea =
	| 'screen'
	| 'car'
	| 'infoDisplay'
	| 'about'
	| 'bluetooth'
	| 'reverseCamera'
	| 'notifications'
	| 'dateTime'
	| 'gps'
	| 'can'
	| 'builtIns'
	| 'system';

export interface AreaInfo {
	id: SetupArea;
	title: string;
	icon: Component;
	/** One line at the top of its page, saying what it is. */
	about: string;
	/** The config it is, whose line `lib/main.dart` opens at. */
	key?: string;
	/** What to put on screen in the running app, so the preview shows what is being changed. */
	show?: { kind: 'window' | 'tile' | 'settings'; id: string };
}

export const setupAreas: AreaInfo[] = [
	{
		id: 'screen',
		title: 'Screen',
		icon: Monitor,
		about: 'How the screen is arranged, what is in the bar, and what the driver can pick.',
		key: 'layouts'
	},
	{
		id: 'car',
		title: 'The car on the screen',
		icon: Rotate3d,
		about: 'Your car as a 3D model, a drawing or a picture, and what moves on it by itself.',
		key: 'car'
	},
	{
		id: 'infoDisplay',
		title: 'Info display',
		icon: Gauge,
		about: 'The big number in the bar, like the speed, and what a tap on it goes through.',
		key: 'infoDisplay'
	},
	{
		id: 'about',
		title: 'About page',
		icon: Info,
		about: 'What the About page in Settings says about your car.',
		key: 'settings',
		show: { kind: 'settings', id: 'about' }
	},
	{
		id: 'bluetooth',
		title: 'Bluetooth',
		icon: Bluetooth,
		about: "Lets the driver's phone play music and take calls through the car.",
		key: 'bluetooth',
		show: { kind: 'settings', id: 'bluetooth' }
	},
	{
		id: 'reverseCamera',
		title: 'Reverse camera',
		icon: Camera,
		about: 'Any USB camera. It fills the screen while the car is in reverse.',
		key: 'reverseCamera',
		show: { kind: 'window', id: 'reverse_camera' }
	},
	{
		id: 'notifications',
		title: 'Notifications',
		icon: Bell,
		about: 'How notifications show up, and the sounds they make.',
		key: 'notifications',
		show: { kind: 'tile', id: '' }
	},
	{
		id: 'dateTime',
		title: 'Date and time',
		icon: Clock,
		about: 'The clock, and how the car knows what time it is.',
		key: 'dateTime',
		show: { kind: 'settings', id: 'date_time' }
	},
	{
		id: 'gps',
		title: 'GPS',
		icon: Navigation,
		about:
			'Where the car is and how fast it goes. The speed on the info display and the wheels follow it.',
		key: 'gps'
	},
	{
		id: 'can',
		title: 'CAN bus',
		icon: Network,
		about: 'How SmartifyOS talks to the boards around your car.',
		key: 'can',
		show: { kind: 'settings', id: 'vehicle.can_devices' }
	},
	{
		id: 'builtIns',
		title: 'Built-in parts',
		icon: LayoutGrid,
		about:
			'Everything SmartifyOS puts in your app by itself. Switch off what your car has no use for.'
	},
	{
		id: 'system',
		title: 'System',
		icon: HardDrive,
		about: 'What SmartifyOS does with the computer in your car.'
	}
];

export function areaInfo(id: SetupArea): AreaInfo {
	return setupAreas.find((area) => area.id === id) ?? (setupAreas[0] as AreaInfo);
}

/** One setting on a setup page. */
export interface FieldSpec {
	key: string;
	label: string;
	/** A line under it, saying what it does when the label does not. */
	hint?: string;
	/** Written after a number: `m`, `°`. */
	unit?: string;
	/** A slider from `min` to `max` next to the number. */
	range?: { min: number; max: number; step?: number };
	/** A number from 0 to 1, shown as a percentage. */
	percent?: boolean;
	/** What each of an enum's values is called, in the order they are offered. */
	options?: { value: string; label: string }[];
	/** Shown when nothing is written and the default is nothing: `The first one plugged in`. */
	placeholder?: string;
	/** Only shown while this switch is on. */
	when?: string;
	/** A sound: one of SmartifyOS's, none, or a file of the app's. */
	sound?: boolean;
	/** On, off, or left to the computer (`null`). */
	automatic?: { label: string; on: string; off: string };
}

/** A part of a setup page, folding away. */
export interface FoldSpec {
	id: string;
	title: string;
	fields: FieldSpec[];
	/** A config that is there or not, switched on and off in the fold's header. */
	section?: string;
	/** What the fold's switch turns on, said when it is off. */
	off?: string;
	/** Folded away until opened. */
	closed?: boolean;
	/** A line above its settings, saying what they are for. */
	note?: string;
}

const seconds = 's';
const metres = 'm';
const degrees = '°';

export const soundNames: Record<string, string> = {
	notificationInfo: 'Info chime',
	notificationWarning: 'Warning chime',
	notificationError: 'Error chime',
	bluetoothConnected: 'Phone connected',
	bluetoothDisconnected: 'Phone disconnected'
};

/** The pages that are only settings, laid out the same way. */
export const fieldPages: Partial<Record<SetupArea, FoldSpec[]>> = {
	bluetooth: [
		{
			id: 'bluetooth',
			title: 'General',
			fields: [
				{
					key: 'bluetooth.enabled',
					label: 'Use Bluetooth',
					hint: 'Off leaves Bluetooth alone completely.'
				},
				{
					key: 'bluetooth.name',
					label: 'Name phones see',
					placeholder: "The computer's own",
					when: 'bluetooth.enabled'
				},
				{
					key: 'bluetooth.powerOn',
					label: 'Turn on at startup',
					when: 'bluetooth.enabled'
				}
			]
		},
		{
			id: 'bluetooth.pairing',
			title: 'Pairing a new phone',
			fields: [
				{ key: 'bluetooth.discoverable', label: 'Findable by new phones' },
				{ key: 'bluetooth.pairable', label: 'New phones can pair' },
				{
					key: 'bluetooth.pairingMode',
					label: 'How it pairs',
					options: [
						{ value: 'confirmCode', label: 'Both show a code to confirm' },
						{ value: 'showCode', label: 'The car shows a code to type' },
						{ value: 'none', label: 'No code at all' }
					]
				},
				{ key: 'bluetooth.pairingTimeout', label: 'Gives up after', unit: seconds }
			]
		},
		{
			id: 'bluetooth.connecting',
			title: 'Connecting',
			fields: [
				{
					key: 'bluetooth.autoConnect',
					label: 'Reconnect to known phones',
					hint: 'This is what starts the music by itself when you get in.'
				},
				{
					key: 'bluetooth.autoAcceptServices',
					label: 'Music and calls without asking',
					hint: 'For phones the car knows already.'
				},
				{ key: 'bluetooth.reconnectMinDelay', label: 'First try after', unit: seconds },
				{ key: 'bluetooth.reconnectMaxDelay', label: 'Longest wait', unit: seconds }
			]
		},
		{
			id: 'bluetooth.sounds',
			title: 'Sounds',
			fields: [
				{ key: 'bluetooth.connectedSound', label: 'Phone connects', sound: true },
				{ key: 'bluetooth.disconnectedSound', label: 'Phone disconnects', sound: true },
				{ key: 'bluetooth.soundVolume', label: 'Volume', percent: true }
			]
		},
		{
			id: 'bluetooth.advanced',
			title: 'Advanced',
			closed: true,
			fields: [
				{
					key: 'bluetooth.adapter',
					label: 'Adapter',
					placeholder: 'The first one',
					hint: 'Only for a car with more than one, like hci1.'
				}
			]
		}
	],

	reverseCamera: [
		{
			id: 'reverseCamera',
			title: 'Camera',
			section: 'reverseCamera',
			off: 'Your car has no reverse camera yet.',
			fields: [
				{ key: 'reverseCamera.device', label: 'Which camera', placeholder: 'The first one' },
				{
					key: 'reverseCamera.mirror',
					label: 'Mirror the picture',
					hint: "So the car's left side shows on the left, like in a mirror."
				},
				{ key: 'reverseCamera.openWhenReversing', label: 'Open when reversing' }
			]
		},
		{
			id: 'reverseCamera.guides',
			title: 'Guide lines',
			section: 'reverseCamera.guides',
			off: 'Lines over the picture showing where the car will end up.',
			fields: [
				{ key: 'reverseCamera.guides.carWidth', label: 'Car width', unit: metres },
				{ key: 'reverseCamera.guides.wheelbase', label: 'Wheelbase', unit: metres },
				{
					key: 'reverseCamera.guides.rearOverhang',
					label: 'Back wheels to bumper',
					unit: metres
				},
				{ key: 'reverseCamera.guides.cameraHeight', label: 'Camera height', unit: metres },
				{
					key: 'reverseCamera.guides.cameraSideOffset',
					label: 'Off the middle',
					unit: metres,
					hint: 'Towards the right is more than 0.'
				},
				{
					key: 'reverseCamera.guides.cameraTilt',
					label: 'Looks down',
					unit: degrees,
					range: { min: 0, max: 90, step: 1 }
				},
				{
					key: 'reverseCamera.guides.cameraYaw',
					label: 'Looks sideways',
					unit: degrees,
					range: { min: -30, max: 30, step: 0.5 }
				},
				{
					key: 'reverseCamera.guides.cameraRoll',
					label: 'Turned',
					unit: degrees,
					range: { min: -30, max: 30, step: 0.5 }
				},
				{
					key: 'reverseCamera.guides.fieldOfView',
					label: 'Field of view',
					unit: degrees,
					range: { min: 60, max: 180, step: 1 },
					hint: 'Often on the box, 120 to 170.'
				},
				{ key: 'reverseCamera.guides.length', label: 'Line length', unit: metres },
				{ key: 'reverseCamera.guides.color', label: 'Line colour' },
				{ key: 'reverseCamera.guides.stopLineColor', label: 'Stop line colour' },
				{
					key: 'reverseCamera.guides.stopLineDistance',
					label: 'Stop line behind the car',
					unit: metres
				}
			]
		}
	],

	notifications: [
		{
			id: 'notifications.showing',
			title: 'Showing',
			fields: [
				{ key: 'notifications.defaultShowFor', label: 'On screen for', unit: seconds },
				{
					key: 'notifications.maxKept',
					label: 'The shade keeps',
					hint: 'The oldest goes once there are more. Ongoing ones always stay.'
				},
				{ key: 'notifications.doNotDisturb', label: 'Start with do not disturb on' }
			]
		},
		{
			id: 'notifications.sounds',
			title: 'Sounds',
			fields: [
				{ key: 'notifications.soundsEnabled', label: 'Sounds' },
				{
					key: 'notifications.soundVolume',
					label: 'Volume',
					percent: true,
					when: 'notifications.soundsEnabled'
				},
				{
					key: 'notifications.infoSound',
					label: 'Info',
					sound: true,
					when: 'notifications.soundsEnabled'
				},
				{
					key: 'notifications.warningSound',
					label: 'Warning',
					sound: true,
					when: 'notifications.soundsEnabled'
				},
				{
					key: 'notifications.errorSound',
					label: 'Error',
					sound: true,
					when: 'notifications.soundsEnabled'
				}
			]
		}
	],

	dateTime: [
		{
			id: 'dateTime',
			title: 'Clock',
			fields: [
				{
					key: 'dateTime.automatic',
					label: 'Set the time by itself',
					hint: 'From the internet or the GPS. Off, the driver sets the clock.'
				},
				{ key: 'dateTime.timeZone', label: 'Time zone' },
				{
					key: 'dateTime.use24HourClock',
					label: 'Clock',
					automatic: {
						label: "The computer's own",
						on: '24 hours, 13:45',
						off: '12 hours, 1:45 PM'
					}
				},
				{
					key: 'dateTime.setSystemClock',
					label: "Change the computer's clock",
					hint: 'Leave it on, unless something else in the car sets it.'
				}
			]
		}
	],

	gps: [
		{
			id: 'gps',
			title: 'GPS',
			note: "On a car running Linux your app reports where the car is itself, from a GPS module or the car's own bus, with SmartifyOsGps.reportNmea or SmartifyOsGps.reportFix. On an Android tablet its own receiver is used.",
			fields: [
				{ key: 'gps.enabled', label: 'Use the GPS', hint: 'Off, nothing is started or asked for.' },
				{
					key: 'gps.setClock',
					label: 'Set the clock from it',
					hint: 'When what reports the position knows the time too.',
					when: 'gps.enabled'
				},
				{
					key: 'gps.fixTimeout',
					label: 'Forget a position after',
					unit: seconds,
					hint: 'When nothing new comes in, for a module that can stop without saying so. 0 keeps it.',
					when: 'gps.enabled'
				}
			]
		},
		{
			id: 'gps.receiver',
			title: "An Android tablet's own receiver",
			note: 'Only for an Android tablet, which has a receiver of its own. A position your app reports itself does not use these.',
			closed: true,
			fields: [
				{
					key: 'gps.accuracy',
					label: 'Accuracy',
					when: 'gps.enabled',
					options: [
						{ value: 'best', label: 'Best' },
						{ value: 'high', label: 'High' },
						{ value: 'medium', label: 'Medium' },
						{ value: 'low', label: 'Low, saves power' }
					]
				},
				{
					key: 'gps.distanceFilter',
					label: 'New position every',
					unit: metres,
					hint: '0 is as often as there is one, which a live speed needs.',
					when: 'gps.enabled'
				},
				{
					key: 'gps.requestPermission',
					label: 'Ask for the location permission',
					when: 'gps.enabled'
				}
			]
		}
	],

	can: [
		{
			id: 'can',
			title: 'The bus',
			fields: [
				{
					key: 'can.bitrate',
					label: 'Speed',
					hint: 'Every board on the bus has to use the same.',
					options: [
						{ value: 'kbps10', label: '10 kbit/s' },
						{ value: 'kbps20', label: '20 kbit/s' },
						{ value: 'kbps50', label: '50 kbit/s' },
						{ value: 'kbps100', label: '100 kbit/s' },
						{ value: 'kbps125', label: '125 kbit/s' },
						{ value: 'kbps250', label: '250 kbit/s' },
						{ value: 'kbps500', label: '500 kbit/s' },
						{ value: 'kbps1000', label: '1 Mbit/s' }
					]
				},
				{
					key: 'can.listenOnly',
					label: 'Only listen',
					hint: "For your car's own bus, where a stray message could confuse it."
				},
				{
					key: 'can.deviceTimeout',
					label: 'A board counts as gone after',
					unit: seconds
				},
				{
					key: 'can.firmwareHeader',
					label: 'Header for the boards',
					hint: 'Written while your app runs on this computer, for the boards to include.'
				}
			]
		}
	],

	system: [
		{
			id: 'system.drives',
			title: 'USB drives',
			fields: [
				{ key: 'drives.enabled', label: 'Look for USB drives' },
				{
					key: 'drives.mountAutomatically',
					label: 'Open a drive when it is plugged in',
					when: 'drives.enabled'
				},
				{
					key: 'updates.enabled',
					label: 'Offer updates from a drive',
					hint: 'An update you exported onto a USB stick.'
				}
			]
		},
		{
			id: 'system.volume',
			title: 'Volume',
			fields: [
				{
					key: 'volume.enabled',
					label: 'Change the volume',
					hint: 'Off, SmartifyOS never touches it, and there is no volume bar.'
				}
			]
		}
	]
};

/** The code a page can have instead of SmartifyOS's own, said in a line with where it is. */
export const ownCode: Partial<Record<SetupArea, { key: string; what: string }[]>> = {
	bluetooth: [{ key: 'bluetooth.backend', what: 'Bluetooth of its own' }],
	reverseCamera: [{ key: 'reverseCamera.backend', what: 'a camera of its own' }],
	dateTime: [{ key: 'dateTime.backend', what: 'a clock of its own' }],
	gps: [{ key: 'gps.backend', what: 'a GPS of its own' }],
	system: [
		{ key: 'drives.backend', what: 'drives of its own' },
		{ key: 'volume.backend', what: 'a volume of its own' },
		{ key: 'updates.backend', what: 'updates of its own' }
	]
};

/** Every built-in SmartifyOS has that a car can leave out, by the list it is left out with. */
export const builtIns: { key: string; title: string; items: { id: string; label: string }[] }[] = [
	{
		key: 'appList.hiddenEntries',
		title: 'Apps',
		items: [
			{ id: 'settings', label: 'Settings' },
			{ id: 'home_widgets', label: 'Widgets' },
			{ id: 'reverse_camera', label: 'Reverse camera' }
		]
	},
	{
		key: 'homeWidgets.hiddenWidgets',
		title: 'Home screen widgets',
		items: [
			{ id: 'bluetooth_player', label: 'Music player' },
			{ id: 'quick_settings', label: 'Quick settings' },
			{ id: 'clock', label: 'Clock' },
			{ id: 'info_display', label: 'Info display' },
			{ id: 'car', label: 'Car' },
			{ id: 'reverse_camera', label: 'Reverse camera' }
		]
	},
	{
		key: 'quickSettings.hiddenTiles',
		title: 'Quick settings',
		items: [
			{ id: 'do_not_disturb', label: 'Do not disturb' },
			{ id: 'bluetooth', label: 'Bluetooth' }
		]
	},
	{
		key: 'statusBar.hiddenIcons',
		title: 'Status bar',
		items: [
			{ id: 'home', label: 'Home button' },
			{ id: 'clock', label: 'Clock' },
			{ id: 'notifications', label: 'Notifications' },
			{ id: 'ongoing_notifications', label: 'Ongoing notifications' },
			{ id: 'do_not_disturb', label: 'Do not disturb' },
			{ id: 'bluetooth', label: 'Bluetooth' }
		]
	},
	{
		key: 'settings.hiddenPages',
		title: 'Settings pages',
		items: [
			{ id: 'connectivity', label: 'Connectivity' },
			{ id: 'bluetooth', label: 'Bluetooth' },
			{ id: 'wifi', label: 'Wi-Fi' },
			{ id: 'mobile_data', label: 'Mobile data' },
			{ id: 'sound', label: 'Sound' },
			{ id: 'display', label: 'Display' },
			{ id: 'appearance', label: 'Appearance' },
			{ id: 'vehicle', label: 'Vehicle' },
			{ id: 'vehicle.can_devices', label: 'CAN devices' },
			{ id: 'date_time', label: 'Date and time' },
			{ id: 'language', label: 'Language' },
			{ id: 'system', label: 'System' },
			{ id: 'developer', label: 'Developer options' },
			{ id: 'about', label: 'About' }
		]
	}
];
