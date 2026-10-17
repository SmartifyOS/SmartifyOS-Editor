<script lang="ts">
	/**
	 * A line of text that is taken once it is done: on Enter or when the field is left, never on
	 * every key. Escape puts back what it said.
	 */
	let {
		value,
		onchange,
		placeholder,
		label,
		class: className = ''
	}: {
		value: string;
		/** Called with the new text once it is done, only when it changed. */
		onchange: (value: string) => void;
		placeholder?: string;
		/** Read out for the field when nothing on screen names it. */
		label?: string;
		class?: string;
	} = $props();

	let draft = $state('');
	$effect.pre(() => {
		draft = value;
	});

	function done() {
		if (draft !== value) onchange(draft);
	}
</script>

<input
	bind:value={draft}
	{placeholder}
	aria-label={label}
	class={[
		'h-8 min-w-0 rounded-control border border-input bg-tint px-2.5 text-[13px] outline-none placeholder:text-faint focus:border-primary/70 focus:ring-2 focus:ring-primary/25',
		className
	]}
	onchange={done}
	onkeydown={(event) => {
		if (event.key === 'Enter') event.currentTarget.blur();
		else if (event.key === 'Escape') {
			draft = value;
			event.currentTarget.blur();
		}
	}}
/>
