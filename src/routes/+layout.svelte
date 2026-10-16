<script lang="ts">
	import './layout.css';
	import type { LayoutProps } from './$types';
	import { editor } from '#lib/state/editor.svelte.ts';

	let { children }: LayoutProps = $props();

	$effect(() => editor.start());
</script>

<svelte:head>
	<title>SmartifyOS</title>
</svelte:head>

{@render children()}
