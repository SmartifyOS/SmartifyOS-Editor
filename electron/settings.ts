import type { Settings } from '../shared/api.ts';
import { read, update } from './store.ts';

/** What the settings page changes, with what each is until it is changed. */

const defaults: Settings = {
	backgroundUpdates: true,
	newCarFolder: null
};

export function settings(): Settings {
	return { ...defaults, ...read().settings };
}

export function changeSettings(change: Partial<Settings>): Settings {
	update((stored) => {
		stored.settings = { ...stored.settings, ...change };
	});
	return settings();
}
