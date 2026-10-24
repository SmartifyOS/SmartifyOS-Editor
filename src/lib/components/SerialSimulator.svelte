<script lang="ts">
	import ArrowDownRight from '~icons/lucide/arrow-down-right';
	import ArrowUpRight from '~icons/lucide/arrow-up-right';
	import Eraser from '~icons/lucide/eraser';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import Send from '~icons/lucide/send';
	import type { Snippet } from 'svelte';
	import { editor } from '#lib/state/editor.svelte.ts';
	import { serial } from '#lib/state/serial.svelte.ts';
	import RunAppLink from './RunAppLink.svelte';
	import Button from './ui/Button.svelte';
	import NumberField from './ui/NumberField.svelte';
	import Switch from './ui/Switch.svelte';

	/**
	 * Trying out a board on a USB cable without the board: making it count as plugged in,
	 * sending what it prints into the running app, and seeing what the app sends back.
	 */

	let { name }: { name: string } = $props();

	const running = $derived(editor.preview.status === 'running');
	const board = $derived(serial.board(name));
	const log = $derived(serial.log.filter((entry) => entry.device === name).slice(0, 30));

	/** What each value's field holds, by its name. Kept while the inspector is open. */
	let values = $state<Record<string, number>>({});
	$effect.pre(() => {
		for (const value of board?.values ?? []) {
			values[value] ??= board?.last[value] ?? 0;
		}
	});

	let line = $state('');

	function sendLine() {
		const text = line.trim();
		if (!text) return;
		void serial.send(name, text);
		line = '';
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
			Run your car's app to try this board out before it is plugged in: send what it prints, and see
			what your app sends it. <RunAppLink />
		</p>
	{/snippet}
	{@render section('Try it out', idle)}
{:else if !serial.boards}
	{#snippet waiting()}
		{#if serial.problem}
			<p class="text-[13px] text-muted">{serial.problem}</p>
		{:else}
			<p class="flex items-center gap-2 text-[13px] text-muted">
				<LoaderCircle class="size-3.5 animate-spin" /> Asking your car's app
			</p>
		{/if}
	{/snippet}
	{@render section('Try it out', waiting)}
{:else if !board}
	{#snippet missing()}
		<p class="text-[13px] text-muted">
			Your running app has no board called {name}. Once it is in the SerialConfig your app hands
			SmartifyOS, a restart of your app picks it up.
		</p>
	{/snippet}
	{@render section('Try it out', missing)}
{:else}
	{#snippet there()}
		<div class="flex items-center gap-3">
			<div class="flex min-w-0 flex-1 flex-col gap-0.5">
				<span class="text-[13px]">Pretend it is plugged in</span>
				<span class="text-xs text-faint">
					{board.pretending
						? 'Your app sees it as plugged in, and what it sends goes through.'
						: board.port
							? 'It is plugged in for real.'
							: 'Your app sees it as not plugged in, and sends it nothing.'}
				</span>
			</div>
			<Switch
				checked={board.pretending}
				disabled={Boolean(board.port)}
				label="Pretend it is plugged in"
				onchange={(on) => void serial.pretend(name, on)}
			/>
		</div>
	{/snippet}
	{@render section('Try it out', there)}

	{#snippet prints()}
		{#each board.values as value (value)}
			<div class="grid grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-x-2">
				<span class="truncate font-mono text-[13px] text-muted" title={value}>{value}</span>
				<NumberField
					label={value}
					value={values[value] ?? 0}
					onchange={(number) => (values[value] = number ?? 0)}
				/>
				<Button
					variant="outline"
					size="icon-sm"
					label={`Send ${value}`}
					onclick={() => void serial.send(name, `${value}:${values[value] ?? 0}`)}
				>
					<Send />
				</Button>
			</div>
		{:else}
			<p class="text-[13px] text-muted">
				Your app reads no values from it yet. It reads one with
				<code class="font-mono text-xs">SmartifyOsSerial.values({name}, 'oil')</code>, and the board
				prints it as <code class="font-mono text-xs">oil:92</code>.
			</p>
		{/each}
		<form
			class="flex min-w-0 items-center gap-1.5"
			onsubmit={(event) => {
				event.preventDefault();
				sendLine();
			}}
		>
			<input
				bind:value={line}
				placeholder="Any line, like next"
				aria-label="A line it prints"
				class="h-8 min-w-0 flex-1 rounded-control border border-input bg-tint px-2.5 font-mono text-[13px] outline-none placeholder:font-sans placeholder:text-faint focus:border-primary/70 focus:ring-2 focus:ring-primary/25"
			/>
			<Button variant="outline" size="sm" type="submit" disabled={!line.trim()}>
				<Send /> Send
			</Button>
		</form>
	{/snippet}
	{@render section('What it prints', prints)}

	{#snippet logView()}
		{#if log.length === 0}
			<p class="text-[13px] text-muted">
				What you send and what your app sends to the board shows up here.
			</p>
		{:else}
			<div class="flex flex-col gap-1.5">
				{#each log as entry (entry.key)}
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
						<span class="min-w-0 flex-1 font-mono text-[12.5px] break-all">{entry.line}</span>
						<span class="shrink-0 font-mono text-xs text-faint">{time(entry.at)}</span>
					</div>
				{/each}
			</div>
		{/if}
	{/snippet}
	{@render section('On the cable', logView, logActions)}
{/if}

{#snippet logActions()}
	{#if log.length > 0}
		<Button variant="ghost-muted" size="icon-sm" label="Clear" onclick={() => serial.clearLog()}>
			<Eraser />
		</Button>
	{/if}
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
