<script lang="ts">
	import ArrowLeft from '~icons/lucide/arrow-left';
	import ArrowRight from '~icons/lucide/arrow-right';
	import BookOpen from '~icons/lucide/book-open';
	import Box from '~icons/lucide/box';
	import Check from '~icons/lucide/check';
	import CircleAlert from '~icons/lucide/circle-alert';
	import CircleCheck from '~icons/lucide/circle-check';
	import CircleOff from '~icons/lucide/circle-off';
	import CircleX from '~icons/lucide/circle-x';
	import ImageIcon from '~icons/lucide/image';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import PenTool from '~icons/lucide/pen-tool';
	import Sparkles from '~icons/lucide/sparkles';
	import TriangleAlert from '~icons/lucide/triangle-alert';
	import X from '~icons/lucide/x';
	import type { Component } from 'svelte';
	import type { CliEvent } from '../../../shared/cli.ts';
	import { coversViewport } from '#lib/attachments.ts';
	import { layouts } from '#lib/look.ts';
	import { editor, type Problem } from '#lib/state/editor.svelte.ts';
	import Button from './ui/Button.svelte';
	import Select from './ui/Select.svelte';

	/**
	 * Creates a new car's app with `smartify-os create`. The CLI asks its questions one line
	 * at a time; here they are a few pages with a screenshot of every choice, and the answers
	 * go to the CLI as flags. `--dry-run` checks them before moving on, so a name the CLI
	 * refuses is said on the page it was typed on.
	 */

	type From = 'minimal' | 'miata';
	type Side = 'left' | 'right';
	type Bar = 'info-display' | 'dock' | 'both';
	type Look = 'none' | 'model-3d' | 'drawing' | 'picture';
	type StepId = 'start' | 'car' | 'layout' | 'side' | 'bar' | 'more';

	// Screenshots of the Miata app in every layout, driver's side and bar, named
	// `<layout>-<side>-<bar>.webp`, made by scripts/make-screenshots.ts.
	const shots = import.meta.glob<string>('../assets/new-car/*.webp', {
		eager: true,
		import: 'default'
	});
	const shotBar: Record<Bar, string> = { 'info-display': 'info', dock: 'dock', both: 'both' };
	function shot(layout: string, side: Side, bar: Bar): string | undefined {
		return shots[`../assets/new-car/${layout}-${side}-${shotBar[bar]}.webp`];
	}

	const sides: { id: Side; label: string; hint: string }[] = [
		{ id: 'left', label: 'Left', hint: 'Most of the world' },
		{ id: 'right', label: 'Right', hint: 'The UK, Ireland, Japan, Australia, India and others' }
	];
	const bars: { id: Bar; label: string; hint: string }[] = [
		{
			id: 'info-display',
			label: 'The info display',
			hint: 'The speed, and whatever else your car reports'
		},
		{ id: 'dock', label: 'A dock', hint: 'The apps the driver uses most' },
		{ id: 'both', label: 'Both', hint: 'The dock and the info display side by side' }
	];
	const looks: { id: Look; label: string; hint: string; icon: Component; extensions: string[] }[] =
		[
			{ id: 'none', label: 'Not now', hint: 'Add one later', icon: CircleOff, extensions: [] },
			{ id: 'model-3d', label: 'A 3D model', hint: 'A .glb file', icon: Box, extensions: ['glb'] },
			{
				id: 'drawing',
				label: 'A drawing',
				hint: 'An .svg, seen from above',
				icon: PenTool,
				extensions: ['svg']
			},
			{
				id: 'picture',
				label: 'A picture',
				hint: 'A .png or .jpg',
				icon: ImageIcon,
				extensions: ['png', 'jpg', 'jpeg', 'webp']
			}
		];

	const steps: Record<StepId, { label: string; title: string; description: string }> = {
		start: {
			label: 'Start',
			title: 'What should it start from?',
			description: 'Everything can be changed later, so there is no wrong answer here.'
		},
		car: {
			label: 'Your car',
			title: 'Your car',
			description: 'A name for it, and where its folder goes on this computer.'
		},
		layout: {
			label: 'Layout',
			title: 'How should the screen be laid out?',
			description: 'The driver can switch to any of these in Settings at any time.'
		},
		side: {
			label: "Driver's side",
			title: 'Which side does the driver sit on?',
			description: 'Everything the driver reaches for goes on their side of the screen.'
		},
		bar: {
			label: 'The bar',
			title: 'What goes in the bar along the edge?',
			description: 'It stays the same in every layout.'
		},
		more: {
			label: 'Last details',
			title: 'A few last details',
			description: 'All of these can be changed later too.'
		}
	};

	const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	const zones = [...new Set([localZone, ...Intl.supportedValuesOf('timeZone')])]
		.sort()
		.map((zone) => ({ value: zone, label: zone.replaceAll('_', ' ') }));

	let from = $state<From>('minimal');
	let name = $state('');
	let model = $state('');
	let parent = $state('');
	let layout = $state('classic');
	let side = $state<Side>('left');
	let bar = $state<Bar>('info-display');
	let look = $state<Look>('none');
	let lookFile = $state<string | undefined>();
	let timeZone = $state(localZone);
	let reverseCamera = $state(false);

	let step = $state<StepId>('start');
	let checking = $state(false);
	let problem = $state<Problem | undefined>();

	/** Set once the real `create` runs. */
	let creating = $state<
		| { status: 'running'; steps: { id: string; text: string; status: string }[] }
		| { status: 'done'; path: string; name: string; manual: string[]; committed: boolean }
		| { status: 'failed'; problem: Problem }
		| undefined
	>();

	const order = $derived<StepId[]>(
		from === 'miata' ? ['start', 'car'] : ['start', 'car', 'layout', 'side', 'bar', 'more']
	);
	const index = $derived(order.indexOf(step));
	const last = $derived(index === order.length - 1);
	const busy = $derived(checking || creating?.status === 'running');

	void window.smartify.projects.newLocation().then((location) => (parent ||= location));

	function args(dryRun: boolean): string[] {
		const list = ['create', '--yes', `--from=${from}`, `--dir=${parent}`];
		if (from === 'minimal') {
			list.push(`--name=${name.trim()}`);
			if (model.trim()) list.push(`--car=${model.trim()}`);
			list.push(`--layout=${layout}`, `--driver-side=${side}`, `--bar=${bar}`);
			list.push(`--time-zone=${timeZone}`);
			if (look !== 'none' && lookFile) list.push(`--${look}=${lookFile}`);
			if (reverseCamera) list.push('--reverse-camera');
		}
		if (dryRun) list.push('--dry-run');
		return list;
	}

	/** Asks the CLI whether the answers so far are fine, without creating anything. */
	async function check(): Promise<boolean> {
		checking = true;
		problem = undefined;
		try {
			const result = await editor.runCli(args(true));
			if (!result.ok) problem = { message: result.error.message, hint: result.error.hint };
			return result.ok;
		} catch (error) {
			problem = { message: String(error) };
			return false;
		} finally {
			checking = false;
		}
	}

	async function next() {
		if (busy) return;
		if (step === 'car' && from === 'minimal' && !name.trim()) {
			problem = { message: 'Give your car a name first.' };
			return;
		}
		if (step === 'more' && look !== 'none' && !lookFile) {
			problem = { message: 'Choose the file, or pick "Not now".' };
			return;
		}
		// What the CLI checks is all on these two pages, and checking takes a moment.
		if ((step === 'car' || last) && !(await check())) return;
		if (last) void create();
		else go(order[index + 1] ?? step);
	}

	function go(target: StepId) {
		problem = undefined;
		step = target;
	}

	async function create() {
		creating = { status: 'running', steps: [] };
		const onEvent = (event: CliEvent) => {
			if (event.type !== 'step' || creating?.status !== 'running') return;
			const known = creating.steps.find((line) => line.id === event.id);
			if (known) Object.assign(known, { text: event.text, status: event.status });
			else creating.steps.push({ id: event.id, text: event.text, status: event.status });
		};
		try {
			const result = await editor.runCli(args(false), onEvent);
			if (result.ok) {
				const data = result.data as {
					path: string;
					name: string | null;
					manual?: string[];
					committed?: boolean;
				};
				creating = {
					status: 'done',
					path: data.path,
					name: data.name ?? 'The Miata app',
					manual: data.manual ?? [],
					committed: data.committed !== false
				};
			} else {
				creating = {
					status: 'failed',
					problem: { message: result.error.message, hint: result.error.hint }
				};
			}
		} catch (error) {
			creating = { status: 'failed', problem: { message: String(error) } };
		}
	}

	async function changeFolder() {
		const picked = await window.smartify.files.pickFolder('Where should its folder go?', parent);
		if (picked) parent = picked;
	}

	async function chooseLook(choice: (typeof looks)[number]) {
		look = choice.id;
		lookFile = undefined;
		problem = undefined;
		if (choice.id === 'none') return;
		const picked = await window.smartify.files.pickFile(choice.label, choice.extensions);
		if (picked) lookFile = picked;
	}

	function close() {
		if (creating?.status === 'running') return;
		editor.newCarDialog = false;
	}

	async function openCreated(path: string) {
		editor.newCarDialog = false;
		await editor.open(path);
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') close();
	}

	function fileName(path: string): string {
		return path.split(/[\\/]/).pop() ?? path;
	}
