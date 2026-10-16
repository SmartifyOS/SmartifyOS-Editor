import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// The window is a single page served by Electron (see electron/main.ts), so there is
			// no server: a static build, routed by the hash.
			adapter: adapter({ pages: 'out/renderer' }),
			router: { type: 'hash' }
		}),
		// Every icon comes from an Iconify set: `import Play from '~icons/lucide/play'`.
		Icons({ compiler: 'svelte' })
	],
	// Electron watches its own files, Vite only needs the window's.
	server: { watch: { ignored: ['**/electron/**', '**/out/**', '**/release/**'] } }
});
