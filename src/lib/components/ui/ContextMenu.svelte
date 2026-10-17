<script lang="ts" module>
	import type { Component } from 'svelte';

	/** One line of a context menu, or a hairline between groups of them. */
	export type MenuItem =
		| { icon: Component; label: string; run: () => void; disabled?: boolean; danger?: boolean }
		| 'separator';
</script>

<script lang="ts">
	import { clickOutside, coversViewport } from '#lib/attachments.ts';

	/**
	 * The menu a right click opens, at the pointer. It stays inside the window, opening up or to
	 * the left where there is no room, and closes on a click anywhere else or Escape.
	 */
	let { x, y, items, onclose }: { x: number; y: number; items: MenuItem[]; onclose: () => void } =
		$props();

	let menu = $state<HTMLElement>();

	const position = $derived.by(() => {
		if (!menu) return { left: x, top: y };
		const margin = 8;
		const { offsetWidth: width, offsetHeight: height } = menu;
		return {
			left: x + width + margin > window.innerWidth ? Math.max(margin, x - width) : x,
			top: y + height + margin > window.innerHeight ? Math.max(margin, y - height) : y
		};
	});

	function buttons(): HTMLButtonElement[] {
		return [...(menu?.querySelectorAll<HTMLButtonElement>('button:enabled') ?? [])];
	}

	// Focused, so the arrow keys go through it at once.
	$effect(() => {
		menu?.focus();
	});

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			onclose();
		} else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			const all = buttons();
			const at = all.indexOf(document.activeElement as HTMLButtonElement);
			const step = event.key === 'ArrowDown' ? 1 : -1;
			all[(at + step + all.length) % all.length]?.focus();
		}
	}

	function pick(run: () => void) {
		onclose();
		run();
	}
</script>

<svelte:window onblur={onclose} onresize={onclose} />

<div
	bind:this={menu}
	{@attach coversViewport}
	{@attach clickOutside(onclose)}
	role="menu"
	tabindex="-1"
	class="fixed z-50 flex w-max max-w-[20rem] min-w-[13rem] flex-col rounded-xl p-1 shadow-float glass outline-none no-drag"
	style:left="{position.left}px"
	style:top="{position.top}px"
	onkeydown={onKey}
	oncontextmenu={(event) => event.preventDefault()}
>
	{#each items as item, index (index)}
		{#if item === 'separator'}
			<div class="mx-1 my-1 h-px bg-line"></div>
		{:else}
			<button
				type="button"
				role="menuitem"
				disabled={item.disabled}
				class={[
					'flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] outline-none hover:bg-hover focus-visible:bg-hover disabled:opacity-40 disabled:hover:bg-transparent',
					item.danger && 'text-bad'
				]}
				onclick={() => pick(item.run)}
			>
				<item.icon class={['size-4 shrink-0', item.danger ? 'text-bad' : 'text-muted']} />
				<span class="truncate">{item.label}</span>
			</button>
		{/if}
	{/each}
</div>
