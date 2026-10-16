/**
 * A value kept in localStorage, for small things the window remembers for itself, like panel
 * sizes. Storage can be missing or refuse, in which case it is simply not remembered.
 */
export function remembered<T>(key: string, initial: T): { value: T } {
	const storageKey = `smartify-os:${key}`;
	let value = $state<T>(initial);
	try {
		const stored = localStorage.getItem(storageKey);
		if (stored !== null) value = JSON.parse(stored) as T;
	} catch {
		// Not remembered then.
	}
	return {
		get value() {
			return value;
		},
		set value(next: T) {
			value = next;
			try {
				localStorage.setItem(storageKey, JSON.stringify(next));
			} catch {
				// Not remembered then.
			}
		}
	};
}
