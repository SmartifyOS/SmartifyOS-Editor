import type { Part, PartKind, PartVariant } from '../../../shared/cli.ts';
import { partCommands } from '../commands.ts';
import { partKinds } from '../parts.ts';
import { editor, type Problem } from './editor.svelte.ts';

/**
 * The windows, quick settings tiles and home screen widgets of the open car's app, as the CLI
 * reads them from their files (`window list` and the others). Making, renaming and removing
 * one is the CLI's too; the running app is restarted afterwards so it shows the change.
 */
class Parts {
	/** Every one of each kind, unknown until the CLI has read them. */
	lists = $state<Record<PartKind, Part[]> | undefined>();
	/** The kind the dialog that makes one is open for. */
	dialog = $state<PartKind | undefined>();
	/** Changes still being written. */
	busy = $state(0);

	/** Reads them all again. */
	async read(): Promise<void> {
		const path = editor.project?.path;
		const results = await Promise.all(
			partKinds.map((kind) => editor.queryCli(partCommands.list(kind)))
		);
		if (editor.project?.path !== path) return;
		const lists = { window: [], tile: [], widget: [] } as Record<PartKind, Part[]>;
		partKinds.forEach((kind, index) => {
			const result = results[index];
			if (result?.ok) lists[kind] = (result.data as { parts: Part[] }).parts;
		});
		this.lists = lists;
	}

	/** The one in this file, if it is still there. */
	find(kind: PartKind, file: string): Part | undefined {
		return this.lists?.[kind].find((part) => part.file === file);
	}

	/**
	 * Makes one, picks it in the car panel and opens it in VS Code where what it shows or does is
	 * written. Resolves with why it could not be made.
	 */
	async create(
		kind: PartKind,
		name: string,
		variant: PartVariant,
		icon: string
	): Promise<Problem | undefined> {
		const result = await this.run(partCommands.create(kind, name, variant, icon));
		if (!result.ok) return { message: result.error.message, hint: result.error.hint };
		const { part } = result.data as { part: Part };
		editor.selection = { kind: 'part', part: kind, file: part.file };
		void editor.openInVsCode(undefined, part.file, part.line);
		return undefined;
	}

	/** Renames one or gives it another icon. Resolves with why it could not be. */
	async edit(part: Part, change: { name?: string; icon?: string }): Promise<string | undefined> {
		const result = await this.run(partCommands.edit(part, change));
		return result.ok ? undefined : result.error.message;
	}

	/** Takes one out of the app, once the CLI has asked whether to. */
	async remove(part: Part): Promise<void> {
		const result = await this.run(partCommands.remove(part));
		if (result.ok && (result.data as { changed: boolean }).changed) {
			editor.selection = { kind: 'car' };
		}
	}

	/** Why the last one could not be put on screen, by its file, until it can. */
	showProblem = $state<{ file: string; message: string } | undefined>();

	/** Puts one on screen in the running app, the way the driver would find it. */
	async show(part: Part): Promise<void> {
		if (!part.id) return;
		const reply = await editor.callApp('show', { kind: part.kind, id: part.id });
		this.showProblem = reply.ok
			? undefined
			: {
					file: part.file,
					// A SmartifyOS from before `show`, the likely reason.
					message: /does not know/.test(reply.error)
						? 'Showing it needs a newer SmartifyOS in your car. Update it in the inspector of your car.'
						: reply.error
				};
	}

	/** Internal: runs a command that changes them, then reads them and restarts the app. */
	private async run(args: string[]) {
		this.busy++;
		try {
			const result = await editor.runCli(args);
			await this.read();
			if (result.ok && (result.data as { changed?: boolean }).changed !== false) {
				// New code in the app, which only a restart runs.
				editor.restart();
			}
			return result;
		} finally {
			this.busy--;
		}
	}
}

export const parts = new Parts();
