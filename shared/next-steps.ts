import type { NextStep } from './cli.ts';

/**
 * What to do next after a command, said the editor's way, in the task dialog and the
 * console. The CLI says it with the commands to type, which nobody types here, so each kind
 * of step it knows gets its own words. A kind that is not in here is said the CLI's way, so
 * a new one is never lost, and `null` leaves a step out that means nothing in the editor.
 */
const wording: Record<string, ((step: NextStep) => string) | null> = {
	'add-messages': () =>
		"Give it the messages it sends, in your car's app. DEVICES.md in the SmartifyOS repository shows how.",
	run: () => 'Press Run once, so SmartifyOS writes the messages of your CAN bus out for it.',
	'write-program': () => 'Write its program: pick Open its program in VS Code, on the right.',
	flash: () => 'Plug its board into this computer with a USB cable, and pick Put it on its board.',
	'read-serial': (step) =>
		`Read what it prints in your car's app, in ${step.path ?? 'lib/serial.dart'}. DEVICES.md in the SmartifyOS repository shows how.`,
	'edit-main': (step) => `Everything about your car is in ${step.path ?? 'lib/main.dart'}.`,
	'add-extension': () => 'Add extensions with Add an extension, on the left.',
	'export-installer': () => 'Export an installer to put it on your car.',
	create: () => "Create your car's app on the start screen, or open one you have.",
	// Opening a folder in a terminal.
	'open-folder': null
};

/** The steps of a note, in the editor's words, or undefined when the note has none. */
export function nextSteps(data: unknown): string[] | undefined {
	const steps = (data as { steps?: unknown } | null | undefined)?.steps;
	if (!Array.isArray(steps)) return undefined;
	return (steps as NextStep[]).flatMap((step) => {
		const say = wording[step.kind];
		if (say === null) return [];
		return [say ? say(step) : step.text];
	});
}
