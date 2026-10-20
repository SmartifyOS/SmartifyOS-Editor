<script lang="ts">
	import Select from '../ui/Select.svelte';
	import AddField from '../ui/AddField.svelte';

	/**
	 * Adds a part to a list by its name: picked from the names the model or drawing has, the
	 * ones in the list already left out, or typed when they cannot be read.
	 */
	let {
		names,
		used,
		label,
		disabled = false,
		onadd
	}: {
		names: string[];
		used: string[];
		/** What adding is, like `Add a wheel`. */
		label: string;
		disabled?: boolean;
		onadd: (name: string) => void;
	} = $props();

	const free = $derived(names.filter((name) => !used.includes(name)));
	/** Made anew after each add, so it says what it said before again. */
	let added = $state(0);

	function add(name: string) {
		if (!name.trim()) return;
		onadd(name.trim());
		added++;
	}
</script>

{#key added}
	{#if names.length > 0}
		{#if free.length > 0 && !disabled}
			<Select
				class="w-full text-muted"
				options={[
					{ value: '', label: `${label}…` },
					...free.map((name) => ({ value: name, label: name }))
				]}
				bind:value={() => '', add}
			/>
		{/if}
	{:else if !disabled}
		<AddField placeholder="Its name in the file" {label} onadd={add} />
	{/if}
{/key}
