import { type FSWatcher, watch } from 'node:fs';
import { join, sep } from 'node:path';

/**
 * Watches the open car's app for changes, made in VS Code or anywhere else, so the window can
 * read again what it shows: `lib/` with everything in it, and `pubspec.yaml`.
 *
 * Saving a file often comes as several events (an editor writes a copy and renames it), so
 * they are gathered for a moment and handed over together, as paths relative to the app.
 */

/** How long changes are gathered before they are handed over. */
const settleMs = 300;

export class ProjectWatcher {
	private watchers: FSWatcher[] = [];
	private changed = new Set<string>();
	private timer: NodeJS.Timeout | undefined;

	constructor(private readonly onChange: (paths: string[]) => void) {}

	/** Watches this car's app from now on, or nothing with undefined. */
	watch(dir: string | undefined): void {
		this.stop();
		if (!dir) return;
		this.add(join(dir, 'lib'), { recursive: true }, (file) => `lib/${file}`);
		// The folder rather than the file: a file that is replaced on saving would lose its watcher.
		this.add(dir, { recursive: false }, (file) => (file === 'pubspec.yaml' ? file : undefined));
	}

	stop(): void {
		for (const watcher of this.watchers) watcher.close();
		this.watchers = [];
		clearTimeout(this.timer);
		this.changed.clear();
	}

	private add(
		path: string,
		options: { recursive: boolean },
		name: (file: string) => string | undefined
	) {
		try {
			const watcher = watch(path, options, (_event, file) => {
				if (!file) return;
				const relative = name(file.split(sep).join('/'));
				if (relative && /\.(dart|yaml)$/.test(relative)) this.note(relative);
			});
			// A folder that goes away (the car's app moved or deleted) only ends its watcher.
			watcher.on('error', () => watcher.close());
			this.watchers.push(watcher);
		} catch {
			// Not there (an app without lib/ yet), nothing to watch.
		}
	}

	private note(path: string): void {
		this.changed.add(path);
		clearTimeout(this.timer);
		this.timer = setTimeout(() => {
			const paths = [...this.changed];
			this.changed.clear();
			this.onChange(paths);
		}, settleMs);
	}
}
