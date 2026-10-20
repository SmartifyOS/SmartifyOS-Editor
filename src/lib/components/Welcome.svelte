<script lang="ts">
	import FolderOpen from '~icons/lucide/folder-open';
	import Folder from '~icons/lucide/folder';
	import Plus from '~icons/lucide/plus';
	import X from '~icons/lucide/x';
	import TriangleAlert from '~icons/lucide/triangle-alert';
	import CircleAlert from '~icons/lucide/circle-alert';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import { goto } from '$app/navigation';
	import icon from '#lib/assets/icon.png';
	import { editor } from '#lib/state/editor.svelte.ts';
	import Button from './ui/Button.svelte';

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
					<TriangleAlert class="size-4" /> SmartifyOS is not installed yet
				</div>
				{#if editor.cli.canInstall}
					<p class="mt-1.5 text-muted">
						The editor builds your car's app with SmartifyOS. It installs it for you, and Flutter
						with it if this computer does not have it.
					</p>
					<div class="mt-3 flex gap-2">
						<Button
							size="sm"
							variant="primary"
							disabled={editor.busy}
							onclick={() => editor.installCli()}
						>
							Install SmartifyOS
						</Button>
						<Button size="sm" onclick={() => editor.refreshCli()}>Check again</Button>
					</div>
				{:else}
					<p class="selectable mt-1.5 text-muted">{editor.cli.reason}</p>
					<Button size="sm" class="mt-3" onclick={() => editor.refreshCli()}>Check again</Button>
				{/if}
			</div>
		{/if}

		{#if editor.computer && !editor.computer.ready}
			{@const missing = editor.computer.checks.filter((check) => check.status === 'error')}
			<div class="rounded-xl border border-warn/25 bg-warn/[0.07] p-4">
				<div class="flex items-center gap-2 font-medium text-warn">
					<TriangleAlert class="size-4" /> This computer is not ready yet
				</div>
				<ul class="mt-1.5 flex flex-col gap-0.5 text-muted">
					{#each missing as check (check.id)}
						<li><span class="text-fg">{check.title}</span>: {check.summary}</li>
					{/each}
				</ul>
				<div class="mt-3 flex gap-2">
					<Button
						size="sm"
						variant="primary"
						disabled={editor.busy}
						onclick={() => editor.setUpComputer()}
					>
						Get it ready
					</Button>
					<Button size="sm" onclick={() => goto('#/settings')}>See what it has</Button>
				</div>
			</div>
		{/if}

		<div class="grid grid-cols-2 gap-2.5">
			<Button
				variant="primary"
				size="lg"
				disabled={editor.opening || !editor.cli?.found}
				onclick={() => (editor.newCarDialog = true)}
			>
				<Plus /> Create your car's app
			</Button>
			<Button
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
		</div>

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
