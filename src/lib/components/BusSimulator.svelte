<script lang="ts">
	import ArrowDownRight from '~icons/lucide/arrow-down-right';
	import ArrowUpRight from '~icons/lucide/arrow-up-right';
	import ChevronRight from '~icons/lucide/chevron-right';
	import Eraser from '~icons/lucide/eraser';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import Send from '~icons/lucide/send';
	import type { Snippet } from 'svelte';
	import type { CanFieldInfo, CanNetwork } from '../../../shared/cli.ts';
	import { bus } from '#lib/state/bus.svelte.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import RunAppLink from './RunAppLink.svelte';
	import Button from './ui/Button.svelte';
	import Select from './ui/Select.svelte';
	import Switch from './ui/Switch.svelte';

	/**
	 * Trying out a device on the car's CAN bus without the device: making it say it is there,
	 * sending what it sends into the running app, and seeing what the app sends back.
	 */

	let { name }: { name: string } = $props();

	type Message = CanNetwork['messages'][number];

	const running = $derived(editor.preview.status === 'running');
	const network = $derived(bus.network);
	const device = $derived(network?.devices.find((known) => known.name === name));
	const own = $derived(network?.messages.filter((m) => device && m.from === device.node) ?? []);
	const others = $derived(network?.messages.filter((m) => m.from === null) ?? []);
	let showOthers = $state(false);

	/** What each message's form holds, by message name. Kept while the inspector is open. */
	let values = $state<Record<string, Record<string, unknown>>>({});
	$effect.pre(() => {
		for (const message of network?.messages ?? []) {
			if (values[message.name]) continue;
			values[message.name] = Object.fromEntries(
				message.fields.map((field) => [field.name, initial(field)])
			);
		}
	});

	function initial(field: CanFieldInfo): unknown {
		switch (field.kind) {
			case 'bool':
				return false;
			case 'choice':
				return field.choices[0] ?? '';
			case 'int':
			case 'number':
				return Math.min(Math.max(0, field.min), field.max);
			case 'float':
				return 0;
		}
	}

	/** `headlightsState` as "Headlights state". */
	function spoken(text: string): string {
		const words = text.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
		return words.charAt(0).toUpperCase() + words.slice(1);
	}

	function shown(value: unknown): string {
		if (typeof value === 'number' && !Number.isInteger(value)) return value.toFixed(2);
		return String(value);
	}

	function time(at: number): string {
		return new Date(at).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}
</script>

