<script lang="ts">
	import ArrowDown from '~icons/lucide/arrow-down';
	import ArrowUp from '~icons/lucide/arrow-up';
	import Copy from '~icons/lucide/copy';
	import Gauge from '~icons/lucide/gauge';
	import Plus from '~icons/lucide/plus';
	import TriangleAlert from '~icons/lucide/triangle-alert';
	import X from '~icons/lucide/x';
	import { config } from '#lib/state/config.svelte.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import { look } from '#lib/state/look.svelte.ts';
	import Button from '../ui/Button.svelte';
	import AddField from '../ui/AddField.svelte';
	import NumberField from '../ui/NumberField.svelte';
	import Select from '../ui/Select.svelte';
	import Switch from '../ui/Switch.svelte';
	import TextField from '../ui/TextField.svelte';
	import CodeNote from './CodeNote.svelte';
	import Fold from './Fold.svelte';

	/**
	 * The info display: the values it can show (the speed SmartifyOS has, and the car's own,
	 * whose numbers the app reports in code), and the pairs of them a tap goes through.
	 */

	const values = 'infoDisplay.values';
	const views = 'infoDisplay.views';
	const hidden = 'infoDisplay.hiddenValues';
	const canWrite = $derived(editor.cli?.found === true);

	const sectionCode = $derived(config.result?.code.infoDisplay);
	const valuesCode = $derived(config.result?.code[values]);
	const viewsCode = $derived(config.result?.code[views]);
	const own = $derived(config.elements(values));
	const speedShown = $derived(!config.value<string[]>(hidden).includes('speed'));

	/** Every value a view can name, by id. */
	const choices = $derived([
		{ value: 'speed', label: speedShown ? 'Speed' : 'Speed (left out)' },
		...own
			.filter((element) => typeof element.values.id === 'string')
			.map((element) => ({
				value: element.values.id as string,
				label: String(element.values.label ?? element.values.id)
			}))
	]);

	/** The choices, with one a view names that is not among them any more. */
	function withCurrent(current: string): { value: string; label: string }[] {
		if (!current || choices.some((choice) => choice.value === current)) return choices;
		return [...choices, { value: current, label: `${current} (not there)` }];
	}

	/** Stands for nothing under the big value. */
	const nothing = '\u0000none';

	/** A name for code made from a label: `Engine speed` is `engine_speed`. */
	function idFor(label: string): string {
		const base =
			label
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '_')
				.replace(/^_+|_+$/g, '')
				.replace(/^(\d)/, 'v$1') || 'value';
		const taken = new Set(['speed', ...choices.map((choice) => choice.value)]);
		let id = base;
		for (let n = 2; taken.has(id); n++) id = `${base}_${n}`;
		return id;
	}

	/** Copies the line that reports a value's number into the clipboard. */
	let copied = $state<string | undefined>();
	async function copyReport(id: string) {
		await navigator.clipboard.writeText(`SmartifyOsInfoDisplay.reportReading('${id}', 0);`);
		copied = id;
		setTimeout(() => {
			if (copied === id) copied = undefined;
		}, 1500);
	}
</script>

