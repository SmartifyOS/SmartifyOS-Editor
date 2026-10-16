/** Shortcuts, written the way this system writes them: ⌘P on macOS, Ctrl+P elsewhere. */

const mac = typeof window !== 'undefined' && window.smartify?.platform === 'darwin';

export function shortcut(key: string, options: { shift?: boolean } = {}): string {
	if (mac) return `${options.shift ? '⇧' : ''}⌘${key}`;
	return `Ctrl+${options.shift ? 'Shift+' : ''}${key}`;
}

/** Whether a key press holds this system's command key (⌘ or Ctrl) and nothing odd. */
export function isCommand(event: KeyboardEvent): boolean {
	return (mac ? event.metaKey : event.ctrlKey) && !event.altKey;
}