{#if !running}
	{#snippet idle()}
		<p class="text-[13px] text-muted">
			Run your car's app to try this device out before it is built: send what it sends, and see what
			your app does. <RunAppLink />
		</p>
	{/snippet}
	{@render section('Try it out', idle)}
{:else if !network}
	{#snippet waiting()}
		{#if bus.problem}
			<p class="text-[13px] text-muted">{bus.problem}</p>
		{:else}
			<p class="flex items-center gap-2 text-[13px] text-muted">
				<LoaderCircle class="size-3.5 animate-spin" /> Asking your car's app
			</p>
		{/if}
	{/snippet}
	{@render section('Try it out', waiting)}
{:else if !device}
	{#snippet missing()}
		<p class="text-[13px] text-muted">
			Your car's app has no device called {name} on its CAN bus. Add it to lib/can.dart to try it out
			here.
		</p>
	{/snippet}
	{@render section('Try it out', missing)}
{:else}
	{#snippet there()}
		<div class="flex items-center gap-3">
			<div class="flex min-w-0 flex-1 flex-col gap-0.5">
				<span class="text-[13px]">Pretend it is connected</span>
				<span class="text-xs text-faint">
					{device.pretending
						? 'Your app sees it as there, as it would in the car.'
						: device.online
							? 'It is connected for real.'
							: 'Your app sees it as not connected.'}
				</span>
			</div>
			<Switch
				checked={device.pretending}
				label="Pretend it is connected"
				onchange={(on) => void bus.pretend(device.node, on)}
			/>
		</div>
	{/snippet}
	{@render section('Try it out', there)}

	{#snippet sends()}
		{#each own as message (message.name)}
			{@render messageForm(message)}
		{:else}
			<p class="text-[13px] text-muted">
				None of the messages in lib/can.dart says it comes from this device. Add
				<code class="font-mono text-xs">from: device</code> to the ones it sends.
			</p>
		{/each}
		{#if others.length > 0}
			<button
				type="button"
				class="flex h-8 items-center gap-1.5 text-left text-[13px] text-muted hover:text-fg"
				onclick={() => (showOthers = !showOthers)}
			>
				<ChevronRight class={['size-4 transition-transform', showOthers && 'rotate-90']} />
				Other messages on the bus ({others.length})
			</button>
			{#if showOthers}
				{#each others as message (message.name)}
					{@render messageForm(message)}
				{/each}
			{/if}
		{/if}
	{/snippet}
	{@render section('What it sends', sends)}

	{#snippet log()}
		{#if bus.log.length === 0}
			<p class="text-[13px] text-muted">
				What you send and what your app sends on the bus shows up here.
			</p>
		{:else}
			<div class="flex flex-col gap-1.5">
				{#each bus.log.slice(0, 30) as entry (entry.key)}
					<div class="flex items-start gap-2">
						{#if entry.direction === 'in'}
							<span title="You sent this to your app"
								><ArrowDownRight class="mt-0.5 size-3.5 shrink-0 text-primary" /></span
							>
						{:else}
							<span title="Your app sent this"
								><ArrowUpRight class="mt-0.5 size-3.5 shrink-0 text-good" /></span
							>
						{/if}
						<div class="flex min-w-0 flex-1 flex-col">
							<span class="truncate text-[13px]">{spoken(entry.message)}</span>
							<span class="font-mono text-xs break-all text-faint">
								{Object.entries(entry.values)
									.map(([key, value]) => `${key} ${shown(value)}`)
									.join(', ') || 'nothing in it'}
							</span>
						</div>
						<span class="shrink-0 font-mono text-xs text-faint">{time(entry.at)}</span>
					</div>
				{/each}
			</div>
		{/if}
	{/snippet}
	{@render section('On the bus', log, logActions)}
{/if}

{#snippet logActions()}
	{#if bus.log.length > 0}
		<Button variant="ghost-muted" size="icon-sm" label="Clear" onclick={() => bus.clearLog()}>
			<Eraser />
		</Button>
	{/if}
{/snippet}

{#snippet messageForm(message: Message)}
	{@const form = values[message.name]}
	<div class="flex flex-col gap-2 rounded-lg border border-line bg-tint p-2.5">
		<div class="flex items-center gap-2">
			<span class="min-w-0 flex-1 truncate text-[13px] font-medium">{spoken(message.name)}</span>
			<span class="font-mono text-xs text-faint">0x{message.id.toString(16)}</span>
		</div>
		{#if form}
			{#each message.fields as field (field.name)}
				<div class="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3">
					<span class="truncate text-[13px] text-muted" title={field.name}
						>{spoken(field.name)}</span
					>
					{#if field.kind === 'bool'}
						<div class="flex h-8 items-center">
							<Switch
								label={spoken(field.name)}
								checked={form[field.name] === true}
								onchange={(on) => (form[field.name] = on)}
							/>
						</div>
					{:else if field.kind === 'choice'}
						<Select
							class="w-full"
							options={field.choices.map((choice) => ({ value: choice, label: choice }))}
							bind:value={() => String(form[field.name]), (choice) => (form[field.name] = choice)}
						/>
					{:else}
						<input
							type="number"
							min={field.kind === 'float' ? undefined : field.min}
							max={field.kind === 'float' ? undefined : field.max}
							step={field.kind === 'number' ? field.step : field.kind === 'int' ? 1 : 'any'}
							aria-label={spoken(field.name)}
							class="h-8 min-w-0 rounded-control border border-input bg-tint px-2.5 font-mono text-[13px] outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/25"
							bind:value={
								() => form[field.name] as number, (value) => (form[field.name] = value ?? 0)
							}
						/>
					{/if}
				</div>
			{/each}
		{/if}
		<Button
			variant="outline"
			size="sm"
			class="self-start"
			onclick={() => void bus.send(message.name, $state.snapshot(form) ?? {})}
		>
			<Send /> Send it to your app
		</Button>
	</div>
{/snippet}

{#snippet section(title: string, children: Snippet, actions?: Snippet)}
	<section class="flex flex-col gap-2">
		<div class="flex h-5 items-center justify-between">
			<h3 class="text-xs font-medium text-faint">{title}</h3>
			{@render actions?.()}
		</div>
		{@render children()}
	</section>
{/snippet}
