/**
 * Names and doc comments from code, the way the inspector says them: for an extension's settings,
 * which only have what its code calls them.
 */

/** Words said in capitals, the way they are written. */
const capitals: Record<string, string> = {
	ai: 'AI',
	id: 'ID',
	ids: 'IDs',
	url: 'URL',
	usb: 'USB',
	gps: 'GPS',
	can: 'CAN',
	wifi: 'Wi-Fi',
	ui: 'UI',
	api: 'API',
	mb: 'MB'
};

/** A name in code as words: `wakeWordSpellings` is "Wake word spellings". */
export function codeWords(name: string): string {
	const said = name
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
		.replace(/_/g, ' ')
		.toLowerCase()
		.split(' ')
		.map((word) => capitals[word] ?? word)
		.join(' ');
	return said.charAt(0).toUpperCase() + said.slice(1);
}

/** A doc comment as plain text, its code in backticks said like the rest. */
export function plainDoc(doc: string | undefined): string | undefined {
	return doc?.replaceAll('`', '') || undefined;
}

/** The first sentence of a text, for a line under a name. */
export function firstSentence(text: string): string {
	return /^[\s\S]+?[.!?](?=\s|$)/.exec(text)?.[0] ?? text;
}
