/**
 * Every icon in Flutter's `Icons`, which is what the car's app shows, by its name there
 * (`local_gas_station`). They are drawn from Google's Material Icons as Iconify has them (the
 * `ic` set, the one Flutter's are made from), loaded the first time one is needed, since the
 * whole set is a few megabytes.
 *
 * Only the filled ones are offered (`Icons.speed`, not `Icons.speed_outlined`), and none whose
 * name starts with a digit, which Flutter spells out its own way (`Icons.ten_k`). The outlined,
 * rounded and sharp ones still draw when an app uses them.
 */

/** Words Dart keeps for itself, which Flutter ends with an underscore (`Icons.class_`). */
const reserved = new Set(['class', 'switch', 'try', 'new', 'default', 'do', 'for', 'in', 'is']);

/** The variants Flutter names with a suffix and Iconify with a prefix. */
const variants: [suffix: string, prefix: string][] = [
	['_outlined', 'outline'],
	['_rounded', 'round'],
	['_sharp', 'sharp']
];

/** One icon to pick. */
export interface MaterialIcon {
	/** Its name in Flutter's `Icons`. */
	name: string;
	/** Its name in words, `Local gas station`. */
	label: string;
}

/** Internal: Iconify's name for one of Flutter's, `baseline-local-gas-station`. */
function iconifyName(name: string): string {
	let rest = name.replace(/_$/, '');
	let prefix = 'baseline';
	for (const [suffix, variant] of variants) {
		if (rest.endsWith(suffix)) {
			rest = rest.slice(0, -suffix.length);
			prefix = variant;
		}
	}
	return `${prefix}-${rest.replace(/_/g, '-')}`;
}

class MaterialIcons {
	/** Every icon there is to pick, in order of name, empty until loaded. */
	all = $state.raw<MaterialIcon[]>([]);
	/** What each icon draws, by Iconify's name. */
	private bodies = $state.raw<Record<string, { body: string }> | undefined>();
	private loading: Promise<void> | undefined;

	/** Loads them, once. */
	load(): Promise<void> {
		this.loading ??= import('@iconify-json/ic/icons.json').then((set) => {
			const icons = (set.default ?? set).icons as Record<string, { body: string }>;
			this.bodies = icons;
			this.all = Object.keys(icons)
				.filter((key) => key.startsWith('baseline-') && !/^\d/.test(key.slice(9)))
				.map((key) => {
					const words = key.slice(9).replace(/-/g, '_');
					const name = reserved.has(words) ? `${words}_` : words;
					const label = words.replace(/_/g, ' ');
					return { name, label: label.charAt(0).toUpperCase() + label.slice(1) };
				})
				.sort((a, b) => a.name.localeCompare(b.name));
		});
		return this.loading;
	}

	/** The SVG inside a 24 by 24 box for one of Flutter's icons, undefined until loaded or unknown. */
	body(name: string): string | undefined {
		return this.bodies?.[iconifyName(name)]?.body;
	}

	/** The icons whose name has every word of `query` in it, the start of a word counting too. */
	search(query: string): MaterialIcon[] {
		const words = query
			.toLowerCase()
			.split(/[\s_-]+/)
			.filter(Boolean);
		if (words.length === 0) return this.all;
		return this.all.filter((icon) => {
			const own = icon.name.split('_');
			return words.every((word) => own.some((part) => part.startsWith(word)));
		});
	}
}

export const materialIcons = new MaterialIcons();
