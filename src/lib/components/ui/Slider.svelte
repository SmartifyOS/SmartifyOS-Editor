<script lang="ts">
	/**
	 * A number picked by dragging, taken once the slider is let go. While it is dragged,
	 * `oninput` hears every value, for showing it next to the slider.
	 */
	let {
		value,
		min,
		max,
		step = 0.01,
		label,
		disabled = false,
		oninput,
		onchange,
		class: className = ''
	}: {
		value: number;
		min: number;
		max: number;
		step?: number;
		label: string;
		disabled?: boolean;
		oninput?: (value: number) => void;
		onchange: (value: number) => void;
		class?: string;
	} = $props();

	const filled = $derived(`${Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))}%`);
</script>

<input
	type="range"
	{min}
	{max}
	{step}
	{value}
	{disabled}
	aria-label={label}
	style:--filled={filled}
	class={[
		'slider h-8 min-w-0 cursor-default appearance-none bg-transparent outline-none no-drag disabled:opacity-50',
		className
	]}
	oninput={(event) => oninput?.(Number(event.currentTarget.value))}
	onchange={(event) => onchange(Number(event.currentTarget.value))}
/>

<style>
	.slider::-webkit-slider-runnable-track {
		height: 4px;
		border-radius: 999px;
		background: linear-gradient(
			to right,
			var(--color-primary) var(--filled),
			rgb(255 255 255 / 0.1) var(--filled)
		);
	}
	.slider::-webkit-slider-thumb {
		appearance: none;
		margin-top: -6px;
		width: 16px;
		height: 16px;
		border-radius: 999px;
		background: white;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.5);
		transition: scale 100ms;
	}
	.slider:active::-webkit-slider-thumb {
		scale: 1.12;
	}
	.slider:focus-visible::-webkit-slider-thumb {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
</style>
