<script lang="ts">
	import Plus from '~icons/lucide/plus';
	import Button from './Button.svelte';

	/**
	 * A line of text that adds something, like a name to a list: with Enter, or the Add button
	 * next to it. Empty again afterwards, ready for the next one. Leaving the field adds nothing.
	 */
	let {
		placeholder,
		label,
		disabled = false,
		onadd,
		class: className = ''
	}: {
		placeholder: string;
		/** Read out for the field and its button. */
		label: string;
		disabled?: boolean;
		/** Called with the text, trimmed, when there is some. */
		onadd: (text: string) => void;
		class?: string;
	} = $props();

	let draft = $state('');
	const empty = $derived(draft.trim() === '');

	function add() {
		if (empty || disabled) return;
		onadd(draft.trim());
		draft = '';
	}
</script>

<div class={['flex min-w-0 items-center gap-1.5', className]}>
	<input
		bind:value={draft}
		{placeholder}
		aria-label={label}
		{disabled}
		class="h-8 min-w-0 flex-1 rounded-control border border-input bg-tint px-2.5 text-[13px] outline-none placeholder:text-faint focus:border-primary/70 focus:ring-2 focus:ring-primary/25 disabled:opacity-50"
		onkeydown={(event) => {
			if (event.key === 'Enter') add();
			else if (event.key === 'Escape') {
				draft = '';
				event.currentTarget.blur();
			}
		}}
	/>
	<Button size="sm" disabled={empty || disabled} {label} onclick={add}>
		<Plus /> Add
	</Button>
</div>
