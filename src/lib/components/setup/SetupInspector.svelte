<script lang="ts">
	import Cpu from '~icons/lucide/cpu';
	import Eye from '~icons/lucide/eye';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import VsCode from '~icons/logos/visual-studio-code';
	import { commands } from '#lib/commands.ts';
	import { areaInfo, fieldPages, type SetupArea } from '#lib/setup.ts';
	import { config } from '#lib/state/config.svelte.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import { look } from '#lib/state/look.svelte.ts';
	import Button from '../ui/Button.svelte';
	import AboutSetup from './AboutSetup.svelte';
	import BuiltInsSetup from './BuiltInsSetup.svelte';
	import CarSetup from './CarSetup.svelte';
	import CodeNote from './CodeNote.svelte';
	import FieldsPage from './FieldsPage.svelte';
	import InfoDisplaySetup from './InfoDisplaySetup.svelte';
	import ScreenSetup from './ScreenSetup.svelte';

	/**
	 * One setup page in the inspector: what it is, a way to it in `lib/main.dart` and in the
	 * running app, and its settings, which the preview follows once they are written.
	 */
	let { area }: { area: SetupArea } = $props();

	const info = $derived(areaInfo(area));
	const line = $derived(info.key ? config.line(info.key) : undefined);
	const saving = $derived(config.writing > 0 || look.writing > 0);
	const running = $derived(editor.preview.status === 'running');
	/** The whole config is written as code (`can: miataCan`), so there is nothing to change here. */
	const allInCode = $derived(
		info.key && area !== 'car' && area !== 'infoDisplay' && area !== 'screen'
			? config.result?.code[info.key]
			: undefined
	);
	const folds = $derived(fieldPages[area]);
</script>

<div class="flex flex-col gap-1.5">
	<div class="flex items-center gap-2">
		<info.icon class="size-4 shrink-0 text-muted" />
		<h2 class="min-w-0 flex-1 truncate text-base font-semibold">{info.title}</h2>
		{#if saving}
			<span
				class="flex items-center gap-1.5 text-xs text-faint"
				title="Writing it into lib/main.dart"
			>
				<LoaderCircle class="size-3.5 animate-spin" /> Saving
			</span>
		{/if}
	</div>
	<p class="text-[13px] text-muted">{info.about}</p>
	<div class="flex flex-wrap gap-1.5 pt-1">
		{#if info.show && running}
			<Button size="sm" onclick={() => void config.showArea(area)}>
				<Eye /> Show it
			</Button>
		{/if}
		<Button
			variant="ghost-muted"
			size="sm"
			onclick={() => editor.openInVsCode(undefined, 'lib/main.dart', line)}
		>
			<VsCode /> Open in VS Code
		</Button>
	</div>
</div>

{#if !config.result}
	{#if config.problem}
		<p class="text-[13px] text-bad">{config.problem}</p>
	{:else}
		<p class="flex items-center gap-2 text-[13px] text-muted">
			<LoaderCircle class="size-3.5 animate-spin" /> Reading your car
		</p>
	{/if}
{:else if allInCode}
	<CodeNote text="Your app sets this up in code:" code={allInCode.code} line={allInCode.line} />
{:else if area === 'can' && config.value('can') !== true}
	<div class="flex flex-col gap-2">
		<p class="text-[13px] text-muted">
			Your car has no CAN bus yet. It gets one with the first board you make for it.
		</p>
		<Button
			size="sm"
			class="w-full justify-start"
			disabled={editor.busy || editor.cli?.found !== true}
			onclick={() => void editor.runTask(commands.createDevice())}
		>
			<Cpu /> Make a device
		</Button>
	</div>
{:else if area === 'screen'}
	<ScreenSetup />
{:else if area === 'car'}
	<CarSetup />
{:else if area === 'infoDisplay'}
	<InfoDisplaySetup />
{:else if area === 'about'}
	<AboutSetup />
{:else if area === 'builtIns'}
	<BuiltInsSetup />
{:else if folds}
	<FieldsPage {area} {folds} />
{/if}

{#if config.result && config.problem}
	<p class="text-[13px] text-bad">{config.problem}</p>
{/if}
{#if look.problem}
	<p class="text-[13px] text-bad">{look.problem}</p>
{/if}
{#if config.manual.length > 0 || look.manual.length > 0}
	<div class="flex flex-col gap-1 text-[13px] text-muted">
		<p>This has no clear place in lib/main.dart, so make it there by hand:</p>
		{#each [...config.manual, ...look.manual] as text (text)}
			<code class="font-mono text-xs break-all text-faint">{text}</code>
		{/each}
	</div>
{/if}
