<script lang="ts">
	import Cpu from '~icons/lucide/cpu';
	import FileCode from '~icons/lucide/file-code';
	import HardDriveDownload from '~icons/lucide/hard-drive-download';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import Usb from '~icons/lucide/usb';
	import VsCode from '~icons/logos/visual-studio-code';
	import type { Component } from 'svelte';
	import { commands } from '#lib/commands.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import { serial } from '#lib/state/serial.svelte.ts';
	import InspectorHeading from './InspectorHeading.svelte';
	import InspectorSection from './InspectorSection.svelte';
	import SerialSimulator from './SerialSimulator.svelte';
	import Button from './ui/Button.svelte';
	import Select from './ui/Select.svelte';
	import TextField from './ui/TextField.svelte';

	/**
	 * A board on a USB cable in the inspector: what the driver reads for it and how fast it
	 * talks (both changed with the CLI's `device edit`, the speed in its sketch too), its
	 * program, and trying it out in the running app. Which port it is on is never a setting:
	 * the car finds it by itself, by what the board says it is.
	 */

	let { name }: { name: string } = $props();

	const project = $derived(editor.project);
	const canRun = $derived(!editor.busy && editor.cli?.found === true);
	/** Where the car's app defines it, unknown for one only the running app has (an extension's). */
	const defined = $derived(project?.usbDevices.find((board) => board.name === name));
	const program = $derived(
		project?.devices.find((device) => device.name === name && device.connection === 'usb')
	);
	const running = $derived(serial.board(name));
	const title = $derived(defined?.title ?? running?.title ?? name);
	const baudRate = $derived(defined?.baudRate ?? running?.baudRate ?? 115200);

	/** The speeds an Arduino sketch usually talks at, and this board's when it is another. */
	const speeds = $derived(
		[...new Set([9600, 19200, 38400, 57600, 115200, baudRate])]
			.sort((a, b) => a - b)
			.map((speed) => ({ value: String(speed), label: `${speed} baud` }))
	);

	let problem = $state<string | undefined>();

	async function change(update: { title?: string; baudRate?: number }) {
		problem = await serial.edit(name, update);
	}

	const run = (spec: Parameters<typeof editor.runTask>[0]) => () => void editor.runTask(spec);
</script>

<InspectorHeading {title} icon={Usb} detail={`${name}, on a USB cable`} />

{#if defined}
	<InspectorSection>
		<div class="field-grid">
			<span class="text-[13px] text-muted">Name</span>
			<TextField
				value={defined.title}
				label="What the driver reads"
				onchange={(text) =>
					text.trim() && text.trim() !== defined.title && change({ title: text.trim() })}
			/>
			<span class="text-[13px] text-muted">Speed</span>
			<Select
				class="w-full"
				options={speeds}
				bind:value={
					() => String(defined.baudRate),
					(speed) => Number(speed) !== defined.baudRate && void change({ baudRate: Number(speed) })
				}
			/>
		</div>
		<p class="text-xs text-faint">
			The speed is the one in <code class="font-mono">Serial.begin</code> in its program, which changes
			with it.
		</p>
		{#if serial.busy > 0}
			<p class="flex items-center gap-2 text-[13px] text-muted">
				<LoaderCircle class="size-3.5 animate-spin" /> Changing it in your app
			</p>
		{:else if problem}
			<p class="text-[13px] text-bad">{problem}</p>
		{/if}
	</InspectorSection>
{/if}

{#if running}
	<dl class="field-grid text-[13px]">
		<dt class="self-start text-muted">In your app now</dt>
		<dd>
			{#if running.pretending}
				Plugged in, pretend
			{:else if running.state === 'connected'}
				Plugged in, on <span class="font-mono text-[12.5px] break-all">{running.port}</span>
			{:else if running.state === 'failed'}
				{running.problem ?? 'Found, but it could not be opened'}
			{:else}
				Not plugged into this computer
			{/if}
		</dd>
	</dl>
{/if}

<InspectorSection title="Its program">
	{#if program}
		{@render action(
			VsCode,
			'Open its program in VS Code',
			() => editor.openInVsCode(program.folder, 'src/main.cpp'),
			false
		)}
		<p class="text-[13px] text-muted">
			Plug the board into this computer to put its program on it (your car's app stops meanwhile).
			Or export it to a USB stick, and the car offers to put it on the board once the stick is in.
		</p>
		{@render action(Usb, 'Put it on its board', run(commands.flashDevice(name)))}
		{@render action(HardDriveDownload, 'Export its firmware', run(commands.exportDevices([name])))}
	{:else}
		<p class="text-[13px] text-muted">It has no program yet. Make one to put it on the board.</p>
		{@render action(Cpu, 'Make its program', run(commands.createDevice(name, true)))}
	{/if}
	{#if defined}
		{@render action(
			FileCode,
			'Open where your app defines it',
			() => editor.openInVsCode(undefined, defined.file, defined.line),
			false
		)}
	{/if}
</InspectorSection>

<SerialSimulator {name} />

{#snippet action(Icon: Component, label: string, onclick: () => void, runsCli = true)}
	<Button
		variant="outline"
		size="sm"
		class="w-full justify-start"
		disabled={runsCli && !canRun}
		{onclick}
	>
		<Icon />
		{label}
	</Button>
{/snippet}
