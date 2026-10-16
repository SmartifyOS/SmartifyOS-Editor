<script lang="ts" module>
	export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'ghost-muted';
	export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

	const variants: Record<ButtonVariant, string> = {
		primary:
			'border-primary bg-primary text-primary-fg shadow-xs shadow-primary/25 inset-shadow-[0_1px_rgb(255_255_255/0.16)] hover:bg-primary/90 active:inset-shadow-none',
		outline:
			'border-input bg-tint text-fg inset-shadow-[0_1px_rgb(255_255_255/0.05)] hover:bg-hover active:inset-shadow-none',
		ghost: 'border-transparent text-fg hover:bg-hover aria-pressed:bg-selected',
		'ghost-muted':
			'border-transparent text-muted hover:bg-hover hover:text-fg aria-pressed:bg-selected aria-pressed:text-fg'
	};

	const sizes: Record<ButtonSize, string> = {
		sm: 'h-8 gap-1.5 px-2.5 text-[13px] [&_svg]:size-4',
		md: 'h-9 gap-2 px-3 text-sm [&_svg]:size-4',
		lg: 'h-11 gap-2 px-4 text-[15px] [&_svg]:size-[18px]',
		icon: 'size-9 [&_svg]:size-[18px]',
		'icon-sm': 'size-8 [&_svg]:size-4'
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	/** The one button of the editor, in a few variants. Icon buttons need a `label`. */
	let {
		variant = 'outline',
		size = 'md',
		label,
		children,
		class: className = '',
		...rest
	}: HTMLButtonAttributes & {
		variant?: ButtonVariant;
		size?: ButtonSize;
		/** The tooltip, and what a screen reader says for an icon button. */
		label?: string;
		children: Snippet;
	} = $props();
</script>

<button
	type="button"
	title={label}
	aria-label={label}
	class={[
		'relative inline-flex shrink-0 cursor-default items-center justify-center rounded-control border font-medium whitespace-nowrap transition-[background-color,scale,box-shadow] duration-100 outline-none select-none no-drag focus-visible:ring-2 focus-visible:ring-primary/70 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
		variants[variant],
		sizes[size],
		className
	]}
	{...rest}
>
	{@render children()}
</button>
