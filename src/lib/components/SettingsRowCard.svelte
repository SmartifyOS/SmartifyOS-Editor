<script lang="ts">
	import ArrowDown from '~icons/lucide/arrow-down';
	import ArrowUp from '~icons/lucide/arrow-up';
	import Check from '~icons/lucide/check';
	import ChevronRight from '~icons/lucide/chevron-right';
	import Code from '~icons/lucide/code';
	import Copy from '~icons/lucide/copy';
	import Plus from '~icons/lucide/plus';
	import Trash from '~icons/lucide/trash-2';
	import TriangleAlert from '~icons/lucide/triangle-alert';
	import X from '~icons/lucide/x';
	import VsCode from '~icons/logos/visual-studio-code';
	import type { SettingsPageInfo, SettingsRow } from '../../../shared/cli.ts';
	import { type RowEdit, settingsCommands } from '#lib/commands.ts';
	import { rowWords } from '#lib/settings.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import { settingsPages } from '#lib/state/settings.svelte.ts';
	import Button from './ui/Button.svelte';
	import Select from './ui/Select.svelte';
	import Switch from './ui/Switch.svelte';
	import TextField from './ui/TextField.svelte';

	/**
	 * One row of a settings page of the car's own, folded to what it is, and open to change
	 * everything the CLI can change about it. Each change is the CLI's `settings edit-row`.
	 */

	let {
		page,
		row,
		index,
		open = $bindable(false)
	}: { page: SettingsPageInfo; row: SettingsRow; index: number; open?: boolean } = $props();

	const query = $derived(row.id ?? String(index + 1));
	const words = $derived(row.kind ? rowWords[row.kind] : undefined);
	const remembers = $derived(row.kind === 'toggle' || row.kind === 'choice');

	function edit(change: RowEdit) {
		void settingsPages.change(settingsCommands.editRow(page, query, change));
	}

	/** A short line saying what the row does, for when it is folded. */
	const summary = $derived.by(() => {
		if (!words) return 'Written in code';
		if (row.kind === 'info') return row.value ? `Shows ${row.value}` : words.label;
		const parts = [words.label];
		if (row.saved) parts.push('remembered');
		if (row.code) parts.push('runs your code');
		return parts.join(', ');
	});

	// The options while they are being typed, which go to the CLI once one is done.
	let options = $state<string[]>([]);
	$effect.pre(() => {
		options = row.options.map((option) => option.label);
	});

	function setOption(at: number, label: string) {
		const next = options
			.map((known, index) => (index === at ? label.trim() : known))
			.filter(Boolean);
		if (next.length > 0) edit({ options: next });
	}

	let copied = $state(false);
	async function copy(text: string) {
		await navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<div
	class={[
		'rounded-lg border transition-colors',
		open ? 'border-line-strong bg-tint' : 'border-line'
	]}
>
	<button
		type="button"
		aria-expanded={open}
		class="flex h-11 w-full items-center gap-2.5 px-2.5 text-left"
		onclick={() => (open = !open)}
	>
		{#if words}
			<words.icon class="size-4 shrink-0 text-muted" />
		{:else}
			<Code class="size-4 shrink-0 text-muted" />
		{/if}
		<span class="flex min-w-0 flex-1 flex-col">
			<span class="truncate text-[13px]">{row.title ?? row.id ?? `Row ${index + 1}`}</span>
			<span class="truncate text-xs text-faint">{summary}</span>
		</span>
		<ChevronRight
			class={['size-4 shrink-0 text-faint transition-transform', open && 'rotate-90']}
		/>
	</button>

	{#if open}
		<div class="flex flex-col gap-3 border-t border-line px-2.5 pt-3 pb-2.5">
			{#if !row.kind}
				<p class="text-[13px] text-muted">
					This row is written in code the editor does not change. Change it in VS Code.
				</p>
				<Button
					size="sm"
					class="justify-start"
					onclick={() => editor.openInVsCode(undefined, page.file, row.line)}
				>
					<VsCode /> Open it in VS Code
				</Button>
			{:else}
				<div class="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
					<span class="text-[13px] text-muted">Says</span>
					<TextField
						value={row.title ?? ''}
						onchange={(title) => title.trim() && edit({ title: title.trim() })}
					/>
					<span class="text-[13px] text-muted">Under it</span>
					<TextField
						value={row.subtitle ?? ''}
						placeholder="Nothing"
						onchange={(subtitle) => edit({ subtitle })}
					/>
					<span class="text-[13px] text-muted">Heading</span>
					<TextField
						value={row.section ?? ''}
						placeholder="None"
						onchange={(section) => edit({ section })}
					/>
					{#if row.kind === 'info'}
						<span class="text-[13px] text-muted">Shows</span>
						<TextField value={row.value ?? ''} onchange={(value) => edit({ value })} />
					{/if}
				</div>

				{#if row.kind === 'choice'}
					<div class="flex flex-col gap-1.5">
						<span class="text-xs font-medium text-faint">What can be picked</span>
						{#each options as label, at (at)}
							<div class="flex items-center gap-1.5">
								<TextField
									class="flex-1"
									value={label}
									label={`Option ${at + 1}`}
									onchange={(next) => setOption(at, next)}
								/>
								<Button
									variant="ghost-muted"
									size="icon-sm"
									label={`Take ${label} out`}
									disabled={options.length < 2}
									onclick={() => edit({ options: options.filter((_, other) => other !== at) })}
								>
									<X />
								</Button>
							</div>
						{/each}
						<Button
							variant="ghost-muted"
							size="sm"
							class="justify-start"
							onclick={() => edit({ options: [...options, `Option ${options.length + 1}`] })}
						>
							<Plus /> Add an option
						</Button>
					</div>
				{/if}

				{#if remembers}
					<div class="flex flex-col gap-2">
						<div class="flex items-center gap-3">
							<div class="flex min-w-0 flex-1 flex-col">
								<span class="text-[13px]">Remember it between drives</span>
								<span class="text-xs text-faint">So it is still set after the car was off.</span>
							</div>
							<Switch
								checked={row.saved !== null}
								label="Remember it between drives"
								onchange={(remember) => edit({ remember })}
							/>
						</div>
						{#if row.saved}
							<div class="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-x-3">
								<span class="text-[13px] text-muted">Starts as</span>
								{#if row.kind === 'toggle'}
									<Select
										class="w-full"
										options={[
											{ value: 'off', label: 'Off' },
											{ value: 'on', label: 'On' }
										]}
										bind:value={
											() => (row.saved?.default === true ? 'on' : 'off'),
											(value) => edit({ default: value === 'on' })
										}
									/>
								{:else}
									<Select
										class="w-full"
										options={row.options.map((option) => ({
											value: option.value,
											label: option.label
										}))}
										bind:value={
											() => String(row.saved?.default ?? row.options[0]?.value ?? ''),
											(value) => edit({ default: value })
										}
									/>
								{/if}
							</div>
							<div class="flex items-center gap-2 rounded-md bg-bg/60 py-1 pr-1 pl-2">
								<span class="min-w-0 flex-1 text-xs text-muted">
									Read it in your code with
									<code class="font-mono text-fg">{row.saved.name}.value</code>
								</span>
								<Button
									variant="ghost-muted"
									size="icon-sm"
									label="Copy"
									onclick={() => row.saved && void copy(`${row.saved.name}.value`)}
								>
									{#if copied}<Check />{:else}<Copy />{/if}
								</Button>
							</div>
						{/if}
					</div>

					<div class="flex items-center gap-3">
						<div class="flex min-w-0 flex-1 flex-col">
							<span class="text-[13px]">Run code of mine when it changes</span>
							<span class="text-xs text-faint"
								>A function in the page's file, for you to fill in.</span
							>
						</div>
						<Switch
							checked={row.code !== null}
							label="Run code of mine when it changes"
							onchange={(code) => edit({ code })}
						/>
					</div>
				{/if}

				{#if row.code}
					<Button
						size="sm"
						class="justify-start"
						onclick={() => row.code && editor.openInVsCode(undefined, page.file, row.code.line)}
					>
						<VsCode /> Write what it does
					</Button>
				{/if}

				{#if remembers && !row.saved && !row.code}
					<p class="flex items-start gap-2 text-[13px] text-warn">
						<TriangleAlert class="mt-0.5 size-3.5 shrink-0" />
						It does nothing yet. Let it remember its value, or run code of yours.
					</p>
				{/if}
			{/if}

			<div class="flex items-center gap-1 border-t border-line pt-2">
				<Button
					variant="ghost-muted"
					size="icon-sm"
					label="Move it up"
					disabled={index === 0}
					onclick={() => void settingsPages.change(settingsCommands.moveRow(page, query, 'up'))}
				>
					<ArrowUp />
				</Button>
				<Button
					variant="ghost-muted"
					size="icon-sm"
					label="Move it down"
					disabled={index === page.rows.length - 1}
					onclick={() => void settingsPages.change(settingsCommands.moveRow(page, query, 'down'))}
				>
					<ArrowDown />
				</Button>
				<Button
					variant="ghost-muted"
					size="sm"
					class="ml-auto"
					onclick={() => void settingsPages.change(settingsCommands.removeRow(page, query))}
				>
					<Trash /> Remove
				</Button>
			</div>
		</div>
	{/if}
</div>
