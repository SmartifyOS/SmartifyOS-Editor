<script lang="ts">
	/**
	 * The hairline between two areas, which can be dragged. Dragging it changes `size`, the
	 * size of the area on the side named by `edge`, within `min` and `max`.
	 */
	let {
		size = $bindable(),
		edge,
		min,
		max
	}: {
		size: number;
		/** Which area `size` is: the one to the left, right or below the line. */
		edge: 'left' | 'right' | 'bottom';
		min: number;
		max: number;
	} = $props();

	const vertical = $derived(edge === 'bottom');
	let dragging = $state(false);

	function start(event: PointerEvent) {
		const handle = event.currentTarget as HTMLElement;
		handle.setPointerCapture(event.pointerId);
		dragging = true;
		const from = vertical ? event.clientY : event.clientX;
		const initial = size;
		const direction = edge === 'left' ? 1 : -1;

		const move = (e: PointerEvent) => {
			const delta = (vertical ? e.clientY : e.clientX) - from;
			size = Math.min(max, Math.max(min, initial + delta * direction));
		};
		const end = () => {
			dragging = false;
			handle.removeEventListener('pointermove', move);
			handle.removeEventListener('pointerup', end);
			handle.removeEventListener('pointercancel', end);
		};
		handle.addEventListener('pointermove', move);
		handle.addEventListener('pointerup', end);
		handle.addEventListener('pointercancel', end);
	}
</script>

<div
	role="separator"
	aria-orientation={vertical ? 'horizontal' : 'vertical'}
	class={['group relative z-10 shrink-0 bg-line', vertical ? 'h-px' : 'w-px']}
>
	<!-- A wider, invisible grip around the hairline. Mouse only, like every splitter. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class={[
			'absolute',
			vertical
				? 'inset-x-0 -inset-y-1.5 cursor-row-resize'
				: '-inset-x-1.5 inset-y-0 cursor-col-resize'
		]}
		onpointerdown={start}
	></div>
	<div
		class={[
			'pointer-events-none absolute transition-colors delay-75 group-hover:bg-primary/70',
			dragging && 'bg-primary',
			vertical ? 'inset-x-0 -inset-y-px' : '-inset-x-px inset-y-0'
		]}
	></div>
</div>
