import { rmSync } from 'node:fs';
import { build } from 'esbuild';
import { electronBuild } from './electron-build.ts';

/** Builds everything the packaged app runs: the window into out/renderer, Electron into out/main. */

rmSync('out', { recursive: true, force: true });

const vite = Bun.spawn(['bunx', '--bun', 'vite', 'build'], {
	stdout: 'inherit',
	stderr: 'inherit'
});
if ((await vite.exited) !== 0) process.exit(1);

await build({ ...electronBuild, minify: true });
