import { mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { Glob } from 'bun';

/**
 * Merges the update files of every build into one per platform, for release.yml:
 *
 *   bun scripts/merge-update-info.ts <downloaded artifacts> <release folder>
 *
 * Every build writes the update file the editor reads to find its updates (electron-updater):
 * latest-mac.yml, latest.yml (Windows), latest-linux.yml and latest-linux-arm64.yml. Each
 * Mac and Windows machine builds one architecture, but both architectures of a platform
 * share one file name, so the two have to become one file listing both downloads. The
 * updater then takes the download whose name has the computer's architecture in it.
 */

interface UpdateFile {
	url: string;
	sha512: string;
	size: number;
	[key: string]: unknown;
}

interface UpdateInfo {
	version: string;
	files: UpdateFile[];
	path?: string;
	sha512?: string;
	releaseDate?: string;
	[key: string]: unknown;
}

const [from, to] = process.argv.slice(2);
if (!from || !to) {
	console.error('Usage: bun scripts/merge-update-info.ts <downloaded artifacts> <release folder>');
	process.exit(1);
}

const byName = new Map<string, UpdateInfo[]>();
for await (const file of new Glob('**/latest*.yml').scan({ cwd: from })) {
	const info = Bun.YAML.parse(await Bun.file(join(from, file)).text()) as UpdateInfo;
	const name = basename(file);
	byName.set(name, [...(byName.get(name) ?? []), info]);
}
if (byName.size === 0) {
	console.error(`No update files (latest*.yml) in ${from}.`);
	process.exit(1);
}

mkdirSync(to, { recursive: true });
for (const [name, infos] of byName) {
	const versions = new Set(infos.map((info) => info.version));
	if (versions.size > 1) {
		console.error(`${name} comes in different versions: ${[...versions].join(', ')}.`);
		process.exit(1);
	}

	const files: UpdateFile[] = [];
	for (const info of infos) {
		for (const file of info.files) {
			if (!files.some((known) => known.url === file.url)) files.push(file);
		}
	}
	// The old single-file fields point at the x64 download, which every updater can use.
	const main = files.find((file) => !file.url.includes('arm64')) ?? files[0];
	const releaseDate = infos
		.map((info) => info.releaseDate)
		.filter(Boolean)
		.sort()
		.at(-1);
	const merged: UpdateInfo = {
		...infos[0],
		version: infos[0]?.version ?? '',
		files,
		path: main?.url,
		sha512: main?.sha512,
		releaseDate
	};
	await Bun.write(join(to, name), Bun.YAML.stringify(merged, null, 2));
	console.log(`${name}: ${files.map((file) => file.url).join(', ')}`);
}
