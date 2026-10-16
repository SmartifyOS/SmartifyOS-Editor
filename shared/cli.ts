/**
 * The CLI's `--json` protocol, as the editor reads it.
 *
 * Mirrors `src/ui/json.ts` in the SmartifyOS CLI repo, which is the source of truth (and its
 * README describes it for users). The protocol only ever grows, so an event or field this
 * file does not know yet is passed along untouched rather than dropped.
 */

/** The protocol version this app was written against. A newer CLI may add to it. */
export const knownProtocol = 1;

export type PromptKind = 'text' | 'password' | 'confirm' | 'select' | 'multiselect';

export interface PromptOption {
	value: unknown;
	label: string;
	hint?: string;
}

export interface PromptEvent {
	type: 'prompt';
	id: string;
	kind: PromptKind;
	message: string;
	options?: PromptOption[];
	initialValue?: unknown;
	placeholder?: string;
}

export type LogLevel =
	'info' | 'warn' | 'error' | 'success' | 'message' | 'step' | 'intro' | 'outro' | 'note';

export interface ErrorPayload {
	kind: 'user' | 'bug' | 'cancelled';
	message: string;
	hint?: string;
	details?: unknown;
	stack?: string;
}

export type CliEvent =
	| { type: 'start'; protocol: number; version: string; sha: string; command: string | null }
	| { type: 'log'; level: LogLevel; text: string; title?: string; data?: unknown }
	| { type: 'text'; text: string }
	| { type: 'step'; id: string; status: 'start' | 'update' | 'done' | 'error'; text: string }
	| PromptEvent
	| { type: 'prompt-invalid'; id: string; message: string }
	| { type: 'output'; stream: 'stdout' | 'stderr'; text: string }
	| { type: 'result'; ok: true; exitCode: number; data: unknown }
	| { type: 'result'; ok: false; exitCode: number; error: ErrorPayload };

export type ResultEvent = Extract<CliEvent, { type: 'result' }>;

/** Whatever `extension list --json` returns as data, the parts the app uses. */
export interface PackageInfo {
	name: string;
	title: string;
	version: string | null;
	commit: string | null;
	label: string;
	linkedTo: string | null;
	source: { kind: string; url?: string; path?: string; ref?: string };
}

export interface CarInfo {
	smartifyOs: PackageInfo;
	extensions: (PackageInfo & { switchedOn: boolean | null })[];
}
