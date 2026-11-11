<script lang="ts">
	import Eye from '~icons/lucide/eye';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import Plus from '~icons/lucide/plus';
	import SettingsIcon from '~icons/lucide/settings';
	import Trash from '~icons/lucide/trash-2';
	import TriangleAlert from '~icons/lucide/triangle-alert';
	import VsCode from '~icons/logos/visual-studio-code';
	import type { RowKind, SettingsPageInfo, SettingsRow } from '../../../shared/cli.ts';
	import { settingsCommands } from '#lib/commands.ts';
	import IconPicker from './IconPicker.svelte';
	import { rowKinds, rowWords } from '#lib/settings.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import { settingsPages } from '#lib/state/settings.svelte.ts';
	import InspectorHeading from './InspectorHeading.svelte';
	import InspectorSection from './InspectorSection.svelte';
	import RunAppLink from './RunAppLink.svelte';
	import SettingsRowCard from './SettingsRowCard.svelte';
	import Button from './ui/Button.svelte';
	import Select from './ui/Select.svelte';
	import TextField from './ui/TextField.svelte';

	/**
	 * A settings page of the car's own in the inspector: the page itself, and its rows, each
	 * changed with the CLI's `settings` commands. The running app shows the page as it changes.
	 * One written some other way than the CLI writes them is only shown, and changed in VS Code.
	 */

	let { page }: { page: SettingsPageInfo } = $props();

	const parents = $derived(settingsPages.parents(page));
	const parentTitle = $derived(parents.find((known) => known.id === page.parent)?.title);
	const running = $derived(editor.preview.status === 'running');

	/** The row that is open, by id, and the kind of row being added. */
	let openRow = $state<string | undefined>();
	let adding = $state<RowKind | undefined>();
	let newTitle = $state('');

	function changePage(change: {
		title?: string;
		subtitle?: string;
		icon?: string;
		parent?: string;
		order?: number | null;
	}) {
		void settingsPages.change(settingsCommands.edit(page, change));
	}

	async function addRow() {
		const kind = adding;
		const title = newTitle.trim();
		if (!kind || !title) return;
		adding = undefined;
		newTitle = '';
		const result = await settingsPages.change(settingsCommands.addRow(page, kind, title));
		if (result.ok) openRow = (result.data as { row: SettingsRow | null }).row?.id ?? undefined;
	}
</script>

<InspectorHeading
	title={page.title ?? page.id ?? page.file}
	icon={SettingsIcon}
	carIcon={page.icon}
	detail={page.file}
	about={`A page of your own in Settings. The driver opens it from its row on ${parentTitle ?? 'the page it goes in'}.`}
/>

