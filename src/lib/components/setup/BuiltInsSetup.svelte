<script lang="ts">
	import { builtIns } from '#lib/setup.ts';
	import { config } from '#lib/state/config.svelte.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import Switch from '../ui/Switch.svelte';
	import CodeNote from './CodeNote.svelte';
	import Fold from './Fold.svelte';

	/**
	 * Every app, widget, tile, icon and settings page SmartifyOS adds by itself, each switched
	 * off by putting it in the `hidden...` list of its config.
	 */

	const canWrite = $derived(editor.cli?.found === true);
</script>

{#each builtIns as group (group.key)}
	{#if config.field(group.key)}
		{@const written = config.inCode(group.key)}
		<Fold id={`builtIns.${group.key}`} title={group.title} closed={group.items.length > 8}>
			{#if written}
				<CodeNote text="Written as code:" code={written.code} line={written.line} />
			{:else}
				{@const hidden = config.value<string[]>(group.key)}
				<div class="flex flex-col">
					{#each group.items as item (item.id)}
						{@const shown = !hidden.includes(item.id)}
						<div class="flex h-8 items-center gap-2">
							<span class={['min-w-0 flex-1 truncate text-[13px]', !shown && 'text-faint']}
								>{item.label}</span
							>
							<Switch
								checked={shown}
								label={item.label}
								disabled={!canWrite}
								onchange={(on) =>
									void (on
										? config.removeId(group.key, item.id)
										: config.addId(group.key, item.id))}
							/>
						</div>
					{/each}
				</div>
			{/if}
		</Fold>
	{/if}
{/each}
