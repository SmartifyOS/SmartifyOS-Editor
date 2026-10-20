<script lang="ts">
	import FileUp from '~icons/lucide/file-up';
	import RefreshCcw from '~icons/lucide/refresh-ccw';
	import RotateCw from '~icons/lucide/rotate-cw';
	import Trash from '~icons/lucide/trash-2';
	import X from '~icons/lucide/x';
	import type { CarLookName, ConfigElement } from '../../../../shared/cli.ts';
	import { carLooks } from '#lib/look.ts';
	import { config } from '#lib/state/config.svelte.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import { look } from '#lib/state/look.svelte.ts';
	import { remembered } from '#lib/state/remembered.svelte.ts';
	import Button from '../ui/Button.svelte';
	import NumberField from '../ui/NumberField.svelte';
	import Segmented from '../ui/Segmented.svelte';
	import Select from '../ui/Select.svelte';
	import Switch from '../ui/Switch.svelte';
	import TextField from '../ui/TextField.svelte';
	import AddName from './AddName.svelte';
	import CodeNote from './CodeNote.svelte';
	import ConfigField from './ConfigField.svelte';
	import Fold from './Fold.svelte';
	import PartName from './PartName.svelte';

	/**
	 * The car on the screen: each way to draw it in a tab of its own, its file (copied in by
	 * `appearance`) and everything about it (`config`), and which one the car starts as.
	 */

	const appearance = $derived(look.appearance);
	const canWrite = $derived(editor.cli?.found === true);
	const carCode = $derived(config.result?.code.car);

	const tab = remembered<CarLookName>('setup.car.tab', 'model3D');
	const kind = $derived(
		carLooks.find((known) => known.id === tab.value) ?? (carLooks[0] as (typeof carLooks)[number])
	);
	const file = $derived(appearance?.car[tab.value] ?? null);
	/** What it is called in a sentence: `a drawing`, but `a 3D model`. */
	const named = $derived(kind.id === 'model3D' ? kind.label : kind.label.toLowerCase());
	const pictures = $derived(carLooks.filter((known) => appearance?.car[known.id]));

	const axes = [
		{ value: 'x', label: 'X' },
		{ value: 'y', label: 'Y' },
		{ value: 'z', label: 'Z' }
	];

	const rolling = 'car.model3D.parts.rollingWheels';
	const steering = 'car.model3D.parts.steerableWheels';
	const steeringWheel = 'car.model3D.parts.steeringWheel';
	const drawingWheels = 'car.drawing2D.parts.steerableWheels';

	async function pickFile() {
		const picked = await window.smartify.files.pickFile(`A ${named} of your car`, kind.extensions);
		if (picked) await look.change({ files: { [kind.id]: picked } });
	}

	function fileName(path: string): string {
		return path.split('/').pop() ?? path;
	}

	/** How far one turn of a tyre goes, in metres, from its size like `195/50 R15`. */
	function circumference(size: string): number | undefined {
		const match = /(\d{3})\s*\/\s*(\d{2})\s*[a-z]*\s*(\d{2})/i.exec(size);
		if (!match) return undefined;
		const [width, ratio, rim] = [Number(match[1]), Number(match[2]), Number(match[3])];
		const diameter = rim * 25.4 + (2 * width * ratio) / 100;
		return Math.round(Math.PI * diameter) / 1000;
	}

	function names(elements: ConfigElement[], name: string): string[] {
		return elements.map((element) => element.values[name]).filter((n) => typeof n === 'string');
	}

	/** Turns the model the other way round, which most models need. */
	function turnAround() {
		const rotation = config.value<{ x: number; y: number; z: number }>('car.model3D.rotation');
		void config.set('car.model3D.rotation', { ...rotation, y: (rotation.y + 180) % 360 });
	}

	const steeringCode = $derived(config.result?.code[steeringWheel]);
	const drawingWheelsCode = $derived(config.result?.code[drawingWheels]);
	const lineWidth = 'car.drawing2D.lineWidth';
	const xyz = ['x', 'y', 'z'] as const;
	const spots = [
		'topLeft',
		'topCenter',
		'topRight',
		'centerLeft',
		'center',
		'centerRight',
		'bottomLeft',
		'bottomCenter',
		'bottomRight'
	];
</script>

