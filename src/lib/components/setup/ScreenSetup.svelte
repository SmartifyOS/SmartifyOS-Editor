<script lang="ts">
	import ArrowDown from '~icons/lucide/arrow-down';
	import ArrowUp from '~icons/lucide/arrow-up';
	import X from '~icons/lucide/x';
	import { bars, layouts, themes } from '#lib/look.ts';
	import { config } from '#lib/state/config.svelte.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import { look } from '#lib/state/look.svelte.ts';
	import { parts } from '#lib/state/parts.svelte.ts';
	import Button from '../ui/Button.svelte';
	import Select from '../ui/Select.svelte';
	import Switch from '../ui/Switch.svelte';
	import CodeNote from './CodeNote.svelte';
	import ConfigField from './ConfigField.svelte';
	import Fold from './Fold.svelte';

	/**
	 * How the screen is arranged: the layout, theme and driver's side it starts with (changed
	 * in the running app at once, see `look`), what is in the bar and the dock, which layouts
	 * and themes the driver is offered, and the size it is laid out at.
	 */

	const appearance = $derived(look.appearance);
	const app = $derived(look.app);
	const canWrite = $derived(editor.cli?.found === true);

	/** Stands for "written as code" in a select, which has to have a value for everything. */
	const inCode = '\u0000code';

	const layoutChoices = $derived(
		app
			? app.layouts.map((layout) => ({ value: layout.id, label: layout.title }))
			: layouts.map((layout) => ({ value: layout.id, label: layout.label }))
	);
	const themeChoices = $derived(
		app
			? app.themes.map((theme) => ({ value: theme.id, label: theme.title }))
			: themes.map((theme) => ({ value: theme.id, label: theme.label }))
	);

	const layoutOptions = $derived(
		withCurrent(layoutChoices, appearance?.layout, appearance?.code.layout)
	);
	const themeOptions = $derived([
		{ value: '', label: "Each layout's own" },
		...withCurrent(themeChoices, appearance?.theme ?? '', appearance?.code.theme).filter(
			(option) => option.value !== ''
		)
	]);
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

	const dock = 'bar.dockApps';
	const hasDock = $derived(appearance?.bar === 'dock' || appearance?.bar === 'infoDisplayAndDock');
	const dockCode = $derived(config.result?.code[dock]);

	/** Every app the dock can start with: SmartifyOS's own and the car's windows in the app list. */
	const apps = $derived([
		{ id: 'settings', label: 'Settings' },
		{ id: 'home_widgets', label: 'Widgets' },
		{ id: 'reverse_camera', label: 'Reverse camera' },
		...(parts.lists?.window ?? [])
			.filter((window) => window.id && window.inAppList !== false)
			.map((window) => ({ id: window.id as string, label: window.name ?? (window.id as string) }))
	]);
	const appLabel = (id: string) => apps.find((known) => known.id === id)?.label ?? id;

	const hiddenLayouts = 'layouts.hiddenLayouts';
	const hiddenThemes = 'themes.hiddenThemes';
</script>

