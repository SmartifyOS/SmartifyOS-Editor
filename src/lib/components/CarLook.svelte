<script lang="ts">
	import FileUp from '~icons/lucide/file-up';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import Plus from '~icons/lucide/plus';
	import Trash from '~icons/lucide/trash-2';
	import X from '~icons/lucide/x';
	import type { Snippet } from 'svelte';
	import type { CarLookName } from '../../../shared/cli.ts';
	import { bars, carLooks, layouts, themes } from '#lib/look.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import { look } from '#lib/state/look.svelte.ts';
	import Button from './ui/Button.svelte';
	import Select from './ui/Select.svelte';
	import TextField from './ui/TextField.svelte';

	/**
	 * How the car looks and what its About page says, in the inspector. Every change shows in
	 * the running app straight away and is written into the car's `lib/main.dart` by the CLI.
	 */

	const appearance = $derived(look.appearance);
	const app = $derived(look.app);
	const canWrite = $derived(editor.cli?.found === true);

	/** Stands for "written as code" in a select, which has to have a value for everything. */
	const inCode = '\u0000code';

	const layoutOptions = $derived.by(() => {
		const options = app
			? app.layouts.map((layout) => ({ value: layout.id, label: layout.title }))
			: layouts.map((layout) => ({ value: layout.id, label: layout.label }));
		return withCurrent(options, appearance?.layout, appearance?.code.layout);
	});

	const themeOptions = $derived.by(() => {
		const options = app
			? app.themes.map((theme) => ({ value: theme.id, label: theme.title }))
			: themes.map((theme) => ({ value: theme.id, label: theme.label }));
		return [
			{ value: '', label: "Each layout's own" },
			...withCurrent(options, appearance?.theme ?? '', appearance?.code.theme).filter(
				(option) => option.value !== ''
			)
		];
	});

	const barOptions = $derived(
		withCurrent(
			bars.map((bar) => ({ value: bar.id, label: bar.label })),
			appearance?.bar,
			appearance?.code.bar
		)
	);

	/** The options with the current value among them, the car's own or written as code. */
	function withCurrent(
		options: { value: string; label: string }[],
		current: string | null | undefined,
		code: string | undefined
	): { value: string; label: string }[] {
		if (code !== undefined) return [{ value: inCode, label: `Set in code: ${code}` }, ...options];
		if (current && !options.some((option) => option.value === current)) {
			return [...options, { value: current, label: current }];
		}
		return options;
	}

	const pictures = $derived(carLooks.filter((kind) => appearance?.car[kind.id]));

	async function pickPicture(kind: (typeof carLooks)[number]) {
		const file = await window.smartify.files.pickFile(
			`A ${kind.label.toLowerCase()} of your car`,
			kind.extensions
		);
		if (file) void look.change({ files: { [kind.id]: file } });
	}

	function fileName(path: string): string {
		return path.split('/').pop() ?? path;
	}

	/** Rows of the About page being added, not written until they have a label. */
	let newRows = $state<{ label: string; value: string }[]>([]);

	function renameRow(from: string, to: string, value: string) {
		const label = to.trim();
		if (!label || label === from) return;
		void look.change({ extra: { [from]: '', [label]: value } });
	}

	function addRow(index: number) {
		const row = newRows[index];
		if (!row?.label.trim() || !row.value.trim()) return;
		newRows = newRows.filter((_, at) => at !== index);
		void look.change({ extra: { [row.label.trim()]: row.value.trim() } });
	}
</script>

