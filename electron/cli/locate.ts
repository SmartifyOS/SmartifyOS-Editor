import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import type { CliStatus } from '../../shared/api.ts';
import { cliEnv, cliInstallDir, fullPath } from './environment.ts';
import { runCli } from './job.ts';

const binary = process.platform === 'win32' ? 'smartify-os.exe' : 'smartify-os';

/**
 * Where the CLI is: `SMARTIFY_OS_CLI` when set (for working on both at once), then the
 * installer's folder, then PATH.
 */
export async function findCli(): Promise<string | undefined> {
	const override = process.env.SMARTIFY_OS_CLI;
	if (override) return existsSync(override) ? override : undefined;

	const installed = join(cliInstallDir(), binary);
	if (existsSync(installed)) return installed;

	const names = process.platform === 'win32' ? [binary, 'smartify-os.cmd'] : [binary];
	for (const dir of (await fullPath()).split(delimiter)) {
		for (const name of names) {
			const candidate = join(dir, name);
			if (existsSync(candidate)) return candidate;
		}
	}
	return undefined;
}

let cached: Promise<CliStatus> | undefined;

/** Finds the CLI and asks it which version it is. Remembered until `refresh` is passed. */
export function cliStatus(refresh = false): Promise<CliStatus> {
	if (refresh || !cached) cached = readStatus();
	return cached;
}

async function readStatus(): Promise<CliStatus> {
	const path = await findCli();
	if (!path) {
		return {
			found: false,
			reason: 'The SmartifyOS CLI is not installed on this computer.'
		};
	}
	try {
		const result = await runCli(path, ['--version'], { env: await cliEnv() });
		if (result.ok) {
			const data = result.data as { version: string; sha: string };
			return { found: true, path, version: data.version, sha: data.sha };
		}
		return { found: false, reason: result.error.message };
	} catch (error) {
		return { found: false, reason: `The CLI at ${path} could not be started: ${String(error)}` };
	}
}
