<script lang="ts" module>
	/** Every time zone there is, for picking one by name. */
	const timeZones: string[] = (() => {
		try {
			return Intl.supportedValuesOf('timeZone');
		} catch {
			return [];
		}
	})();
</script>

<script lang="ts">
	import Undo from '~icons/lucide/undo-2';
	import X from '~icons/lucide/x';
	import VsCode from '~icons/logos/visual-studio-code';
	import type { ConfigField, ConfigValue } from '../../../../shared/cli.ts';
	import { soundNames, type FieldSpec } from '#lib/setup.ts';
	import { config, type SettingsStore } from '#lib/state/config.svelte.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import Button from '../ui/Button.svelte';
	import ColorField from '../ui/ColorField.svelte';
	import NumberField from '../ui/NumberField.svelte';
	import Select from '../ui/Select.svelte';
	import Slider from '../ui/Slider.svelte';
	import Switch from '../ui/Switch.svelte';
	import TextField from '../ui/TextField.svelte';

	/**
	 * One setting of a setup page, with the control its type wants: a switch, a number, a
	 * slider, a choice, a colour. A setting that is written shows a button putting SmartifyOS's
	 * own default back, and one written as code is only shown, with a way to it in VS Code.
	 */
	let {
		spec,
		disabled = false,
		store = config
	}: {
		spec: FieldSpec;
		disabled?: boolean;
		/** Whose setting it is, the car's own unless an extension's. */
		store?: SettingsStore;
	} = $props();

	const field = $derived(store.field(spec.key));
	const value = $derived(store.value(spec.key));
	const isSet = $derived(store.isSet(spec.key));
	const code = $derived(store.codeOf(spec.key));
	const off = $derived(disabled || editor.cli?.found !== true);

	/** Stands for nothing in a select, which has to have a string for everything. */
	const none = '\u0000none';

	const set = (next: ConfigValue) => void store.set(spec.key, next);

	function defaultText(field: ConfigField): string {
		const fallback = field.default;
		if (field.defaultCode) return field.defaultCode;
		if (fallback === null || (Array.isArray(fallback) && fallback.length === 0)) return 'nothing';
		if (typeof fallback === 'boolean') return fallback ? 'on' : 'off';
		if (field.type === 'duration') return `${(fallback as number) / 1000} s`;
		if (spec.percent) return `${Math.round((fallback as number) * 100)} %`;
		if (spec.options) {
			return spec.options.find((option) => option.value === fallback)?.label ?? String(fallback);
		}
		if (spec.sound) return soundNames[fallback as string] ?? String(fallback);
		if (typeof fallback === 'object' && 'width' in fallback) {
			return `${fallback.width} × ${fallback.height}`;
		}
		return `${fallback}${spec.unit ? ` ${spec.unit}` : ''}`;
	}

	/** The value of a sound in its select: one of SmartifyOS's, none, or a file of the app's. */
	const soundOptions = $derived.by(() => {
		const options = [
			...Object.entries(soundNames).map(([id, label]) => ({ value: id, label })),
			{ value: none, label: 'No sound' }
		];
		if (typeof value === 'string' && !(value in soundNames)) {
			options.push({ value, label: value.split('/').pop() ?? value });
		}
		return options;
	});

	/** Whether a long explanation is shown whole. */
	let expanded = $state(false);

	/**
	 * The first sentence of an explanation too long to show whole, like an extension's doc
	 * comment, or undefined when it is short enough.
	 */
	function shortened(text: string): string | undefined {
		if (text.length <= 140 && !text.includes('\n')) return undefined;
		const first = /^[\s\S]+?[.!?](?=\s|$)/.exec(text)?.[0] ?? text.slice(0, 120);
		return first.length < text.length ? first : undefined;
	}

	/** A slider's value while it is being dragged, shown in the number next to it. */
	let dragging = $state<number | undefined>();
</script>