{#if !appearance}
	<p class="text-[13px] text-muted">Reading your car…</p>
{:else}
	<Fold id="screen.look" title="What it starts with">
		<div class="flex flex-col gap-2.5">
			<div class="grid grid-cols-[minmax(0,10fr)_minmax(0,13fr)] items-center gap-x-3 gap-y-2.5">
				<span class="text-[13px] text-muted">Layout</span>
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
				<span class="text-[13px] text-muted">Theme</span>
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
				<span class="text-[13px] text-muted">Driver's side</span>
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
			</div>
			<p class="text-xs text-faint">
				The driver can switch in Settings, Appearance.{app?.theme.picked
					? ' A theme picked there is forgotten when you change it here.'
					: ''}
			</p>
		</div>
	</Fold>

	<Fold id="screen.bar" title="The bar">
		<div class="flex flex-col gap-2.5">
			<div class="grid grid-cols-[minmax(0,10fr)_minmax(0,13fr)] items-center gap-x-3">
				<span class="text-[13px] text-muted">What is in it</span>
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

			{#if hasDock}
				<div class="flex flex-col gap-1.5">
					<p class="text-[13px]">Apps in the dock</p>
					{#if dockCode}
						<CodeNote text="Written as code:" code={dockCode.code} line={dockCode.line} />
					{:else}
						{@const list = config.value<string[]>(dock)}
						{#each list as id, index (id)}
							<div
								class="flex h-8 items-center gap-0.5 rounded-control border border-line bg-tint pr-0.5 pl-2.5"
							>
								<span class="min-w-0 flex-1 truncate text-[13px]">{appLabel(id)}</span>
								<Button
									variant="ghost-muted"
									size="icon-sm"
									class="size-7! [&_svg]:size-3.5!"
									label="Earlier"
									disabled={!canWrite || index === 0}
									onclick={() => void config.move(dock, index, index - 1)}
								>
									<ArrowUp />
								</Button>
								<Button
									variant="ghost-muted"
									size="icon-sm"
									class="size-7! [&_svg]:size-3.5!"
									label="Later"
									disabled={!canWrite || index === list.length - 1}
									onclick={() => void config.move(dock, index, index + 1)}
								>
									<ArrowDown />
								</Button>
								<Button
									variant="ghost-muted"
									size="icon-sm"
									class="size-7! [&_svg]:size-3.5!"
									label="Take it out"
									disabled={!canWrite}
									onclick={() => void config.removeId(dock, id)}
								>
									<X />
								</Button>
							</div>
						{/each}
						{#if apps.some((known) => !list.includes(known.id))}
							<Select
								class="w-full text-muted"
								options={[
									{ value: '', label: 'Add an app…' },
									...apps
										.filter((known) => !list.includes(known.id))
										.map((known) => ({ value: known.id, label: known.label }))
								]}
								bind:value={
									() => '',
									(id) => {
										if (id) void config.addId(dock, id);
									}
								}
							/>
						{/if}
						<p class="text-xs text-faint">
							What it starts with. The driver changes them by holding an app in the app list.
						</p>
					{/if}
				</div>
			{/if}

			<ConfigField
				spec={{
					key: 'bar.reachableWithoutTouch',
					label: 'Reachable with a knob',
					hint: 'The highlight goes on into the bar after the home screen widgets.'
				}}
			/>
		</div>
	</Fold>

	<Fold id="screen.offered" title="What the driver can pick" closed>
		<div class="flex flex-col gap-3">
			{@render offered('Layouts', hiddenLayouts, layoutChoices, appearance.layout)}
			{@render offered('Themes', hiddenThemes, themeChoices, appearance.theme)}
		</div>
	</Fold>

	<Fold id="screen.size" title="Size" closed>
		<div class="flex flex-col gap-2.5">
			<ConfigField
				spec={{
					key: 'display.designWidth',
					label: 'Laid out at',
					unit: 'px',
					hint: 'The width everything is drawn at, then scaled to the screen. Wider fits more on.'
				}}
			/>
			<ConfigField
				spec={{
					key: 'display.fullScreen',
					label: 'Full screen',
					automatic: { label: 'Only on the car', on: 'Always', off: 'Never' }
				}}
			/>
			<ConfigField spec={{ key: 'display.windowSize', label: 'Window on a computer' }} />
			<ConfigField
				spec={{
					key: 'display.ignoreSystemTextScale',
					label: "Ignore the computer's text size",
					hint: 'Keeps the text sharp. Leave it on.'
				}}
			/>
		</div>
	</Fold>
{/if}

{#snippet offered(
	title: string,
	key: string,
	choices: { value: string; label: string }[],
	startsWith: string | null
)}
	{#if config.field(key)}
		{@const written = config.result?.code[key]}
		<div class="flex flex-col gap-1">
			<p class="text-xs text-faint">{title}</p>
			{#if written}
				<CodeNote text="Written as code:" code={written.code} line={written.line} />
			{:else}
				{@const hidden = config.value<string[]>(key)}
				{#each choices as choice (choice.value)}
					{@const first = choice.value === startsWith}
					<div
						class="flex h-8 items-center gap-2"
						title={first ? 'The one it starts with' : undefined}
					>
						<span
							class={[
								'min-w-0 flex-1 truncate text-[13px]',
								hidden.includes(choice.value) && 'text-faint'
							]}>{choice.label}</span
						>
						<Switch
							checked={!hidden.includes(choice.value)}
							label={choice.label}
							disabled={!canWrite || (first && !hidden.includes(choice.value))}
							onchange={(shown) =>
								void (shown ? config.removeId(key, choice.value) : config.addId(key, choice.value))}
						/>
					</div>
				{/each}
			{/if}
		</div>
	{/if}
{/snippet}