{#if sectionCode}
	<CodeNote
		text="Your app sets up the info display in code:"
		code={sectionCode.code}
		line={sectionCode.line}
	/>
{:else}
	{#if look.appearance?.bar === 'dock'}
		<div class="flex items-start gap-2 text-[13px] text-warn">
			<TriangleAlert class="mt-0.5 size-3.5 shrink-0" />
			<p class="min-w-0 flex-1">
				The bar only has a dock now, so the info display is not on screen.
				<button
					type="button"
					class="cursor-default text-fg underline decoration-line-strong underline-offset-2 hover:decoration-fg"
					onclick={() => (editor.selection = { kind: 'setup', area: 'screen' })}
					>Change the bar</button
				>
			</p>
		</div>
	{/if}

	<Fold id="infoDisplay.values" title="What it can show">
		<div class="flex flex-col gap-2">
			<div
				class="flex h-10 items-center gap-2.5 rounded-control border border-line bg-tint pr-2 pl-2.5"
			>
				<Gauge class="size-4 shrink-0 text-muted" />
				<div class="flex min-w-0 flex-1 flex-col">
					<span class="text-[13px]">Speed</span>
					<span class="text-xs text-faint">km/h, from the GPS</span>
				</div>
				<Switch
					checked={speedShown}
					label="Speed"
					disabled={!canWrite || Boolean(config.result?.code[hidden])}
					onchange={(shown) =>
						void (shown ? config.removeId(hidden, 'speed') : config.addId(hidden, 'speed'))}
				/>
			</div>

			{#if valuesCode}
				<CodeNote
					text="Your own values are in code:"
					code={valuesCode.code}
					line={valuesCode.line}
				/>
			{:else}
				{#each own as value, index (`${index}:${value.line}`)}
					{#if value.asCode}
						<CodeNote text="Written as code:" code={value.asCode} line={value.line} />
					{:else}
						{@const id = String(value.values.id ?? '')}
						{@const key = `${values}[${index}]`}
						<div class="flex flex-col gap-2 rounded-control border border-line bg-tint p-2">
							<div class="flex items-center gap-1">
								<TextField
									class="min-w-0 flex-1"
									value={String(value.values.label ?? '')}
									label="What the driver reads"
									onchange={(label) => {
										if (label.trim()) void config.set(`${key}.label`, label.trim());
									}}
								/>
								<Button
									variant="ghost-muted"
									size="icon-sm"
									label="Take it out"
									disabled={!canWrite}
									onclick={() => void config.remove(values, index)}
								>
									<X />
								</Button>
							</div>
							<div class="grid grid-cols-3 gap-1.5">
								<label class="flex min-w-0 flex-col gap-1">
									<span class="text-xs text-faint">Unit</span>
									<TextField
										value={String(value.values.unit ?? '')}
										placeholder="None"
										label="Unit"
										onchange={(unit) => void config.set(`${key}.unit`, unit.trim())}
									/>
								</label>
								<label class="flex min-w-0 flex-col gap-1">
									<span class="text-xs text-faint">Decimals</span>
									<NumberField
										value={Number(value.values.decimals ?? 0)}
										integer
										min={0}
										max={6}
										label="Decimals"
										disabled={!canWrite}
										onchange={(decimals) => void config.set(`${key}.decimals`, decimals ?? 0)}
									/>
								</label>
								<label class="flex min-w-0 flex-col gap-1">
									<span class="text-xs text-faint">Order</span>
									<NumberField
										value={Number(value.values.order ?? 100)}
										integer
										label="Order"
										disabled={!canWrite}
										onchange={(order) => void config.set(`${key}.order`, order ?? 100)}
									/>
								</label>
							</div>
							<div class="flex min-h-6 items-center gap-1.5 text-xs text-faint">
								{#if value.code.value}
									<span class="min-w-0 flex-1 truncate" title={value.code.value}
										>Your code works out its number.</span
									>
								{:else}
									<span class="min-w-0 flex-1 truncate">
										Report it in code as <code class="font-mono text-muted">'{id}'</code>
									</span>
									<Button
										variant="ghost-muted"
										size="sm"
										class="h-6! px-1.5! text-xs"
										label="Copies the line your code reports its number with"
										onclick={() => void copyReport(id)}
									>
										<Copy class="size-3!" />
										{copied === id ? 'Copied' : 'Copy'}
									</Button>
								{/if}
							</div>
						</div>
					{/if}
				{/each}
				<AddField
					placeholder="A new value, like Engine speed"
					label="Add a value"
					disabled={!canWrite}
					onadd={(label) => void config.add(values, { id: idFor(label), label })}
				/>
				<p class="text-xs text-faint">
					Smaller orders come first in the list the driver picks from. Your app reports each number
					with SmartifyOsInfoDisplay.reportReading.
				</p>
			{/if}
		</div>
	</Fold>

	<Fold id="infoDisplay.views" title="What a tap goes through">
		<div class="flex flex-col gap-2">
			{#if viewsCode}
				<CodeNote text="These are in code:" code={viewsCode.code} line={viewsCode.line} />
			{:else}
				{@const list = config.elements(views)}
				{#each list as view, index (`${index}:${view.line}`)}
					{#if view.asCode}
						<CodeNote text="Written as code:" code={view.asCode} line={view.line} />
					{:else}
						{@const key = `${views}[${index}]`}
						{@const big = String(view.values.big ?? 'speed')}
						{@const small = view.values.small}
						<div class="flex flex-col gap-1.5 rounded-control border border-line bg-tint p-2">
							<div class="flex items-center gap-1">
								<span class="flex-1 text-xs font-medium text-faint">
									{index === 0 ? 'First' : `Tap ${index}`}
								</span>
								<Button
									variant="ghost-muted"
									size="icon-sm"
									class="size-6! [&_svg]:size-3.5!"
									label="Earlier"
									disabled={!canWrite || index === 0}
									onclick={() => void config.move(views, index, index - 1)}
								>
									<ArrowUp />
								</Button>
								<Button
									variant="ghost-muted"
									size="icon-sm"
									class="size-6! [&_svg]:size-3.5!"
									label="Later"
									disabled={!canWrite || index === list.length - 1}
									onclick={() => void config.move(views, index, index + 1)}
								>
									<ArrowDown />
								</Button>
								<Button
									variant="ghost-muted"
									size="icon-sm"
									class="size-6! [&_svg]:size-3.5!"
									label="Take it out"
									disabled={!canWrite}
									onclick={() => void config.remove(views, index)}
								>
									<X />
								</Button>
							</div>
							<div class="grid grid-cols-2 gap-1.5">
								<label class="flex min-w-0 flex-col gap-1">
									<span class="text-xs text-faint">Big</span>
									<Select
										class="w-full"
										options={withCurrent(big)}
										bind:value={() => big, (next) => void config.set(`${key}.big`, next)}
									/>
								</label>
								<label class="flex min-w-0 flex-col gap-1">
									<span class="text-xs text-faint">Small, under it</span>
									<Select
										class="w-full"
										options={[
											{ value: nothing, label: 'Nothing' },
											...withCurrent(String(small ?? ''))
										]}
										bind:value={
											() => (typeof small === 'string' ? small : nothing),
											(next) =>
												void (next === nothing
													? config.unset(`${key}.small`)
													: config.set(`${key}.small`, next))
										}
									/>
								</label>
							</div>
						</div>
					{/if}
				{/each}
				{#if list.length === 0}
					<p class="text-[13px] text-muted">None yet, so it shows only the speed.</p>
				{/if}
				<Button
					variant="ghost-muted"
					size="sm"
					class="justify-start"
					disabled={!canWrite}
					onclick={() =>
						void config.add(views, {
							big: list.length === 0 ? 'speed' : (choices[1]?.value ?? 'speed')
						})}
				>
					<Plus /> Add what the next tap shows
				</Button>
				<p class="text-xs text-faint">
					Holding the display lets the driver make their own, and theirs win from then on.
				</p>
			{/if}
		</div>
	</Fold>
{/if}
