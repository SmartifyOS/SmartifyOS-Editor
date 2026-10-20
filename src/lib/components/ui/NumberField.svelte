<script lang="ts">
	/**
	 * A number, taken once it is done like `TextField`: on Enter or when the field is left. The
	 * arrow keys step it (ten steps with Shift) and are taken at once. Empty is null, when
	 * `optional`, and puts back what it said otherwise.
	 */
	let {
		value,
		onchange,
		prefix,
		unit,
		min,
		max,
		step = 1,
		integer = false,
		optional = false,
		placeholder,
		label,
		disabled = false,
		class: className = ''
	}: {
		value: number | null;
		/** Called with the new number once it is done, only when it changed. */
		onchange: (value: number | null) => void;
		/** Written in front of the number, inside the field: `X`. */
		prefix?: string;
		/** Written after the number, inside the field: `m`, `°`. */
		unit?: string;
		min?: number;
		max?: number;
		step?: number;
		integer?: boolean;
		optional?: boolean;
		placeholder?: string;
		/** Read out for the field when nothing on screen names it. */
		label?: string;
		disabled?: boolean;
		class?: string;
	} = $props();

	let draft = $state('');
	$effect.pre(() => {
		draft = shown(value);
	});

	function shown(number: number | null): string {
		return number === null ? '' : String(Number(number.toFixed(4)));
	}

	function clamp(number: number): number {
		let result = integer ? Math.round(number) : number;
		if (min !== undefined) result = Math.max(min, result);
		if (max !== undefined) result = Math.min(max, result);
		return Number(result.toFixed(6));
	}

	function take(next: number | null) {
		draft = shown(next);
		if (next !== value) onchange(next);
	}

	function done() {
		const text = draft.trim().replace(',', '.');
		if (text === '') {
			if (optional) take(null);
			else draft = shown(value);
			return;
		}
		const number = Number(text);
		if (Number.isFinite(number)) take(clamp(number));
		else draft = shown(value);
	}
</script>

<label
	class={[
		'flex h-8 min-w-0 items-center rounded-control border border-input bg-tint text-[13px] focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/25',
		disabled && 'opacity-50',
		className
	]}
>
	{#if prefix}
		<span class="pl-2 text-xs font-medium text-faint">{prefix}</span>
	{/if}
	<input
		bind:value={draft}
		inputmode="decimal"
		{placeholder}
		{disabled}
		aria-label={label}
		class={[
			'h-full w-full min-w-0 bg-transparent px-2.5 tabular-nums outline-none placeholder:text-faint',
			prefix && 'pl-1.5'
		]}
		onchange={done}
		onkeydown={(event) => {
			if (event.key === 'Enter') event.currentTarget.blur();
			else if (event.key === 'Escape') {
				draft = shown(value);
				event.currentTarget.blur();
			} else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
				event.preventDefault();
				const by = (event.shiftKey ? 10 : 1) * step * (event.key === 'ArrowUp' ? 1 : -1);
				take(clamp((value ?? (Number(placeholder) || 0)) + by));
			}
		}}
	/>
	{#if unit}
		<span class="pr-2.5 text-xs text-faint">{unit}</span>
	{/if}
</label>
