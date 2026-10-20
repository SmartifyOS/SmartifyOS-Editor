<script lang="ts">
	/**
	 * A colour as `#AARRGGBB`, picked with the system's colour picker or typed as hex. The picker
	 * has no see-through, so whatever the colour had is kept.
	 */
	let {
		value,
		onchange,
		label,
		disabled = false,
		class: className = ''
	}: {
		value: string;
		onchange: (value: string) => void;
		label: string;
		disabled?: boolean;
		class?: string;
	} = $props();

	const alpha = $derived(value.length === 9 ? value.slice(1, 3) : 'FF');
	const rgb = $derived(`#${value.slice(-6)}`);

	let draft = $state('');
	$effect.pre(() => {
		draft = rgb.toUpperCase();
	});

	function take(hex: string) {
		const next = `#${alpha}${hex.replace('#', '')}`.toUpperCase();
		if (next !== value.toUpperCase()) onchange(next);
	}
</script>

<div
	class={[
		'flex h-8 min-w-0 items-center gap-2 rounded-control border border-input bg-tint pr-2.5 pl-1 text-[13px] focus-within:border-primary/70',
		disabled && 'opacity-50',
		className
	]}
>
	<input
		type="color"
		value={rgb}
		{disabled}
		aria-label={label}
		class="color size-6 shrink-0 cursor-default rounded-[5px] border-0 bg-transparent p-0"
		onchange={(event) => take(event.currentTarget.value)}
	/>
	<input
		bind:value={draft}
		{disabled}
		aria-label={`${label} as hex`}
		class="w-full min-w-0 bg-transparent font-mono text-xs uppercase outline-none"
		onchange={() => {
			const hex = /^#?([0-9a-f]{6})$/i.exec(draft.trim())?.[1];
			if (hex) take(hex);
			else draft = rgb.toUpperCase();
		}}
		onkeydown={(event) => {
			if (event.key === 'Enter') event.currentTarget.blur();
		}}
	/>
</div>

<style>
	.color::-webkit-color-swatch-wrapper {
		padding: 0;
	}
	.color::-webkit-color-swatch {
		border: 1px solid rgb(255 255 255 / 0.12);
		border-radius: 5px;
	}
</style>