{#if field}
	{#if field.type === 'bool' && !spec.automatic}
		<div class="group flex flex-col gap-0.5">
			<div class="flex min-h-8 items-center gap-2">
				<span class="min-w-0 flex-1 text-[13px]">{spec.label}</span>
				{@render reset()}
				{#if code}
					{@render inCode(code)}
				{:else}
					<Switch
						checked={value === true}
						label={spec.label}
						disabled={off}
						onchange={(checked) => set(checked)}
					/>
				{/if}
			</div>
			{@render hint()}
		</div>
	{:else if field.type === 'ids'}
		{@const ids = (value as string[] | null) ?? []}
		<div class="group flex flex-col gap-1.5">
			<div class="flex min-h-6 items-center gap-1">
				<span class={['min-w-0 text-[13px] leading-tight', isSet ? 'text-fg' : 'text-muted']}
					>{spec.label}</span
				>
				{@render reset()}
			</div>
			{#if code}
				{@render inCode(code)}
			{:else}
				{#each ids as id (id)}
					<div
						class="flex h-8 items-center gap-2 rounded-control border border-line bg-tint pr-0.5 pl-2.5"
					>
						<span class="min-w-0 flex-1 truncate text-[13px]">{id}</span>
						<Button
							variant="ghost-muted"
							size="icon-sm"
							class="size-7!"
							label={`Take ${id} out`}
							disabled={off}
							onclick={() => void store.removeId(spec.key, id)}
						>
							<X />
						</Button>
					</div>
				{/each}
				{#key ids.length}
					<TextField
						value=""
						placeholder="Add one"
						label={`Add to ${spec.label}`}
						onchange={(text) => {
							if (text.trim()) void store.addId(spec.key, text.trim());
						}}
					/>
				{/key}
			{/if}
			{@render hint()}
		</div>
	{:else}
		<div class="group flex flex-col gap-1">
			<div class="grid grid-cols-[minmax(0,10fr)_minmax(0,13fr)] items-center gap-x-3">
				<div class="flex min-w-0 items-center gap-1">
					<!-- Brighter once it is written, rather than SmartifyOS's own default. -->
					<span class={['min-w-0 text-[13px] leading-tight', isSet ? 'text-fg' : 'text-muted']}
						>{spec.label}</span
					>
					{@render reset()}
				</div>
				{#if code}
					{@render inCode(code)}
				{:else}
					{@render control(field)}
				{/if}
			</div>
			{@render hint()}
		</div>
	{/if}
{/if}

{#snippet hint()}
	{#if spec.hint}
		{@const short = shortened(spec.hint)}
		<p class="text-xs whitespace-pre-line text-faint">
			{short && !expanded ? short : spec.hint}
			{#if short}
				<button
					type="button"
					class="cursor-default text-muted underline decoration-line-strong underline-offset-2 hover:text-fg"
					onclick={() => (expanded = !expanded)}>{expanded ? 'Less' : 'More'}</button
				>
			{/if}
		</p>
	{/if}
{/snippet}

{#snippet reset()}
	{#if isSet && !field?.required && field}
		<Button
			variant="ghost-muted"
			size="icon-sm"
			class="size-6! shrink-0 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 [&_svg]:size-3.5!"
			label={`Back to the default, ${defaultText(field)}`}
			disabled={off}
			onclick={() => void store.unset(spec.key)}
		>
			<Undo />
		</Button>
	{/if}
{/snippet}

{#snippet inCode(written: { code: string; line: number })}
	<button
		type="button"
		class="flex h-8 min-w-0 cursor-default items-center gap-2 rounded-control border border-dashed border-input px-2.5 text-left hover:bg-hover"
		title="Written as code, open it in VS Code"
		onclick={() => editor.openInVsCode(undefined, 'lib/main.dart', written.line)}
	>
		<span class="min-w-0 flex-1 truncate font-mono text-xs text-muted">{written.code}</span>
		<VsCode class="size-3.5 shrink-0" />
	</button>
{/snippet}

{#snippet control(field: ConfigField)}
	{#if spec.automatic}
		<Select
			class="w-full"
			options={[
				{ value: none, label: spec.automatic.label },
				{ value: 'on', label: spec.automatic.on },
				{ value: 'off', label: spec.automatic.off }
			]}
			bind:value={
				() => (value === null ? none : value ? 'on' : 'off'),
				(next) => (next === none ? void store.unset(spec.key) : set(next === 'on'))
			}
		/>
	{:else if spec.sound}
		<Select
			class="w-full"
			options={soundOptions}
			bind:value={
				() => (value === null ? none : String(value)), (next) => set(next === none ? null : next)
			}
		/>
	{:else if field.type === 'enum'}
		<Select
			class="w-full"
			options={spec.options ?? (field.values ?? []).map((name) => ({ value: name, label: name }))}
			bind:value={() => String(value), (next) => set(next)}
		/>
	{:else if field.type === 'duration'}
		<NumberField
			value={(value as number) / 1000}
			unit={spec.unit ?? 's'}
			min={0}
			step={0.5}
			label={spec.label}
			disabled={off}
			onchange={(seconds) => set(Math.round((seconds ?? 0) * 1000))}
		/>
	{:else if (field.type === 'number' || field.type === 'integer') && spec.percent}
		<div class="flex items-center gap-2">
			<Slider
				class="min-w-0 flex-1"
				min={0}
				max={1}
				step={0.05}
				value={(value as number) ?? 1}
				label={spec.label}
				disabled={off}
				oninput={(next) => {
					dragging = next;
					store.preview?.(spec.key, next);
				}}
				onchange={(next) => {
					dragging = undefined;
					set(next);
				}}
			/>
			<span class="w-9 text-right text-xs text-muted tabular-nums"
				>{Math.round((dragging ?? (value as number) ?? 1) * 100)}%</span
			>
		</div>
	{:else if (field.type === 'number' || field.type === 'integer') && spec.range}
		<div class="flex items-center gap-2">
			<Slider
				class="min-w-0 flex-1"
				min={spec.range.min}
				max={spec.range.max}
				step={spec.range.step ?? 0.01}
				value={(value as number) ?? spec.range.min}
				label={spec.label}
				disabled={off}
				oninput={(next) => {
					dragging = next;
					store.preview?.(spec.key, next);
				}}
				onchange={(next) => {
					dragging = undefined;
					set(next);
				}}
			/>
			<NumberField
				class="w-[68px] shrink-0"
				value={dragging ?? (value as number | null)}
				unit={spec.unit}
				step={spec.range.step ?? 0.1}
				integer={field.type === 'integer'}
				label={spec.label}
				disabled={off}
				onchange={(next) => set(next ?? field.default)}
			/>
		</div>
	{:else if field.type === 'number' || field.type === 'integer'}
		<NumberField
			value={value as number | null}
			unit={spec.unit}
			integer={field.type === 'integer'}
			step={field.type === 'integer' ? 1 : 0.1}
			optional={field.default === null}
			placeholder={field.default === null ? (spec.placeholder ?? 'Not set') : undefined}
			label={spec.label}
			disabled={off}
			onchange={(next) => set(next ?? field.default)}
		/>
	{:else if field.type === 'color'}
		{#if field.nullable}
			<div class="flex items-center gap-2">
				<Switch
					checked={value !== null}
					label={spec.label}
					disabled={off}
					onchange={(on) => set(on ? field.default : null)}
				/>
				{#if value !== null}
					<ColorField
						class="min-w-0 flex-1"
						value={value as string}
						label={spec.label}
						disabled={off}
						onchange={set}
					/>
				{/if}
			</div>
		{:else}
			<ColorField value={value as string} label={spec.label} disabled={off} onchange={set} />
		{/if}
	{:else if field.type === 'size'}
		{@const size = value as { width: number; height: number }}
		<div class="flex items-center gap-1.5">
			<NumberField
				value={size.width}
				integer
				min={1}
				label="Width"
				disabled={off}
				onchange={(width) => set({ ...size, width: width ?? size.width })}
			/>
			<span class="text-xs text-faint">×</span>
			<NumberField
				value={size.height}
				integer
				min={1}
				label="Height"
				disabled={off}
				onchange={(height) => set({ ...size, height: height ?? size.height })}
			/>
		</div>
	{:else if field.type === 'string' && spec.key === 'dateTime.timeZone' && timeZones.length > 0}
		<Select
			class="w-full"
			options={[
				{ value: none, label: "The computer's own" },
				...(typeof value === 'string' && !timeZones.includes(value)
					? [{ value, label: value }]
					: []),
				...timeZones.map((zone) => ({ value: zone, label: zone.replaceAll('_', ' ') }))
			]}
			bind:value={
				() => (value === null ? none : String(value)),
				(next) => (next === none ? void store.unset(spec.key) : set(next))
			}
		/>
	{:else}
		<TextField
			value={isSet ? ((value as string | null) ?? '') : ''}
			placeholder={spec.placeholder ?? (field.default === null ? 'Not set' : String(field.default))}
			label={spec.label}
			onchange={(text) => {
				const next = text.trim();
				if (next) set(next);
				else void store.unset(spec.key);
			}}
		/>
	{/if}
{/snippet}
