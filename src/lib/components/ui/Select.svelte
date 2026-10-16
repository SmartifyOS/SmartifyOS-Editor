<script lang="ts">
	import ChevronsUpDown from '~icons/lucide/chevrons-up-down';

	/**
	 * A choice of a few options, drawn like an outline button. The list itself is the
	 * system's own menu, which is a real window and so shows above the running app too.
	 */
	let {
		value = $bindable(),
		options,
		title,
		class: className = ''
	}: {
		value: string;
		options: readonly { value: string; label: string }[];
		title?: string;
		class?: string;
	} = $props();
</script>

<label
	{title}
	class={[
		'relative inline-flex h-8 items-center rounded-control border border-input bg-tint text-[13px] font-medium inset-shadow-[0_1px_rgb(255_255_255/0.05)] no-drag hover:bg-hover',
		className
	]}
>
	<select
		bind:value
		class="h-full cursor-default appearance-none bg-transparent pr-8 pl-2.5 text-fg outline-none"
	>
		{#each options as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
	<ChevronsUpDown class="pointer-events-none absolute right-2.5 size-3.5 text-muted" />
</label>
