<script lang="ts">
	/** A keyboard shortcut, like ⌘P. Takes the shortcut the way this system writes it. */
	let { keys, class: className = '' }: { keys: string; class?: string } = $props();
</script>

<kbd
	class={[
		'pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] bg-white/[0.06] px-1.5 font-sans text-xs font-medium text-current/75',
		className
	]}
>
	{keys}
</kbd>
