// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import 'unplugin-icons/types/svelte';
import type { SmartifyApi } from '../shared/api.ts';

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface Window {
		/** The editor's API, put there by electron/preload.ts. */
		smartify: SmartifyApi;
	}
}

export {};