</script>

<svelte:window onkeydown={onKey} />

{#snippet shotCard(
	src: string | undefined,
	label: string,
	hint: string,
	picked: boolean,
	onpick: () => void,
	wide = false
)}
	<button
		type="button"
		aria-pressed={picked}
		class={[
			'group flex flex-col gap-2.5 rounded-xl border p-2 text-left transition-colors',
			picked ? 'border-primary/60 bg-primary/10' : 'border-line bg-tint hover:bg-hover'
		]}
		onclick={onpick}
	>
		<div
			class={[
				'relative grid aspect-[1024/600] w-full place-items-center overflow-hidden rounded-lg bg-black ring-1 ring-white/5',
				picked && 'ring-primary/40'
			]}
		>
			{#if src}
				<img {src} alt="" class="absolute inset-0 size-full object-contain" draggable="false" />
			{/if}
			{#if picked}
				<span
					class="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-primary text-white shadow-float"
				>
					<Check class="size-3.5" />
				</span>
			{/if}
		</div>
		<div class={['flex flex-col px-1 pb-0.5', wide && 'items-center text-center']}>
			<span class="font-medium">{label}</span>
			<span class="text-[13px] text-muted">{hint}</span>
		</div>
	</button>
{/snippet}

<div
	{@attach coversViewport}
	class="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-6 backdrop-blur-[3px]"
	role="dialog"
	aria-modal="true"
	aria-labelledby="new-car-title"
>
	<div
		class="flex h-[min(64rem,100%)] w-full max-w-[100rem] overflow-hidden rounded-2xl shadow-dialog glass"
	>
		<!-- The steps, down the left like an installer's. -->
		<nav class="flex w-52 shrink-0 flex-col gap-1 border-r border-line bg-black/20 p-4">
			<div class="px-2 pt-1 pb-4 text-[13px] font-medium text-muted">Create your car's app</div>
			{#each order as id, position (id)}
				{@const done = creating !== undefined || position < index}
				{@const current = creating === undefined && id === step}
				<button
					type="button"
					disabled={creating !== undefined || busy || position > index}
					class={[
						'flex items-center gap-3 rounded-lg px-2 py-1.5 text-left',
						current ? 'bg-selected text-fg' : 'text-muted enabled:hover:bg-hover',
						position > index && !creating && 'text-faint'
					]}
					onclick={() => go(id)}
				>
					<span
						class={[
							'grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold',
							current
								? 'border-primary bg-primary text-white'
								: done
									? 'border-primary/40 bg-primary/15 text-primary'
									: 'border-line-strong'
						]}
					>
						{#if done}<Check class="size-3.5" />{:else}{position + 1}{/if}
					</span>
					{steps[id].label}
				</button>
			{/each}
		</nav>

		<div class="flex min-w-0 flex-1 flex-col">
			{#if creating}
				<div class="flex flex-1 flex-col items-center justify-center gap-6 overflow-auto p-10">
					{#if creating.status === 'running'}
						<LoaderCircle class="size-9 animate-spin text-primary" />
						<div class="flex flex-col items-center gap-1 text-center">
							<h2 id="new-car-title" class="text-lg font-semibold">
								Creating {from === 'miata' ? 'a copy of the Miata app' : name.trim()}
							</h2>
							<p class="text-muted">This takes a minute or two. Nothing is needed from you.</p>
						</div>
						<ul class="flex w-full max-w-sm flex-col gap-2">
							{#each creating.steps as line (line.id)}
								<li class="flex items-center gap-2.5">
									{#if line.status === 'done'}
										<CircleCheck class="size-4 shrink-0 text-good" />
									{:else if line.status === 'error'}
										<CircleX class="size-4 shrink-0 text-bad" />
									{:else}
										<LoaderCircle class="size-4 shrink-0 animate-spin text-muted" />
									{/if}
									<span class={line.status === 'done' ? 'text-muted' : 'text-fg'}>{line.text}</span>
								</li>
							{/each}
						</ul>
					{:else if creating.status === 'done'}
						{@const path = creating.path}
						<span class="grid size-14 place-items-center rounded-full bg-good/15 text-good">
							<Check class="size-7" />
						</span>
						<div class="flex flex-col items-center gap-1 text-center">
							<h2 id="new-car-title" class="text-lg font-semibold">{creating.name} is ready</h2>
							<p class="selectable text-[13px] text-muted">{creating.path}</p>
						</div>
						{#if creating.manual.length > 0}
							<div class="w-full max-w-md rounded-xl border border-warn/25 bg-warn/[0.07] p-4">
								<div class="flex items-center gap-2 font-medium text-warn">
									<TriangleAlert class="size-4" /> Add these to lib/main.dart yourself
								</div>
								<p class="mt-1 text-[13px] text-muted">
									They could not be written in for you, everything else is set up.
								</p>
								<pre
									class="selectable mt-2.5 overflow-auto rounded-lg border border-line bg-bg px-3 py-2 font-mono text-[12px]">{creating.manual.join(
										'\n'
									)}</pre>
							</div>
						{/if}
						{#if !creating.committed}
							<p class="max-w-md text-center text-[13px] text-muted">
								It could not be made a git repository, so it has no history yet. Everything else is
								ready.
							</p>
						{/if}
						<div class="flex gap-2">
							<Button onclick={close}>Close</Button>
							<!-- svelte-ignore a11y_autofocus -->
							<Button variant="primary" autofocus onclick={() => openCreated(path)}>
								Open it
								<ArrowRight />
							</Button>
						</div>
					{:else}
						<span class="grid size-14 place-items-center rounded-full bg-bad/15 text-bad">
							<X class="size-7" />
						</span>
						<div class="flex max-w-md flex-col items-center gap-1.5 text-center">
							<h2 id="new-car-title" class="text-lg font-semibold">It could not be created</h2>
							<p class="selectable">{creating.problem.message}</p>
							{#if creating.problem.hint}
								<p class="selectable text-[13px] whitespace-pre-line text-muted">
									{creating.problem.hint}
								</p>
							{/if}
						</div>
						<div class="flex gap-2">
							<Button onclick={close}>Close</Button>
							<Button onclick={() => (creating = undefined)}>
								<ArrowLeft /> Back
							</Button>
						</div>
					{/if}
				</div>
			{:else}
				<header class="flex items-start gap-4 px-8 pt-7 pb-5">
					<div class="flex flex-1 flex-col gap-1">
						<h2 id="new-car-title" class="text-lg font-semibold">{steps[step].title}</h2>
						<p class="text-muted">{steps[step].description}</p>
					</div>
					<Button
						variant="ghost-muted"
						size="icon-sm"
						label="Close"
						class="-mt-1 -mr-3"
						onclick={close}
					>
						<X />
					</Button>
				</header>

				<div class="flex-1 overflow-auto px-8 pb-6">
					{#if step === 'start'}
						<div class="grid grid-cols-2 gap-3">
							{@render startCard(
								'minimal',
								Sparkles,
								'A new app, set up for your car',
								'Only what every car needs. You answer a few questions and it is made for your car.',
								true
							)}
							{@render startCard(
								'miata',
								BookOpen,
								'A copy of the Miata app',
								'The example car with everything in it, to learn from. You give it your own car later.',
								false
							)}
						</div>
					{:else if step === 'car'}
						<div class="flex max-w-xl flex-col gap-5">
							{#if from === 'minimal'}
								<label class="flex flex-col gap-1.5">
									<span class="font-medium">What is your car called?</span>
									<!-- svelte-ignore a11y_autofocus -->
									<input
										bind:value={name}
										placeholder="Miata"
										autofocus
										class="h-10 rounded-control border border-input bg-tint px-3 outline-none placeholder:text-faint focus:border-primary/70 focus:ring-2 focus:ring-primary/25"
										onkeydown={(event) => event.key === 'Enter' && next()}
									/>
									<span class="text-[13px] text-muted">
										Phones see this name when they pair with your car.
									</span>
								</label>
								<label class="flex flex-col gap-1.5">
									<span class="font-medium">
										What car is it? <span class="font-normal text-faint">(optional)</span>
									</span>
									<input
										bind:value={model}
										placeholder="Mazda MX-5 NB 1.8"
										class="h-10 rounded-control border border-input bg-tint px-3 outline-none placeholder:text-faint focus:border-primary/70 focus:ring-2 focus:ring-primary/25"
										onkeydown={(event) => event.key === 'Enter' && next()}
									/>
									<span class="text-[13px] text-muted">This shows on the About page.</span>
								</label>
							{/if}
							<div class="flex flex-col gap-1.5">
								<span class="font-medium">Where should its folder go?</span>
								<div class="flex gap-2">
									<div
										class="selectable flex h-10 min-w-0 flex-1 items-center truncate rounded-control border border-line bg-black/20 px-3 text-muted"
										title={parent}
									>
										{parent}
									</div>
									<Button class="h-10" onclick={changeFolder}>Change…</Button>
								</div>
								<span class="text-[13px] text-muted"
									>A new folder for your car's app goes in here.</span
								>
							</div>
						</div>
					{:else if step === 'layout'}
						<div class="grid grid-cols-3 gap-4">
							{#each layouts as choice (choice.id)}
								{@render shotCard(
									shot(choice.id, side, bar),
									choice.label,
									choice.hint,
									layout === choice.id,
									() => (layout = choice.id)
								)}
							{/each}
						</div>
					{:else if step === 'side'}
						<div class="grid grid-cols-2 gap-5">
							{#each sides as choice (choice.id)}
								{@render shotCard(
									shot(layout, choice.id, bar),
									choice.label,
									choice.hint,
									side === choice.id,
									() => (side = choice.id),
									true
								)}
							{/each}
						</div>
					{:else if step === 'bar'}
						<!-- The bar is small on a car's screen, so one big picture that follows the pick. -->
						<div class="grid grid-cols-[1fr_17rem] items-start gap-5">
							<div
								class="relative aspect-[1024/600] overflow-hidden rounded-xl bg-black ring-1 ring-white/5"
							>
								<img
									src={shot(layout, side, bar)}
									alt=""
									class="absolute inset-0 size-full object-contain"
									draggable="false"
								/>
							</div>
							<div class="flex flex-col gap-2">
								{#each bars as choice (choice.id)}
									<button
										type="button"
										aria-pressed={bar === choice.id}
										class={[
											'flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
											bar === choice.id
												? 'border-primary/60 bg-primary/10'
												: 'border-line bg-tint hover:bg-hover'
										]}
										onclick={() => (bar = choice.id)}
									>
										<span
											class={[
												'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border',
												bar === choice.id
													? 'border-primary bg-primary text-white'
													: 'border-line-strong'
											]}
										>
											{#if bar === choice.id}<span class="size-1.5 rounded-full bg-white"
												></span>{/if}
										</span>
										<span class="flex flex-col">
											<span class="font-medium">{choice.label}</span>
											<span class="text-[13px] text-muted">{choice.hint}</span>
										</span>
									</button>
								{/each}
							</div>
						</div>
					{:else if step === 'more'}
						<div class="flex max-w-2xl flex-col gap-6">
							<div class="flex flex-col gap-2">
								<span class="font-medium"
									>Do you have a 3D model, a drawing or a picture of it?</span
								>
								<div class="grid grid-cols-4 gap-2">
									{#each looks as choice (choice.id)}
										{@const Icon = choice.icon}
										<button
											type="button"
											aria-pressed={look === choice.id}
											class={[
												'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors',
												look === choice.id
													? 'border-primary/60 bg-primary/10'
													: 'border-line bg-tint hover:bg-hover'
											]}
											onclick={() => chooseLook(choice)}
										>
											<Icon
												class={['size-5', look === choice.id ? 'text-primary' : 'text-muted']}
											/>
											<span class="font-medium">{choice.label}</span>
											<span class="text-xs text-muted">{choice.hint}</span>
										</button>
									{/each}
								</div>
								{#if look !== 'none'}
									{@const choice = looks.find((option) => option.id === look)}
									<div class="flex items-center gap-2">
										<div
											class="flex h-9 min-w-0 flex-1 items-center truncate rounded-control border border-line bg-black/20 px-3"
											title={lookFile}
										>
											{#if lookFile}{fileName(lookFile)}{:else}<span class="text-faint"
													>No file chosen</span
												>{/if}
										</div>
										<Button onclick={() => choice && chooseLook(choice)}>Choose file…</Button>
									</div>
								{/if}
								<span class="text-[13px] text-muted"
									>It shows on the screen, wherever the layout puts the car.</span
								>
							</div>

							<div class="flex flex-col gap-2">
								<span class="font-medium">Which time zone is the car in?</span>
								<Select
									bind:value={timeZone}
									options={zones}
									class="h-10! w-full [&_select]:w-full"
								/>
							</div>

							<button
								type="button"
								role="checkbox"
								aria-checked={reverseCamera}
								class="flex items-start gap-3 rounded-xl border border-line bg-tint px-3.5 py-3 text-left hover:bg-hover"
								onclick={() => (reverseCamera = !reverseCamera)}
							>
								<span
									class={[
										'mt-0.5 grid size-4 shrink-0 place-items-center rounded-[5px] border',
										reverseCamera ? 'border-primary bg-primary text-white' : 'border-line-strong'
									]}
								>
									{#if reverseCamera}<Check class="size-3" />{/if}
								</span>
								<span class="flex flex-col">
									<span class="font-medium">It has a reverse camera</span>
									<span class="text-[13px] text-muted">
										A camera plugged in over USB, shown while the car is in reverse.
									</span>
								</span>
							</button>
						</div>
					{/if}

					{#if problem}
						<div
							class="selectable mt-5 flex max-w-lg gap-3 rounded-xl border border-bad/25 bg-bad/[0.07] p-4"
						>
							<CircleAlert class="mt-0.5 size-4 shrink-0 text-bad" />
							<div>
								<div class="font-medium">{problem.message}</div>
								{#if problem.hint}
									<p class="mt-1 text-[13px] whitespace-pre-line text-muted">{problem.hint}</p>
								{/if}
							</div>
						</div>
					{/if}
				</div>

				<footer class="flex items-center gap-2 border-t border-line px-8 py-4">
					<span class="text-[13px] text-faint">Step {index + 1} of {order.length}</span>
					<div class="ml-auto flex gap-2">
						{#if index > 0}
							<Button disabled={busy} onclick={() => go(order[index - 1] ?? step)}>
								<ArrowLeft /> Back
							</Button>
						{/if}
						<Button variant="primary" class="min-w-28" disabled={busy} onclick={next}>
							{#if checking}
								<LoaderCircle class="animate-spin" /> Checking
							{:else if last}
								<Sparkles /> Create
							{:else}
								Next <ArrowRight />
							{/if}
						</Button>
					</div>
				</footer>
			{/if}
		</div>
	</div>
</div>

{#snippet startCard(
	value: From,
	Icon: Component,
	label: string,
	hint: string,
	recommended: boolean
)}
	<button
		type="button"
		aria-pressed={from === value}
		class={[
			'relative flex flex-col gap-3 rounded-xl border p-5 text-left transition-colors',
			from === value ? 'border-primary/60 bg-primary/10' : 'border-line bg-tint hover:bg-hover'
		]}
		onclick={() => (from = value)}
	>
		{#if recommended}
			<span
				class="absolute top-4 right-4 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
			>
				Recommended
			</span>
		{/if}
		<span
			class={[
				'grid size-10 place-items-center rounded-lg border',
				from === value
					? 'border-primary/40 bg-primary/20 text-primary'
					: 'border-line bg-tint text-muted'
			]}
		>
			<Icon class="size-5" />
		</span>
		<span class="flex flex-col gap-1">
			<span class="font-medium">{label}</span>
			<span class="text-[13px] text-muted">{hint}</span>
		</span>
	</button>
{/snippet}