{#if !appearance}
	<p class="flex items-center gap-2 text-[13px] text-muted">
		<LoaderCircle class="size-3.5 animate-spin" /> Reading your car
	</p>
{:else}
	{#snippet screen()}
		<div class="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
			{@render label('Layout')}
			<Select
				class="w-full"
				options={layoutOptions}
				bind:value={
					() => appearance.layout ?? inCode,
					(layout) => {
						if (layout !== inCode) void look.change({ layout });
					}
				}
			/>
			{@render label('Theme')}
			<Select
				class="w-full"
				options={themeOptions}
				bind:value={
					() => (appearance.code.theme !== undefined ? inCode : (appearance.theme ?? '')),
					(theme) => {
						if (theme !== inCode) void look.change({ theme: theme || null });
					}
				}
			/>
			{@render label("Driver's side")}
			<Select
				class="w-full"
				options={[
					...(appearance.driverSide ? [] : [{ value: inCode, label: 'Set in code' }]),
					{ value: 'left', label: 'Left' },
					{ value: 'right', label: 'Right' }
				]}
				bind:value={
					() => appearance.driverSide ?? inCode,
					(side) => {
						if (side === 'left' || side === 'right') void look.change({ driverSide: side });
					}
				}
			/>
			{@render label('Bar')}
			<Select
				class="w-full"
				options={barOptions}
				bind:value={
					() => appearance.bar ?? inCode,
					(bar) => {
						const choice = bars.find((known) => known.id === bar);
						if (choice) void look.change({ bar: choice.id });
					}
				}
			/>
		</div>
		{#if app && app.theme.picked}
			<p class="text-xs text-faint">
				A theme picked in the app's Settings is forgotten when you change it here.
			</p>
		{/if}
	{/snippet}
	{@render section('Screen', screen)}

	{#snippet car()}
		<div class="flex flex-col gap-1">
			{#each carLooks as kind (kind.id)}
				{@const file = appearance.car[kind.id]}
				<div class="flex h-9 items-center gap-2.5 rounded-lg pr-1 pl-2.5 hover:bg-hover">
					<kind.icon class={['size-4 shrink-0', file ? 'text-fg' : 'text-faint']} />
					<div class="flex min-w-0 flex-1 flex-col">
						<span class={['truncate text-[13px]', !file && 'text-muted']}>{kind.label}</span>
						{#if file}
							<span class="truncate font-mono text-xs text-faint" title={file}
								>{fileName(file)}</span
							>
						{/if}
					</div>
					<Button
						variant="ghost-muted"
						size="icon-sm"
						label={file
							? `Use another ${kind.label.toLowerCase()}`
							: `Add a ${kind.label.toLowerCase()}`}
						disabled={!canWrite}
						onclick={() => pickPicture(kind)}
					>
						{#if file}<FileUp />{:else}<Plus />{/if}
					</Button>
					{#if file}
						<Button
							variant="ghost-muted"
							size="icon-sm"
							label={`Take the ${kind.label.toLowerCase()} out`}
							disabled={!canWrite}
							onclick={() => void look.change({ files: { [kind.id]: null } })}
						>
							<Trash />
						</Button>
					{/if}
				</div>
			{/each}
		</div>
		{#if pictures.length > 1}
			<div class="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-x-3">
				{@render label('Starts as')}
				<Select
					class="w-full"
					options={[
						{ value: '', label: `The first (${pictures[0]?.label})` },
						...pictures.map((kind) => ({ value: kind.id, label: kind.label }))
					]}
					bind:value={
						() => appearance.car.look ?? '',
						(value) => void look.change({ look: (value || null) as CarLookName | null })
					}
				/>
			</div>
		{/if}
	{/snippet}
	{@render section('The car on the screen', car)}

	{#snippet about()}
		<div class="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
			{@render label('Name')}
			<TextField
				value={appearance.about.name ?? ''}
				placeholder={appearance.code.name ? `Set in code: ${appearance.code.name}` : 'Miata'}
				onchange={(name) => {
					if (name.trim()) void look.change({ name: name.trim() });
				}}
			/>
			{@render label('Car')}
			<TextField
				value={appearance.about.model ?? ''}
				placeholder="Mazda MX-5 NB 1.8"
				onchange={(model) => void look.change({ model: model.trim() })}
			/>
		</div>

		{#if appearance.code.extra === undefined}
			<div class="flex flex-col gap-2">
				{#each Object.entries(appearance.about.extra) as [rowLabel, value] (rowLabel)}
					<div class="flex items-center gap-1.5">
						<TextField
							class="w-[84px] shrink-0"
							value={rowLabel}
							label="Label"
							onchange={(to) => renameRow(rowLabel, to, value)}
						/>
						<TextField
							class="flex-1"
							{value}
							label={rowLabel}
							onchange={(next) => {
								if (next.trim()) void look.change({ extra: { [rowLabel]: next.trim() } });
							}}
						/>
						<Button
							variant="ghost-muted"
							size="icon-sm"
							label={`Take ${rowLabel} off`}
							onclick={() => void look.change({ extra: { [rowLabel]: '' } })}
						>
							<X />
						</Button>
					</div>
				{/each}
				{#each newRows as row, index (index)}
					<div class="flex items-center gap-1.5">
						<TextField
							class="w-[84px] shrink-0"
							value={row.label}
							placeholder="VIN"
							label="Label"
							onchange={(next) => {
								row.label = next;
								addRow(index);
							}}
						/>
						<TextField
							class="flex-1"
							value={row.value}
							placeholder="What it says"
							label="Value"
							onchange={(next) => {
								row.value = next;
								addRow(index);
							}}
						/>
						<Button
							variant="ghost-muted"
							size="icon-sm"
							label="Leave it out"
							onclick={() => (newRows = newRows.filter((_, at) => at !== index))}
						>
							<X />
						</Button>
					</div>
				{/each}
				<Button
					variant="ghost-muted"
					size="sm"
					class="justify-start"
					disabled={!canWrite}
					onclick={() => (newRows = [...newRows, { label: '', value: '' }])}
				>
					<Plus /> Add a row, like the VIN
				</Button>
			</div>
		{:else}
			<p class="text-xs text-faint">The rows below are set in code: {appearance.code.extra}</p>
		{/if}
	{/snippet}
	{@render section('About page', about)}

	{#if look.problem}
		<p class="text-[13px] text-bad">{look.problem}</p>
	{/if}
	{#if look.manual.length > 0}
		<div class="flex flex-col gap-1 text-[13px] text-muted">
			<p>This has no clear place in lib/main.dart, so add it there by hand:</p>
			{#each look.manual as line (line)}
				<code class="font-mono text-xs break-all text-faint">{line}</code>
			{/each}
		</div>
	{/if}
{/if}

{#snippet section(title: string, children: Snippet)}
	<section class="flex flex-col gap-2">
		<h3 class="text-xs font-medium text-faint">{title}</h3>
		{@render children()}
	</section>
{/snippet}

{#snippet label(text: string)}
	<span class="truncate text-[13px] text-muted">{text}</span>
{/snippet}