{#if !appearance}
	<p class="text-[13px] text-muted">Reading your car…</p>
{:else if carCode}
	<CodeNote text="Your app sets up the car in code:" code={carCode.code} line={carCode.line} />
{:else}
	<Segmented
		label="Ways to draw your car"
		options={carLooks.map((known) => ({
			value: known.id,
			label: known.label,
			icon: known.icon,
			dot: Boolean(appearance.car[known.id])
		}))}
		bind:value={tab.value}
	/>

	{#if !file}
		<div
			class="flex flex-col items-center gap-2 rounded-control border border-dashed border-input px-4 py-5 text-center"
		>
			<kind.icon class="size-5 text-faint" />
			<p class="text-[13px] text-muted">
				{#if kind.id === 'model3D'}
					A 3D model the driver can turn with a finger, from Blender or anything that writes .glb.
				{:else if kind.id === 'drawing2D'}
					A drawing seen from above, like a 90s dashboard, as an .svg file drawn in white.
				{:else}
					A photo or any picture, a .png or .jpg, filling the space behind everything.
				{/if}
			</p>
			<Button size="sm" disabled={!canWrite} onclick={pickFile}>
				<FileUp /> Add a {named}
			</Button>
		</div>
	{:else}
		<div
			class="flex h-9 items-center gap-2.5 rounded-control border border-line bg-tint pr-1 pl-2.5"
		>
			<kind.icon class="size-4 shrink-0 text-muted" />
			<span class="min-w-0 flex-1 truncate font-mono text-xs" title={file}>{fileName(file)}</span>
			<Button
				variant="ghost-muted"
				size="icon-sm"
				label={`Use another ${named}`}
				disabled={!canWrite}
				onclick={pickFile}
			>
				<FileUp />
			</Button>
			<Button
				variant="ghost-muted"
				size="icon-sm"
				label={`Take the ${named} out`}
				disabled={!canWrite}
				onclick={() => void look.change({ files: { [kind.id]: null } })}
			>
				<Trash />
			</Button>
		</div>

		{#if kind.id === 'model3D'}
			{@render model()}
		{:else if kind.id === 'drawing2D'}
			{@render drawing()}
		{:else}
			{@render picture()}
		{/if}
	{/if}

	{#snippet onScreen()}
		<div class="flex flex-col gap-2.5">
			{#if pictures.length > 1}
				<div class="grid grid-cols-[minmax(0,10fr)_minmax(0,13fr)] items-center gap-x-3">
					<span class="text-[13px] text-muted">Starts as</span>
					<Select
						class="w-full"
						options={[
							{ value: '', label: `The first, ${pictures[0]?.label}` },
							...pictures.map((known) => ({ value: known.id, label: known.label }))
						]}
						bind:value={
							() => appearance.car.look ?? '',
							(value) => void look.change({ look: (value || null) as CarLookName | null })
						}
					/>
				</div>
				<p class="-mt-1 text-xs text-faint">The driver can pick another in Settings.</p>
			{/if}
			<ConfigField
				spec={{
					key: 'car.speedFromGps',
					label: 'Wheels roll with the GPS speed',
					hint: 'Off, your app sets the speed itself.'
				}}
			/>
		</div>
	{/snippet}
	<Fold id="car.onScreen" title="On the screen">{@render onScreen()}</Fold>
{/if}

{#snippet model()}
	<Fold id="car.model.place" title="Size and position">
		<div class="flex flex-col gap-2.5">
			<ConfigField
				spec={{
					key: 'car.model3D.scale',
					label: 'Size',
					range: { min: 0.05, max: 3, step: 0.05 },
					hint: 'Make the car fill a comfortable part of the screen when it has all of it.'
				}}
			/>
			{@render vector('car.model3D.rotation', 'Turned', '°', 15)}
			<div class="-mt-1 flex justify-end">
				<Button size="sm" disabled={!canWrite} onclick={turnAround}>
					<RotateCw /> Turn it around
				</Button>
			</div>
			{@render vector('car.model3D.offset', 'Moved', '', 0.05)}
			<ConfigField
				spec={{
					key: 'car.model3D.lookAtHeight',
					label: 'Camera aims at',
					range: { min: 0, max: 2, step: 0.05 },
					hint: 'Higher puts the car lower in its space.'
				}}
			/>
		</div>
	</Fold>

	<Fold id="car.model.parts" title="Moving parts">
		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-1.5">
				<p class="text-[13px]">Wheels that roll</p>
				{#each config.elements(rolling) as wheel, index (`${index}:${wheel.line}`)}
					{#if wheel.asCode}
						<CodeNote text="Written as code:" code={wheel.asCode} line={wheel.line} />
					{:else}
						{@const backwards = wheel.values.invertSpin === true}
						<div class="flex items-center gap-1">
							<PartName
								class="min-w-0 flex-1"
								value={String(wheel.values.objectName ?? '')}
								names={look.partNames.model3D}
								label="Wheel"
								onchange={(name) => void config.set(`${rolling}[${index}].objectName`, name)}
							/>
							<Select
								class="w-[58px] shrink-0"
								title="The axle it turns around"
								options={axes}
								bind:value={
									() => String(wheel.values.spinAxis ?? 'x'),
									(axis) => void config.set(`${rolling}[${index}].spinAxis`, axis)
								}
							/>
							<Button
								variant="ghost-muted"
								size="icon-sm"
								aria-pressed={backwards}
								label={backwards ? 'Rolls backwards, the other way round' : 'Rolls forwards'}
								disabled={!canWrite}
								onclick={() => void config.set(`${rolling}[${index}].invertSpin`, !backwards)}
							>
								<RefreshCcw class={backwards ? 'text-primary' : ''} />
							</Button>
							<Button
								variant="ghost-muted"
								size="icon-sm"
								label="Take it out"
								disabled={!canWrite}
								onclick={() => void config.remove(rolling, index)}
							>
								<X />
							</Button>
						</div>
					{/if}
				{/each}
				{#if !config.inCode(rolling)}
					<AddName
						names={look.partNames.model3D}
						used={names(config.elements(rolling), 'objectName')}
						label="Add a wheel"
						disabled={!canWrite}
						onadd={(objectName) => void config.add(rolling, { objectName })}
					/>
				{/if}
				<p class="text-xs text-faint">
					Every wheel, the front ones too. One that spins the wrong way rolls backwards with
					<RefreshCcw class="inline size-3 align-[-2px]" />.
				</p>
			</div>

			<div class="flex flex-col gap-1.5">
				<p class="text-[13px]">Front wheels that steer</p>
				{#each config.elements(steering) as wheel, index (`${index}:${wheel.line}`)}
					{#if wheel.asCode}
						<CodeNote text="Written as code:" code={wheel.asCode} line={wheel.line} />
					{:else}
						<div class="flex items-center gap-1">
							<PartName
								class="min-w-0 flex-1"
								value={String(wheel.values.holderObjectName ?? '')}
								names={look.partNames.model3D}
								label="What holds the wheel"
								onchange={(name) => void config.set(`${steering}[${index}].holderObjectName`, name)}
							/>
							<Select
								class="w-[58px] shrink-0"
								title="What it turns around"
								options={axes}
								bind:value={
									() => String(wheel.values.steerAxis ?? 'y'),
									(axis) => void config.set(`${steering}[${index}].steerAxis`, axis)
								}
							/>
							<Button
								variant="ghost-muted"
								size="icon-sm"
								label="Take it out"
								disabled={!canWrite}
								onclick={() => void config.remove(steering, index)}
							>
								<X />
							</Button>
						</div>
					{/if}
				{/each}
				{#if !config.inCode(steering)}
					<AddName
						names={look.partNames.model3D}
						used={names(config.elements(steering), 'holderObjectName')}
						label="Add a front wheel"
						disabled={!canWrite}
						onadd={(holderObjectName) => void config.add(steering, { holderObjectName })}
					/>
				{/if}
				<p class="text-xs text-faint">
					The part holding each front wheel, so the wheel in it can go on rolling.
				</p>
			</div>

			<div class="flex flex-col gap-2">
				<div class="flex items-center gap-2">
					<span class="flex-1 text-[13px]">Steering wheel</span>
					{#if config.value(steeringWheel) === true}
						<Switch
							checked
							label="Steering wheel"
							disabled={!canWrite}
							onchange={() => void config.unset(steeringWheel)}
						/>
					{/if}
				</div>
				{#if steeringCode}
					<CodeNote text="Written as code:" code={steeringCode.code} line={steeringCode.line} />
				{:else if config.value(steeringWheel) === true}
					<div class="flex items-center gap-1">
						<PartName
							class="min-w-0 flex-1"
							value={config.value<string>(`${steeringWheel}.objectName`) ?? ''}
							names={look.partNames.model3D}
							label="Steering wheel"
							onchange={(name) => void config.set(`${steeringWheel}.objectName`, name)}
						/>
						<Select
							class="w-[58px] shrink-0"
							title="What it turns around"
							options={axes}
							bind:value={
								() => config.value<string>(`${steeringWheel}.rotationAxis`),
								(axis) => void config.set(`${steeringWheel}.rotationAxis`, axis)
							}
						/>
					</div>
					<ConfigField
						spec={{
							key: `${steeringWheel}.maxRotation`,
							label: 'Turns as far as',
							unit: '°',
							hint: 'With the front wheels all the way over.'
						}}
					/>
				{:else}
					<AddName
						names={look.partNames.model3D}
						used={[]}
						label="Pick the steering wheel"
						disabled={!canWrite}
						onadd={(objectName) => void config.set(steeringWheel, { objectName })}
					/>
				{/if}
			</div>

			<div class="flex flex-col gap-1.5">
				<ConfigField
					spec={{
						key: 'car.model3D.parts.wheelCircumference',
						label: 'One turn of a wheel',
						unit: 'm',
						hint: 'Turns the speed into how fast the wheels spin.'
					}}
				/>
				<div class="grid grid-cols-[minmax(0,10fr)_minmax(0,13fr)] items-center gap-x-3">
					<span class="text-xs text-faint">Or from the tyre size</span>
					<TextField
						value=""
						placeholder="195/50 R15"
						label="Tyre size"
						onchange={(size) => {
							const metres = circumference(size);
							if (metres) void config.set('car.model3D.parts.wheelCircumference', metres);
						}}
					/>
				</div>
			</div>
		</div>
	</Fold>

	<Fold id="car.model.render" title="Quality and light" closed>
		<div class="flex flex-col gap-2.5">
			<ConfigField
				spec={{
					key: 'car.model3D.render.exposure',
					label: 'Brightness',
					range: { min: 0.3, max: 3, step: 0.05 }
				}}
			/>
			<ConfigField
				spec={{
					key: 'car.model3D.render.environmentIntensity',
					label: 'Reflections',
					range: { min: 0, max: 1.5, step: 0.05 },
					hint: 'What makes paint look wet. Too much washes the colour out.'
				}}
			/>
			<ConfigField
				spec={{
					key: 'car.model3D.render.scale',
					label: 'Sharpness',
					range: { min: 1, max: 3, step: 0.25 },
					hint: 'Smoother edges, at a cost that grows fast. 1.5 suits a small board.'
				}}
			/>
			{@render shadow()}
			<ConfigField
				spec={{ key: 'car.model3D.render.vignette', label: 'Darker corners, like a lens' }}
			/>
		</div>
	</Fold>
{/snippet}

{#snippet shadow()}
	{@const key = 'car.model3D.render.shadowMapSize'}
	{#if config.field(key)}
		<div class="grid grid-cols-[minmax(0,10fr)_minmax(0,13fr)] items-center gap-x-3">
			<span class={['text-[13px]', config.isSet(key) ? 'text-fg' : 'text-muted']}>Shadow</span>
			<Select
				class="w-full"
				options={[
					{ value: '512', label: 'Soft, 512' },
					{ value: '1024', label: 'Good for a small board' },
					{ value: '2048', label: 'Sharp, 2048' },
					{ value: '4096', label: 'Sharpest, 4096' },
					...([512, 1024, 2048, 4096].includes(config.value<number>(key))
						? []
						: [{ value: String(config.value(key)), label: String(config.value(key)) }])
				]}
				bind:value={() => String(config.value(key)), (size) => void config.set(key, Number(size))}
			/>
		</div>
	{/if}
{/snippet}

{#snippet vector(key: string, label: string, unit: string, step: number)}
	{#if config.field(key)}
		{@const point = config.value<{ x: number; y: number; z: number }>(key)}
		{@const written = config.result?.code[key]}
		<div class="group grid grid-cols-[minmax(0,10fr)_minmax(0,13fr)] items-center gap-x-3">
			<span class={['text-[13px]', config.isSet(key) ? 'text-fg' : 'text-muted']}>{label}</span>
			{#if written}
				<CodeNote text="" code={written.code} line={written.line} />
			{:else}
				<div class="grid grid-cols-3 gap-1">
					{#each xyz as axis (axis)}
						<NumberField
							value={point[axis]}
							{unit}
							{step}
							label={`${label}, ${axis.toUpperCase()}`}
							prefix={axis.toUpperCase()}
							disabled={!canWrite}
							onchange={(next) => void config.set(key, { ...point, [axis]: next ?? 0 })}
						/>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
{/snippet}

{#snippet drawing()}
	<Fold id="car.drawing.lines" title="Lines">
		<div class="flex flex-col gap-2.5">
			<div class="grid grid-cols-[minmax(0,10fr)_minmax(0,13fr)] items-center gap-x-3">
				<span class={['text-[13px]', config.isSet(lineWidth) ? 'text-fg' : 'text-muted']}
					>Line thickness</span
				>
				<Select
					class="w-full"
					options={[
						{ value: 'file', label: 'As drawn, grows with it' },
						{ value: 'fixed', label: 'The same at any size' }
					]}
					bind:value={
						() => (config.value(lineWidth) === null ? 'file' : 'fixed'),
						(how) => void (how === 'file' ? config.unset(lineWidth) : config.set(lineWidth, 2))
					}
				/>
			</div>
			{#if config.value(lineWidth) !== null}
				<ConfigField
					spec={{
						key: lineWidth,
						label: 'Thickness on screen',
						unit: 'px',
						range: { min: 0.5, max: 8, step: 0.5 }
					}}
				/>
			{/if}
			<ConfigField
				spec={{
					key: 'car.drawing2D.margin',
					label: 'Room around it',
					unit: 'px',
					range: { min: 0, max: 120, step: 4 }
				}}
			/>
		</div>
	</Fold>

	<Fold id="car.drawing.parts" title="Moving parts">
		<div class="flex flex-col gap-1.5">
			<p class="text-[13px]">Front wheels that steer</p>
			{#if drawingWheelsCode}
				<CodeNote
					text="Written as code:"
					code={drawingWheelsCode.code}
					line={drawingWheelsCode.line}
				/>
			{:else}
				{#each config.value<string[]>(drawingWheels) as name (name)}
					<div
						class="flex h-8 items-center gap-2 rounded-control border border-line bg-tint pr-0.5 pl-2.5"
					>
						<span class="min-w-0 flex-1 truncate text-[13px]">{name}</span>
						<Button
							variant="ghost-muted"
							size="icon-sm"
							class="size-7!"
							label="Take it out"
							disabled={!canWrite}
							onclick={() => void config.removeId(drawingWheels, name)}
						>
							<X />
						</Button>
					</div>
				{/each}
				<AddName
					names={look.partNames.drawing2D}
					used={config.value<string[]>(drawingWheels)}
					label="Add a front wheel"
					disabled={!canWrite}
					onadd={(name) => void config.addId(drawingWheels, name)}
				/>
			{/if}
			<p class="text-xs text-faint">
				Each in a group of its own in the drawing, turning around its middle or a shape named pivot
				in it.
			</p>
		</div>
	</Fold>
{/snippet}

{#snippet picture()}
	<Fold id="car.picture" title="How it fills its space">
		<div class="flex flex-col gap-2.5">
			<ConfigField
				spec={{
					key: 'car.image.fit',
					label: 'Fit',
					options: [
						{ value: 'cover', label: 'Fill it, cut off the edges' },
						{ value: 'contain', label: 'All of it, in the middle' },
						{ value: 'fill', label: 'Stretched to fill' },
						{ value: 'fitWidth', label: 'As wide as the space' },
						{ value: 'fitHeight', label: 'As tall as the space' },
						{ value: 'scaleDown', label: 'All of it, never bigger' },
						{ value: 'none', label: 'As big as it is' }
					]
				}}
			/>
			{@render alignment()}
		</div>
	</Fold>
{/snippet}

{#snippet alignment()}
	{@const key = 'car.image.alignment'}
	{#if config.field(key)}
		{@const current = config.value<string>(key)}
		<div class="grid grid-cols-[minmax(0,10fr)_minmax(0,13fr)] items-start gap-x-3">
			<div class="flex flex-col gap-0.5 pt-1">
				<span class={['text-[13px]', config.isSet(key) ? 'text-fg' : 'text-muted']}
					>Stays in view</span
				>
				<span class="text-xs text-faint">When it does not fit exactly.</span>
			</div>
			<div
				class="grid w-[92px] grid-cols-3 gap-1 rounded-control border border-input bg-tint p-1"
				role="radiogroup"
				aria-label="Which part stays in view"
			>
				{#each spots as spot (spot)}
					<button
						type="button"
						role="radio"
						aria-checked={current === spot}
						aria-label={spot.replace(/([A-Z])/g, ' $1').toLowerCase()}
						title={spot.replace(/([A-Z])/g, ' $1').toLowerCase()}
						disabled={!canWrite}
						class="flex size-6 cursor-default items-center justify-center rounded-[5px] outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-primary/70"
						onclick={() => void config.set(key, spot)}
					>
						<span
							class={[
								'rounded-full transition-all',
								current === spot ? 'size-2.5 bg-primary' : 'size-1.5 bg-faint'
							]}
						></span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
{/snippet}
