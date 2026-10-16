import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { editor } from './state/editor.svelte.ts';

/**
 * Marks an element as covering the viewport, like a dialog or a menu. The running app's
 * window is a real window above the page, so it is hidden while anything like that is open.
 */
export const coversViewport: Attachment = () => {
	// Untracked, or the attachment would depend on the count it changes and run again.
	untrack(() => (editor.overlays += 1));
	return () => {
		untrack(() => (editor.overlays -= 1));
	};
};

/** Calls `onOutside` when a click lands outside the element, for menus. */
export function clickOutside(onOutside: () => void): Attachment<HTMLElement> {
	return (element) => {
		const handler = (event: PointerEvent) => {
			if (!element.contains(event.target as Node)) onOutside();
		};
		// On the next tick, so the click that opened the menu does not close it again.
		const timer = setTimeout(() => window.addEventListener('pointerdown', handler, true));
		return () => {
			clearTimeout(timer);
			window.removeEventListener('pointerdown', handler, true);
		};
	};
}
