import type { ResultEvent, SettingsPageInfo } from '../../../shared/cli.ts';
import { settingsCommands } from '../commands.ts';
import { builtInPages } from '../settings.ts';
import { editor, type Problem } from './editor.svelte.ts';
import { look } from './look.svelte.ts';

/**
 * The car's own settings pages, as the CLI reads them (`settings list`), and changes to them
 * and their rows, one at a time. After each change the running app is restarted and the page
 * opened in it again, so the preview shows the page as it is being made.
 */
class SettingsPages {
	/** Every page, unknown until the CLI has read them. */
	pages = $state<SettingsPageInfo[] | undefined>();
	/** Whether the dialog that makes a page is open. */
	dialog = $state(false);
	/** Why the last change, or showing a page, did not work. */
	problem = $state<string | undefined>();
	/** Changes still waiting or being written. */
	pending = $state(0);

	private queue: Promise<unknown> = Promise.resolve();

	async read(): Promise<void> {
		const path = editor.project?.path;
		const result = await editor.queryCli(settingsCommands.list());
		if (editor.project?.path !== path) return;
		this.pages = result?.ok ? (result.data as { pages: SettingsPageInfo[] }).pages : [];
	}

	/** The page in this file, if it is still there. */
	find(file: string): SettingsPageInfo | undefined {
		return this.pages?.find((page) => page.file === file);
	}

	/**
	 * Every page a page can go in, except `page` itself: the running app's when it can say
	 * (extensions add pages too), otherwise SmartifyOS's own, and the car's own after them.
	 */
	parents(page?: SettingsPageInfo): { id: string; title: string }[] {
		const own = (this.pages ?? [])
			.filter((known) => known.id && known.id !== page?.id)
			.map((known) => ({ id: known.id as string, title: known.title ?? (known.id as string) }));
		const fromApp = look.app?.settingsPages?.map((known) => ({
			id: known.id,
			title: known.id === 'root' ? 'Settings itself' : known.title
		}));
		const all = fromApp ?? [...builtInPages, ...own];
		const seen = new Set<string>();
		return [...all, ...own].filter((known) => {
			if (known.id === page?.id || seen.has(known.id)) return false;
			seen.add(known.id);
			return true;
		});
	}

	/** Makes a page, picks it in the car panel and opens it in the preview. */
	async create(title: string, parent: string, icon: string): Promise<Problem | undefined> {
		const result = await this.run(settingsCommands.create(title, parent, icon));
		if (!result.ok) return { message: result.error.message, hint: result.error.hint };
		const { page } = result.data as { page: SettingsPageInfo };
		editor.selection = { kind: 'settings', file: page.file };
		return undefined;
	}

	/**
	 * Runs a command that changes a page, after the ones before it, then reads the pages again
	 * and shows `page` in the running app.
	 */
	change(args: string[]): Promise<ResultEvent> {
		return this.run(args);
	}

	/**
	 * Puts a page on screen in the running app. Right after a restart the app is still setting
	 * itself up, and does not know `show` until it has, so it is asked again for a while.
	 */
	async show(page: SettingsPageInfo, { afterRestart = false } = {}): Promise<void> {
		if (!page.id || editor.preview.status !== 'running') return;
		const tries = afterRestart ? 30 : 1;
		let error = '';
		for (let attempt = 0; attempt < tries; attempt++) {
			if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 300));
			const reply = await editor.callApp('show', { kind: 'settings', id: page.id });
			if (reply.ok) {
				this.problem = undefined;
				return;
			}
			error = reply.error;
		}
		// A SmartifyOS from before `show`, the likely reason when it never knew it.
		this.problem = /does not know/.test(error)
			? 'Showing it needs a newer SmartifyOS in your car. Update it in the inspector of your car.'
			: error;
	}

	/** Internal: one change at a time, each followed by reading the pages and a restart. */
	private run(args: string[]): Promise<ResultEvent> {
		this.pending++;
		const step = this.queue.then(async () => {
			const result = await editor.runCli(args);
			await this.read();
			this.problem = result.ok ? undefined : result.error.message;
			const changed = result.ok && (result.data as { changed?: boolean }).changed !== false;
			if (changed && editor.preview.status === 'running') {
				await editor.restart();
				const picked = editor.selection;
				const page = picked.kind === 'settings' ? this.find(picked.file) : undefined;
				if (page) await this.show(page, { afterRestart: true });
			}
			return result;
		});
		this.queue = step.finally(() => this.pending--);
		return step;
	}
}

export const settingsPages = new SettingsPages();
