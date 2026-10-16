import type { BuildOptions } from 'esbuild';

/**
 * How the main process and the preload script are bundled, shared by `dev.ts` and `build.ts`.
 * Both come out as CommonJS: a sandboxed preload has to be, and koffi loads its native
 * module with `require`.
 */
export const electronBuild: BuildOptions = {
	entryPoints: { main: 'electron/main.ts', preload: 'electron/preload.ts' },
	outdir: 'out/main',
	outExtension: { '.js': '.cjs' },
	bundle: true,
	platform: 'node',
	format: 'cjs',
	target: 'node24',
	sourcemap: 'linked',
	// Electron is the runtime itself, koffi has to stay in node_modules with its binary, and
	// electron-updater reads files of its own next to it.
	external: ['electron', 'koffi', 'electron-updater'],
	logLevel: 'info'
};
