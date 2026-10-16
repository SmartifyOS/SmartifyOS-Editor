import { join } from 'node:path';
import { Glob } from 'bun';

/**
 * Guards the writing style rule from CLAUDE.md: no em dashes and no en dashes, anywhere,
 * UI strings included. No linter checks prose, so it is checked here. The characters are
 * built from their code points so that this file does not trip its own check.
 */

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

const root = join(import.meta.dir, '..');
const patterns = [
	'**/*.ts',
	'**/*.svelte',
	'**/*.css',
	'**/*.html',
	'**/*.md',
	'**/*.json',
	'**/*.yml'
];
const ignored = ['node_modules/', 'out/', 'release/', '.svelte-kit/', '.git/', 'bun.lock'];
/** Only files that have to name the characters to do their job. */
const exempt = ['CLAUDE.md', 'scripts/check-dashes.ts'];

const offenders: string[] = [];
for (const pattern of patterns) {
	for await (const file of new Glob(pattern).scan({ cwd: root, dot: true })) {
		if (ignored.some((skip) => file.startsWith(skip) || file.includes(`/${skip}`))) continue;
		if (exempt.includes(file)) continue;
		const lines = (await Bun.file(join(root, file)).text()).split('\n');
		lines.forEach((line, index) => {
			if (line.includes(EM_DASH) || line.includes(EN_DASH)) {
				offenders.push(`${file}:${index + 1}: ${line.trim()}`);
			}
		});
	}
}

if (offenders.length > 0) {
	console.error(`Em or en dashes found, use a comma, parentheses or a new sentence:\n`);
	console.error(offenders.join('\n'));
	process.exit(1);
}
