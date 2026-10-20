<script lang="ts">
	import VsCode from '~icons/logos/visual-studio-code';
	import { editor } from '#lib/state/editor.svelte.ts';
	import Button from '../ui/Button.svelte';

	/**
	 * Says that something is written as code in `lib/main.dart`, which the editor only shows, and
	 * opens it there in VS Code.
	 */
	let { text, code, line }: { text: string; code: string; line: number } = $props();
</script>

<div class="flex items-start gap-2 rounded-control border border-line bg-tint py-2 pr-1.5 pl-2.5">
	<p class="min-w-0 flex-1 text-[13px] text-muted">
		{text}
		<code class="block font-mono text-xs break-words text-faint">{code}</code>
	</p>
	<Button
		variant="ghost-muted"
		size="icon-sm"
		class="-my-1"
		label="Open it in VS Code"
		onclick={() => editor.openInVsCode(undefined, 'lib/main.dart', line)}
	>
		<VsCode />
	</Button>
</div>
