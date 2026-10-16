<script lang="ts">
	/** An on and off setting. `label` is what a screen reader says, the row shows it already. */
	let {
		checked = $bindable(),
		label,
		disabled = false,
		onchange
	}: {
		checked: boolean;
		label: string;
		disabled?: boolean;
		onchange?: (checked: boolean) => void;
	} = $props();

	function toggle() {
		checked = !checked;
		onchange?.(checked);
	}
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={label}
	{disabled}
	class={[
		'relative inline-flex h-5 w-9 shrink-0 cursor-default items-center rounded-full border transition-colors duration-150 outline-none no-drag focus-visible:ring-2 focus-visible:ring-primary/70 disabled:opacity-50',
		checked ? 'border-primary bg-primary' : 'border-input bg-hover'
	]}
	onclick={toggle}
>
	<span
		class={[
			'block size-3.5 rounded-full bg-white shadow-xs transition-transform duration-150',
			checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
		]}
	></span>
</button>
