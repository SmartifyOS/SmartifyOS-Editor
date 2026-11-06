<script lang="ts" module>
	/**
	 * What the car's computer is, which decides which Linux goes on it and how. The same two
	 * the CLI supports (`officialLinux` in its src/core/linux/distro.ts).
	 */
	type Computer = 'pi' | 'pc';

	const computers = [
		{ value: 'pi', label: 'Raspberry Pi' },
		{ value: 'pc', label: 'PC (x64)' }
	] as const;

	/** A program that writes Linux onto a card or stick, and where it is downloaded. */
	interface Flasher {
		name: string;
		url: string;
	}

	const piImager: Flasher = {
		name: 'Raspberry Pi Imager',
		url: 'https://www.raspberrypi.com/software/'
	};
	const rufus: Flasher = { name: 'Rufus', url: 'https://rufus.ie/' };
	const etcher: Flasher = { name: 'balenaEtcher', url: 'https://etcher.balena.io/' };

	/** Debian's download page, which offers the netinst image for a 64-bit PC first. */
	const debianUrl = 'https://www.debian.org/download';

	/** The computer picked last, remembered for next time. */
	const storageKey = 'linuxGuide.computer';
</script>

<script lang="ts">
	import BookOpen from '~icons/lucide/book-open';
	import Download from '~icons/lucide/download';
	import HardDriveDownload from '~icons/lucide/hard-drive-download';
	import { coversViewport } from '#lib/attachments.ts';
	import { commands } from '#lib/commands.ts';
	import { editor } from '#lib/state/editor.svelte.ts';
	import Button from './ui/Button.svelte';
	import Segmented from './ui/Segmented.svelte';

	/**
	 * How to get Linux onto the car's computer, step by step, before the installer goes on it:
	 * which Linux, and which program writes it onto a card or stick on this computer. Neither
	 * the editor nor the CLI writes it, this only says what to download and what to pick.
	 * Opened from the Export menu, the start screen, and after exporting an installer.
	 */
	let { exported = false }: { exported?: boolean } = $props();

	const platform = window.smartify.platform;
	/** Rufus is the one made for this on Windows, balenaEtcher works the same everywhere else. */
	const flasher = platform === 'win32' ? rufus : etcher;

	let computer = $state<Computer>(remembered());

	function remembered(): Computer {
		try {
			return localStorage.getItem(storageKey) === 'pc' ? 'pc' : 'pi';
		} catch {
			return 'pi';
		}
	}

	$effect(() => {
		try {
			localStorage.setItem(storageKey, computer);
		} catch {
			// Only a convenience.
		}
	});

	const canExport = $derived(!exported && !!editor.project && !editor.busy && !!editor.cli?.found);

	function close() {
		editor.linuxGuide = undefined;
	}

	function exportInstaller() {
		close();
		void editor.runTask(commands.exportInstaller());
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	{@attach coversViewport}
	class="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-6 backdrop-blur-[3px]"
	role="dialog"
	aria-modal="true"
	aria-labelledby="linux-guide-title"
>
	<div class="flex max-h-full w-full max-w-[36rem] flex-col rounded-2xl shadow-dialog glass">
		<header class="flex flex-col gap-3 px-6 pt-6 pb-4">
			<div class="flex flex-col gap-1.5">
				<h2 id="linux-guide-title" class="flex items-center gap-2 text-base font-semibold">
					<BookOpen class="size-4 text-muted" /> Get your car's computer ready
				</h2>
				<p class="text-muted">
					SmartifyOS runs on Linux, so the car's computer needs that first. All it takes is a free
					program that writes Linux onto a memory card or USB stick, once per car.
				</p>
			</div>
			<Segmented label="What the car's computer is" options={computers} bind:value={computer} />
		</header>

		<ol class="selectable flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 pb-5">
			{#if computer === 'pi'}
				<li class="flex gap-3">
					{@render number(1)}
					<div class="flex flex-col gap-1.5">
						<span class="font-medium">Download {piImager.name}</span>
						<p class="text-muted">
							Raspberry Pi's own program for this. It downloads Linux by itself.
						</p>
						{@render link(piImager.url, `Download ${piImager.name}`)}
					</div>
				</li>

				<li class="flex gap-3">
					{@render number(2)}
					<div class="flex flex-col gap-1.5">
						<span class="font-medium">Write Raspberry Pi OS Lite onto the Pi's card</span>
						<p class="text-muted">
							Plug the Pi's SD card into this computer (or its NVMe drive, in a USB case). In
							{piImager.name} pick your Raspberry Pi, then
							<b class="text-fg">Raspberry Pi OS (other)</b> and
							<b class="text-fg">Raspberry Pi OS Lite (64-bit)</b>, then the card. Everything on the
							card is erased.
						</p>
					</div>
				</li>

				<li class="flex gap-3">
					{@render number(3)}
					<div class="flex flex-col gap-1.5">
						<span class="font-medium">Fill in the settings it offers</span>
						<p class="text-muted">
							Pick a username and password, SmartifyOS runs as that user. Add your Wi-Fi too, unless
							the Pi has a network cable: installing SmartifyOS needs the internet.
						</p>
					</div>
				</li>

				<li class="flex gap-3">
					{@render number(4)}
					<div class="flex flex-col gap-1.5">
						<span class="font-medium">Start the Pi</span>
						<p class="text-muted">
							Put the card back into the Pi, connect a screen and a keyboard, switch it on and log
							in with that username and password.
						</p>
					</div>
				</li>

				{@render install(5)}
			{:else}
				<li class="flex gap-3">
					{@render number(1)}
					<div class="flex flex-col gap-1.5">
						<span class="font-medium">Download Debian 13</span>
						<p class="text-muted">
							The Linux SmartifyOS runs on. On Debian's download page, take the
							<b class="text-fg">64-bit PC netinst</b> file, which ends in
							<code class="font-mono">.iso</code>.
						</p>
						{@render link(debianUrl, 'Go to the Debian download page')}
					</div>
				</li>

				<li class="flex gap-3">
					{@render number(2)}
					<div class="flex flex-col gap-1.5">
						<span class="font-medium">Download {flasher.name}</span>
						<p class="text-muted">
							A free program that writes the Debian installer onto a USB stick.
						</p>
						{@render link(flasher.url, `Download ${flasher.name}`)}
					</div>
				</li>

				<li class="flex gap-3">
					{@render number(3)}
					<div class="flex flex-col gap-1.5">
						<span class="font-medium">Write the Debian installer onto a USB stick</span>
						<p class="text-muted">
							{#if flasher === rufus}
								Plug in a USB stick and open Rufus. Pick the stick under
								<b class="text-fg">Device</b>, press <b class="text-fg">SELECT</b> and pick the
								<code class="font-mono">.iso</code>, then <b class="text-fg">START</b>. When it asks
								how to write it, pick <b class="text-fg">DD Image mode</b>.
							{:else}
								Plug in a USB stick. In balenaEtcher pick <b class="text-fg">Flash from file</b> and
								the <code class="font-mono">.iso</code>, then <b class="text-fg">Select target</b>
								and the stick, then <b class="text-fg">Flash</b>.
								{#if platform === 'darwin'}
									If your Mac says afterwards that it cannot read the stick, press Eject, that is
									expected.
								{/if}
							{/if}
							Everything on the stick is erased, so use another one than {exported
								? 'the one you just put the installer on'
								: "the one SmartifyOS's installer goes on"}.
						</p>
					</div>
				</li>

				<li class="flex gap-3">
					{@render number(4)}
					<div class="flex flex-col gap-1.5">
						<span class="font-medium">Install Debian on the car's computer</span>
						<p class="text-muted">
							Plug the stick into the car's computer and start it from the stick: right after
							switching it on, press the key that picks what it starts from (often F12, F11, F7 or
							Esc, it differs per computer). Then follow the installer. Leave the root password
							empty, so the user you make next can set everything up. SmartifyOS runs as that user.
							Installing erases the drive of the car's computer.
						</p>
					</div>
				</li>

				<li class="flex gap-3">
					{@render number(5)}
					<div class="flex flex-col gap-1.5">
						<span class="font-medium">Leave the desktop out</span>
						<p class="text-muted">
							When it asks what software to install, untick
							<b class="text-fg">Debian desktop environment</b> and <b class="text-fg">GNOME</b>,
							and leave only <b class="text-fg">standard system utilities</b> ticked. SmartifyOS brings
							its own screen. Once it restarts, take the stick out and log in.
						</p>
					</div>
				</li>

				{@render install(6)}
			{/if}
		</ol>

		<div class="flex justify-end gap-2 border-t border-line px-6 py-4">
			{#if canExport}
				<Button size="sm" onclick={exportInstaller}>
					<HardDriveDownload /> Export installer
				</Button>
			{/if}
			<!-- svelte-ignore a11y_autofocus -->
			<Button variant="primary" size="sm" autofocus onclick={close}>Done</Button>
		</div>
	</div>
</div>

{#snippet number(value: number)}
	<span
		class="grid size-6 shrink-0 place-items-center rounded-full border border-line bg-tint text-[13px] font-medium"
	>
		{value}
	</span>
{/snippet}

{#snippet link(url: string, text: string)}
	<a
		href={url}
		target="_blank"
		rel="noreferrer"
		class="flex items-center gap-2 self-start font-medium text-primary hover:underline"
	>
		<Download class="size-4" />
		{text}
	</a>
{/snippet}

{#snippet install(step: number)}
	<li class="flex gap-3">
		{@render number(step)}
		<div class="flex min-w-0 flex-1 flex-col gap-1.5">
			<span class="font-medium">Install SmartifyOS</span>
			<p class="text-muted">
				{#if exported}
					Plug the stick with the installer into the car and type this there:
				{:else if editor.project}
					Pick <b class="text-fg">Export installer</b> in the Export menu to put the installer on a USB
					stick. Plug it into the car and type this there:
				{:else}
					Once your car's app is made, pick <b class="text-fg">Export installer</b> in the Export menu
					to put the installer on a USB stick. Plug it into the car and type this there:
				{/if}
			</p>
			<pre
				class="rounded-xl border border-line bg-tint px-3.5 py-2.5 font-mono text-[13px] text-fg">sudo mount /dev/sda1 /mnt
bash /mnt/smartify-os/install.sh</pre>
			<p class="text-muted">
				If the stick is not <code class="font-mono">sda1</code>, typing
				<code class="font-mono">lsblk</code> lists the drives. It asks for your password once, needs the
				internet, and starts straight into SmartifyOS when it is done.
			</p>
		</div>
	</li>
{/snippet}