<InspectorSection>
	{#if !page.registered}
		<p class="flex items-start gap-2 text-[13px] text-warn">
			<TriangleAlert class="mt-0.5 size-3.5 shrink-0" />
			Your app does not have it yet, since nothing hands it to SmartifyOS. That usually happens in lib/main.dart.
		</p>
	{/if}
	<Button
		size="sm"
		class="w-full justify-start"
		onclick={() => editor.openInVsCode(undefined, page.file, page.line)}
	>
		<VsCode /> Open it in VS Code
	</Button>
	{#if running}
		<Button size="sm" class="w-full justify-start" onclick={() => void settingsPages.show(page)}>
			<Eye /> Show it in the preview
		</Button>
	{:else}
		<p class="text-[13px] text-muted">
			Run your car's app to see it in the preview. <RunAppLink />
		</p>
	{/if}
	{#if settingsPages.problem}
		<p class="text-[13px] text-bad">{settingsPages.problem}</p>
	{/if}
</InspectorSection>

{#snippet pageFields()}
	<div class="field-grid">
		<span class="text-[13px] text-muted">Name</span>
		<TextField
			value={page.title ?? ''}
			label="Name"
			onchange={(title) => title.trim() && changePage({ title: title.trim() })}
		/>
		<span class="text-[13px] text-muted">Under it</span>
		<TextField
			value={page.subtitle ?? ''}
			placeholder="Nothing"
			label="Under it"
			onchange={(subtitle) => changePage({ subtitle })}
		/>
		<span class="text-[13px] text-muted">Goes in</span>
		<Select
			class="w-full"
			options={[
				...(page.parent && parents.some((known) => known.id === page.parent)
					? []
					: [{ value: page.parent ?? '', label: page.parent ?? 'Set in code' }]),
				...parents.map((known) => ({ value: known.id, label: known.title }))
			]}
			bind:value={
				() => page.parent ?? '',
				(parent) => parent && parent !== page.parent && changePage({ parent })
			}
		/>
		<span class="text-[13px] text-muted">Order</span>
		<TextField
			value={page.order?.toString() ?? ''}
			placeholder="100"
			label="Order"
			onchange={(text) => {
				const order = text.trim() === '' ? null : Number(text);
				if (order === null || Number.isInteger(order)) changePage({ order });
			}}
		/>
	</div>
	<p class="text-xs text-faint">
		Where its row sits on {parentTitle ?? 'the page it goes in'}, smaller numbers first. Empty is
		100.
	</p>
	<IconPicker value={page.icon} onpick={(icon) => changePage({ icon })} />
{/snippet}
{#snippet pageWritten()}
	<div class="field-grid text-[13px]">
		<span class="text-muted">Name</span>
		<span class={['truncate', page.title === null && 'text-faint']}>
			{page.title ?? 'Set in code'}
		</span>
		{#if page.subtitle}
			<span class="text-muted">Under it</span>
			<span class="truncate">{page.subtitle}</span>
		{/if}
		<span class="text-muted">Goes in</span>
		<span class={['truncate', !parentTitle && !page.parent && 'text-faint']}>
			{parentTitle ?? page.parent ?? 'Set in code'}
		</span>
		<span class="text-muted">Order</span>
		<span>{page.order ?? 100}</span>
	</div>
	<p class="flex items-start gap-2 text-[13px] text-warn">
		<TriangleAlert class="mt-0.5 size-3.5 shrink-0" />
		Written outside this editor, so change it in VS Code.
	</p>
{/snippet}
<InspectorSection title="Page">
	{#if page.editable}{@render pageFields()}{:else}{@render pageWritten()}{/if}
</InspectorSection>

{#snippet rows()}
	{#if page.rows.length === 0 && !adding}
		<p class="text-[13px] text-muted">
			No rows yet. Add switches, choices, buttons and information for the driver.
		</p>
	{/if}
	{#each page.rows as row, index (row.id ?? index)}
		<SettingsRowCard
			{page}
			{row}
			{index}
			bind:open={
				() => openRow === (row.id ?? String(index)),
				(open) => (openRow = open ? (row.id ?? String(index)) : undefined)
			}
		/>
	{/each}

	{#if adding}
		{@const words = rowWords[adding]}
		<div class="flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/5 p-2.5">
			<span class="flex items-center gap-2 text-[13px] font-medium">
				<words.icon class="size-4 text-accent" /> New {words.label.toLowerCase()}
			</span>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				bind:value={newTitle}
				placeholder={words.placeholder}
				aria-label="What does it say?"
				autofocus
				class="h-8 rounded-control border border-input bg-tint px-2.5 text-[13px] outline-none placeholder:text-faint focus:border-primary/70 focus:ring-2 focus:ring-primary/25"
				onkeydown={(event) => {
					if (event.key === 'Enter') void addRow();
					if (event.key === 'Escape') adding = undefined;
				}}
			/>
			<span class="text-xs text-faint">What it says, the driver reads this.</span>
			<div class="flex justify-end gap-2">
				<Button size="sm" onclick={() => (adding = undefined)}>Cancel</Button>
				<Button variant="primary" size="sm" disabled={!newTitle.trim()} onclick={addRow}>Add</Button
				>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-1.5">
			{#each rowKinds as kind (kind)}
				{@const words = rowWords[kind]}
				<button
					type="button"
					title={words.hint}
					class="flex items-center gap-2 rounded-lg border border-dashed border-line-strong px-2.5 py-2 text-left text-[13px] text-muted transition-colors hover:border-solid hover:bg-hover hover:text-fg"
					onclick={() => (adding = kind)}
				>
					<Plus class="size-3.5 shrink-0" />
					<span class="truncate">{words.label}</span>
				</button>
			{/each}
		</div>
	{/if}
{/snippet}
{#snippet rowsWritten()}
	{#each page.rows as row, index (row.id ?? index)}
		{@const words = row.kind ? rowWords[row.kind] : undefined}
		<Button
			size="sm"
			class="w-full justify-start"
			title="Open it in VS Code"
			onclick={() => editor.openInVsCode(undefined, page.file, row.line)}
		>
			{#if words}<words.icon />{/if}
			<span class="truncate">{row.title ?? 'Written in code'}</span>
		</Button>
	{/each}
{/snippet}
{#if page.editable}
	<InspectorSection title={`Rows${page.rows.length > 0 ? ` (${page.rows.length})` : ''}`}>
		{#snippet actions()}
			{#if settingsPages.pending > 0}
				<LoaderCircle class="size-3.5 animate-spin text-muted" />
			{/if}
		{/snippet}
		{@render rows()}
	</InspectorSection>
{:else if page.rows.length > 0}
	<InspectorSection title={`Rows (${page.rows.length})`}>{@render rowsWritten()}</InspectorSection>
{/if}

{#if page.editable}
	<InspectorSection title="Remove">
		<Button
			size="sm"
			class="w-full justify-start text-bad! hover:bg-bad/10!"
			onclick={() => void settingsPages.remove(page)}
		>
			<Trash /> Remove this page
		</Button>
	</InspectorSection>
{/if}
