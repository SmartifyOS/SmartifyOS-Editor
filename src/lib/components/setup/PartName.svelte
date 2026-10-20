<script lang="ts">
	import Select from '../ui/Select.svelte';
	import TextField from '../ui/TextField.svelte';

	/**
	 * The name of a part of the car's model or drawing, picked from the names it has, or typed
	 * when they cannot be read. A name that is not in it any more stays offered, and says so.
	 */
	let {
		value,
		names,
		label,
		onchange,
		class: className = ''
	}: {
		value: string;
		names: string[];
		label: string;
		onchange: (name: string) => void;
		class?: string;
	} = $props();

	const options = $derived([
		...(value && !names.includes(value) ? [{ value, label: `${value} (not in it)` }] : []),
		...names.map((name) => ({ value: name, label: name }))
	]);
</script>

{#if names.length > 0}
	<Select
		class={className}
		title={label}
		{options}
		bind:value={() => value, (name) => onchange(name)}
	/>
{:else}
	<TextField
		class={className}
		{value}
		{label}
		onchange={(name) => {
			if (name.trim()) onchange(name.trim());
		}}
	/>
{/if}
