<script lang="ts">
	import FolderOpen from '~icons/lucide/folder-open';
	import Folder from '~icons/lucide/folder';
	import X from '~icons/lucide/x';
	import TriangleAlert from '~icons/lucide/triangle-alert';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import logo from '#lib/assets/logo.svg';
	import { editor } from '#lib/state/editor.svelte.ts';

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

<div class="grid flex-1 place-items-center overflow-auto bg-frame p-8">
	<div class="flex w-full max-w-xl flex-col gap-8">
		<div class="flex flex-col items-center gap-3">
			<img src={logo} alt="SmartifyOS" class="h-9" draggable="false" />
			<p class="text-muted">Build your car's system, and see every change live.</p>
		</div>

		{#if editor.cli && !editor.cli.found}
			<div class="rounded-xl border border-warn/30 bg-warn/5 p-4">
				<div class="flex items-center gap-2 font-medium text-warn">
					<TriangleAlert class="size-4" /> The SmartifyOS CLI is needed
				</div>
				<p class="mt-1.5 text-muted">
					The editor does its work through the SmartifyOS CLI. Install it by running this in a
					terminal, then come back here.
				</p>
				<code class="selectable mt-3 block rounded-md bg-frame px-3 py-2 font-mono text-xs text-fg">
					{installCommand}
				</code>
				<button
					type="button"
					class="mt-3 rounded-md bg-raised px-3 py-1.5 hover:bg-hover"
					onclick={() => editor.refreshCli()}
				>
					Check again
				</button>
			</div>
		{/if}

		<button
			type="button"
			disabled={editor.opening || !editor.cli?.found}
			class="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-medium text-frame transition-colors hover:bg-accent-strong disabled:opacity-50"
			onclick={() => editor.open()}
		>
			{#if editor.opening}
				<LoaderCircle class="size-4 animate-spin" /> Opening
			{:else}
				<FolderOpen class="size-4" /> Open your car's app
			{/if}
		</button>

		{#if editor.openProblem}
			<div class="selectable rounded-xl border border-bad/30 bg-bad/5 p-4">
				<div class="font-medium text-bad">{editor.openProblem.message}</div>
				{#if editor.openProblem.hint}
					<p class="mt-1 whitespace-pre-line text-muted">{editor.openProblem.hint}</p>
				{/if}
			</div>
		{/if}

		{#if editor.recent.length > 0}
			<section class="flex flex-col gap-2">
				<h2 class="px-1 text-[11px] font-medium tracking-wide text-faint uppercase">Recent</h2>
				<ul class="overflow-hidden rounded-xl border border-line bg-panel">
					{#each editor.recent as project (project.path)}
						<li class="group flex items-center border-b border-line last:border-b-0">
							<button
								type="button"
								disabled={!project.exists || editor.opening || !editor.cli?.found}
								class="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-raised disabled:cursor-default disabled:hover:bg-transparent"
								onclick={() => editor.open(project.path)}
							>
								<Folder
									class={['size-4 shrink-0', project.exists ? 'text-accent' : 'text-faint']}
								/>
								<span class="flex min-w-0 flex-col">
									<span class={['truncate font-medium', !project.exists && 'text-faint']}>
										{project.name}
									</span>
									<span class="truncate text-xs text-faint">
										{project.exists ? project.path : `Not found: ${project.path}`}
									</span>
								</span>
								<span class="ml-auto shrink-0 pl-3 text-xs text-faint">{ago(project.openedAt)}</span
								>
							</button>
							<button
								type="button"
								title="Remove from this list"
								aria-label="Remove from this list"
								class="mr-2 grid size-7 place-items-center rounded-md text-faint opacity-0 group-hover:opacity-100 hover:bg-hover hover:text-fg"
								onclick={() => editor.forget(project.path)}
							>
								<X class="size-3.5" />
							</button>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
</div>
