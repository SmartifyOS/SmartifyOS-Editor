<script lang="ts">
	import Plus from '~icons/lucide/plus';
	import X from '~icons/lucide/x';
	import { editor } from '#lib/state/editor.svelte.ts';
	import { look } from '#lib/state/look.svelte.ts';
	import Button from '../ui/Button.svelte';
	import TextField from '../ui/TextField.svelte';
	import Fold from './Fold.svelte';

	/**
	 * What the About page in Settings says about the car, written by `about` and shown in the
	 * running app at once (see `look`).
	 */

	const appearance = $derived(look.appearance);
	const canWrite = $derived(editor.cli?.found === true);

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
	<p class="text-[13px] text-muted">Reading your car…</p>
{:else}
	<Fold id="about.car" title="Your car">
		<div class="flex flex-col gap-2.5">
			<div class="grid grid-cols-[minmax(0,10fr)_minmax(0,13fr)] items-center gap-x-3 gap-y-2.5">
				<span class="text-[13px] text-muted">Name</span>
				<TextField
					value={appearance.about.name ?? ''}
					placeholder={appearance.code.name ? `Set in code: ${appearance.code.name}` : 'Miata'}
					label="Name"
					onchange={(name) => {
						if (name.trim()) void look.change({ name: name.trim() });
					}}
				/>
				<span class="text-[13px] text-muted">Car</span>
				<TextField
					value={appearance.about.model ?? ''}
					placeholder="Mazda MX-5 NB 1.8"
					label="Car"
					onchange={(model) => void look.change({ model: model.trim() })}
				/>
			</div>
			<p class="text-xs text-faint">
				The name is also what phones see over Bluetooth, unless the Bluetooth page says another.
			</p>
		</div>
	</Fold>

	<Fold id="about.rows" title="Rows of your own">
		{#if appearance.code.extra === undefined}
			<div class="flex flex-col gap-2">
				{#each Object.entries(appearance.about.extra) as [rowLabel, value] (rowLabel)}
					<div class="flex items-center gap-1.5">
						<TextField
							class="w-[96px] shrink-0"
							value={rowLabel}
							label="Label"
							onchange={(to) => renameRow(rowLabel, to, value)}
						/>
						<TextField
							class="min-w-0 flex-1"
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
							disabled={!canWrite}
							onclick={() => void look.change({ extra: { [rowLabel]: '' } })}
						>
							<X />
						</Button>
					</div>
				{/each}
				{#each newRows as row, index (index)}
					<div class="flex items-center gap-1.5">
						<TextField
							class="w-[96px] shrink-0"
							value={row.label}
							placeholder="VIN"
							label="Label"
							onchange={(next) => {
								row.label = next;
								addRow(index);
							}}
						/>
						<TextField
							class="min-w-0 flex-1"
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
			<p class="text-xs text-faint">They are set in code: {appearance.code.extra}</p>
		{/if}
	</Fold>
{/if}
