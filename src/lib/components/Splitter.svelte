<script lang="ts">
	/**
	 * The handle between two panels. Dragging it changes `size`, the size of the panel on the
	 * side named by `edge`, within `min` and `max`.
	 */
	let {
		size = $bindable(),
		edge,
		min,
		max
	}: {
		size: number;
		/** Which panel `size` is: the one to the left, right or below the handle. */
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
	class={[
		'group relative z-10 shrink-0',
		vertical ? '-my-1 h-2 cursor-row-resize' : '-mx-1 w-2 cursor-col-resize'
	]}
	onpointerdown={start}
>
	<div
		class={[
			'absolute transition-colors group-hover:bg-accent/60',
			dragging && 'bg-accent',
			vertical
				? 'inset-x-0 top-1/2 h-px -translate-y-1/2'
				: 'inset-y-0 left-1/2 w-px -translate-x-1/2'
		]}
	></div>
</div>
