import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app } from 'electron';
import type { Settings } from '../shared/api.ts';

/**
 * What the editor remembers between runs, in one JSON file in the app's user data folder.
 * Small enough to read once and write whole on every change.
 */

export interface Stored {
	recentProjects: { path: string; name: string; openedAt: string }[];
	window?: { x?: number; y?: number; width: number; height: number; maximized: boolean };
	/** Panel sizes and such, owned by the window. */
	layout?: Record<string, number>;
	/** Only what was changed, see electron/settings.ts for the rest. */
	settings?: Partial<Settings>;
	/** Set once the setup that runs after installing has run. */
	setUp?: boolean;
}

const defaults: Stored = { recentProjects: [] };

let cached: Stored | undefined;

function file(): string {
	return join(app.getPath('userData'), 'state.json');
}

export function read(): Stored {
	if (cached) return cached;
	try {
		cached = { ...defaults, ...(JSON.parse(readFileSync(file(), 'utf8')) as Partial<Stored>) };
	} catch {
		cached = { ...defaults };
	}
	return cached;
}

export function update(change: (stored: Stored) => void): Stored {
	const stored = read();
	change(stored);
	const path = file();
	if (!existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true });
	// Written next to it and renamed, so a crash halfway never leaves half a file.
	writeFileSync(`${path}.tmp`, JSON.stringify(stored, null, '\t'));
	renameSync(`${path}.tmp`, path);
	return stored;
}
