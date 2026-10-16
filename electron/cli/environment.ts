import { execFile } from 'node:child_process';
import { delimiter, join } from 'node:path';
import { homedir } from 'node:os';

/**
 * The environment the CLI and Flutter run in.
 *
 * An app started from the Dock, Finder or a desktop launcher does not get the PATH the
 * user's terminal has, so `flutter` (and on macOS even the CLI) would not be found. On macOS
 * and Linux the login shell is asked once for its PATH, the same way VS Code does it.
 */

let shellPath: Promise<string | undefined> | undefined;

/** Internal: the PATH an interactive login shell has, or undefined when it cannot be told. */
function readShellPath(): Promise<string | undefined> {
	if (process.platform === 'win32') return Promise.resolve(undefined);
	const shell = process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');
	const marker = '__SMARTIFY_OS_PATH__';
	return new Promise((resolve) => {
		execFile(
			shell,
			['-ilc', `printf '${marker}%s${marker}' "$PATH"`],
			{ timeout: 5000, env: { ...process.env, DISABLE_AUTO_UPDATE: 'true' } },
			(_error, stdout) => {
				// Shell startup files can print anything, the markers find the part that counts.
				const match = new RegExp(`${marker}(.*)${marker}`).exec(stdout ?? '');
				resolve(match?.[1] || undefined);
			}
		);
	});
}

/** The folder the CLI's installer puts it in. */
export function cliInstallDir(): string {
	return process.env.SMARTIFY_OS_INSTALL_DIR || join(homedir(), '.smartify-os', 'bin');
}

/** PATH with the login shell's entries and the CLI's install folder added, nothing twice. */
export async function fullPath(): Promise<string> {
	shellPath ??= readShellPath();
	const parts = [
		cliInstallDir(),
		...((await shellPath)?.split(delimiter) ?? []),
		...(process.env.PATH?.split(delimiter) ?? [])
	];
	return [...new Set(parts.filter(Boolean))].join(delimiter);
}

/** The environment every CLI job runs with. */
export async function cliEnv(extra: Record<string, string> = {}): Promise<NodeJS.ProcessEnv> {
	return {
		...process.env,
		PATH: await fullPath(),
		// The CLI only checks for updates in a terminal anyway, this keeps it certain.
		SMARTIFY_OS_NO_UPDATE_CHECK: '1',
		NO_COLOR: '1',
		...extra
	};
}
