import type { CatalogExtension } from '../shared/api.ts';
import bundled from './catalog/extensions.json';

/**
 * The extensions the editor recommends, which the add extension dialog lets people browse.
 *
 * For now the list ships with the editor, in catalog/extensions.json, and grows with its
 * updates. Once it lives on a server (where people can send in their own), this fetches it
 * from there and keeps the bundled list as what to show offline. Every entry has a title, a
 * short description and the GitHub address `extension add` takes.
 */
export function catalogExtensions(): CatalogExtension[] {
	return bundled.extensions;
}
