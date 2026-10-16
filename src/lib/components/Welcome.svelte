<script lang="ts">
	import FolderOpen from '~icons/lucide/folder-open';
	import Folder from '~icons/lucide/folder';
	import X from '~icons/lucide/x';
	import TriangleAlert from '~icons/lucide/triangle-alert';
	import CircleAlert from '~icons/lucide/circle-alert';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import icon from '#lib/assets/icon.png';
	import { editor } from '#lib/state/editor.svelte.ts';
	import Button from './ui/Button.svelte';

	const installCommand =
		window.smartify.platform === 'win32'
			? 'irm https://smartify-os.com/install.ps1 | iex'
			: 'curl -fsSL https://smartify-os.com/install.sh | bash';

	function ago(iso: string): string {
		const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
		if (minutes < 1) return 'just now';
		if (minutes < 60) return `${minutes} min ago`;
		const hours = Math.round(minutes / 60);
		if (hours < 24) return `${hours} h ago`;
		const days = Math.round(hours / 24);
		return days === 1 ? 'yesterday' : `${days} days ago`;
	}
</script>

<div class="flex flex-1 justify-center overflow-auto bg-bg px-8 py-16">
	<div class="my-auto flex w-full max-w-xl flex-col gap-8">
		<div class="flex flex-col items-center gap-4 text-center">
			<img src={icon} alt="" class="size-20 rounded-[18px] shadow-float" draggable="false" />
			<div class="flex flex-col gap-1.5">
				<h1 class="text-2xl font-semibold tracking-tight">SmartifyOS Editor</h1>
				<p class="text-[15px] text-muted">Build your car's system, and see every change live.</p>
			</div>
		</div>

		{#if editor.cli && !editor.cli.found}
			<div class="rounded-xl border border-warn/25 bg-warn/[0.07] p-4">
				<div class="flex items-center gap-2 font-medium text-warn">
					<TriangleAlert class="size-4" /> The SmartifyOS CLI is needed
				</div>
				<p class="mt-1.5 text-muted">
					The editor does its work through the SmartifyOS CLI. Install it by running this in a
					terminal, then come back here.
				</p>
				<code
					class="selectable mt-3 block rounded-lg border border-line bg-bg px-3 py-2.5 font-mono text-[13px]"
				>
					{installCommand}
				</code>
				<Button size="sm" class="mt-3" onclick={() => editor.refreshCli()}>Check again</Button>
			</div>
		{/if}

		<Button
			variant="primary"
			size="lg"
			disabled={editor.opening || !editor.cli?.found}
			onclick={() => editor.open()}
		>
			{#if editor.opening}
				<LoaderCircle class="animate-spin" /> Opening
			{:else}
				<FolderOpen /> Open your car's app
			{/if}
		</Button>

		{#if editor.openProblem}
			<div class="selectable flex gap-3 rounded-xl border border-bad/25 bg-bad/[0.07] p-4">
				<CircleAlert class="mt-0.5 size-4 shrink-0 text-bad" />
				<div>
					<div class="font-medium">{editor.openProblem.message}</div>
					{#if editor.openProblem.hint}
						<p class="mt-1 whitespace-pre-line text-muted">{editor.openProblem.hint}</p>
					{/if}
				</div>
			</div>
		{/if}

		{#if editor.recent.length > 0}
			<section class="flex flex-col gap-2">
				<h2 class="px-1 text-[13px] font-medium text-muted">Recent projects</h2>
				<ul class="flex flex-col gap-0.5 rounded-xl border border-line bg-card p-1.5">
					{#each editor.recent as project (project.path)}
						<li class="group relative flex items-center">
							<button
								type="button"
								disabled={!project.exists || editor.opening || !editor.cli?.found}
								class="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-hover disabled:hover:bg-transparent"
								onclick={() => editor.open(project.path)}
							>
								<span
									class={[
										'grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-tint',
										project.exists ? 'text-fg' : 'text-faint'
									]}
								>
									<Folder class="size-4" />
								</span>
								<span class="flex min-w-0 flex-col">
									<span class={['truncate font-medium', !project.exists && 'text-faint']}>
										{project.name}
									</span>
									<span class="truncate text-[13px] text-faint">
										{project.exists ? project.path : `Not found: ${project.path}`}
									</span>
								</span>
								<span class="ml-auto shrink-0 pr-9 pl-3 text-[13px] text-faint">
									{ago(project.openedAt)}
								</span>
							</button>
							<Button
								variant="ghost-muted"
								size="icon-sm"
								label="Remove from this list"
								class="absolute right-1.5 opacity-0 group-hover:opacity-100"
								onclick={() => editor.forget(project.path)}
							>
								<X />
							</Button>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
</div>
