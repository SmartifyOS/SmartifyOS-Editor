The editor for SmartifyOS, the open source car infotainment system built in Flutter.

It is for people doing something like programming for the first time. The CLI (the separate SmartifyOS-CLI repo) stays complete on its own for anyone who wants something small; this editor is the friendly face on top of it, with a live preview of the car's app in the middle, laid out like Unity.

## The one rule

**The editor never does the CLI's work.** Anything that changes a car, reads a car or runs Flutter is a CLI command run with `--json` (the protocol is in the CLI's README and `src/ui/json.ts`, mirrored in `shared/cli.ts`). If the editor needs something the CLI cannot do yet, the CLI gets it first. What belongs here is only what makes no sense in a terminal: the layout, the live preview, recent projects, and later editing settings with the preview following along.

## Tech stack

- **Electron** for the window on macOS, Windows and Linux.
- **SvelteKit** (Svelte 5, runes only) for the window, as a static single page with the hash router, served by Electron from `app://editor/`.
- **Tailwind CSS 4**, every color a token in `src/routes/layout.css`. Dark only: near black surfaces edge to edge, hairline borders of white at a few percent, rounded controls with a faint top highlight, glass for menus and dialogs. Text is 14px and controls 32 to 36px tall; nothing smaller than 12px.
- **Every button is `ui/Button.svelte`** (variants `primary`, `outline`, `ghost`, `ghost-muted`), with `ui/Kbd.svelte` for shortcuts, `ui/Select.svelte` for choices, `ui/Segmented.svelte` for a few side by side, `ui/Switch.svelte` for on and off, `ui/TextField.svelte` for a line of text and `ui/NumberField.svelte` for a number (both taken on Enter or when left, not on every key), `ui/AddField.svelte` for adding something to a list (Enter or its Add button), `ui/Slider.svelte` (taken when let go) and `ui/ColorField.svelte`.
- **unplugin-icons** for every icon, from the Lucide Iconify set: `import Play from '~icons/lucide/play'`. A brand's own logo comes from the `logos` set (`~icons/logos/visual-studio-code`), and from `mdi` in one colour where it sits on the accent colour (`~icons/mdi/microsoft-visual-studio-code`). Never draw an icon by hand. The car's own icons (Flutter's `Icons`, which a window, tile, widget or settings page has) are `CarIcon.svelte`: the Lucide one for the few the editor offers first, otherwise the Material icon from the `ic` set, loaded whole the first time one is needed (`lib/materialIcons.svelte.ts`). `IconPicker.svelte` picks one, with every icon behind "More icons".
- **koffi** for the few native calls the live preview needs (Win32, Xlib, macOS Accessibility). The only runtime dependency.
- **Bun** for installing, scripts and the dev runner. **esbuild** bundles the main process and preload. **electron-builder** packages.

## Structure

```
shared/              the IPC contract (api.ts) and the CLI's JSON protocol (cli.ts), used by both sides
electron/main.ts     the window, the app:// protocol, the menu, every IPC handler
electron/preload.ts  puts window.smartify on the page, nothing else
electron/cli/        finding the CLI, installing it, running jobs with --json, the console
electron/preview/    the live preview: session.ts runs `smartify-os run`, one embedder per system
electron/native/     the koffi bindings, each loaded only on its own system
electron/projects.ts the open project and the recent ones, read through the CLI
electron/watch.ts    the open project's lib/ and pubspec.yaml, so an edit in VS Code shows in the window
electron/vscode.ts   finding VS Code where it installs itself, and opening a folder in it
electron/store.ts    what the editor remembers, one JSON file in userData
electron/settings.ts what the settings page changes, and what each is by default
resources/           the app icons, made from icon-source.png by scripts/make-icons.py
src/lib/state/       the window's reactive state (editor.svelte.ts), the only user of window.smartify
src/lib/commands.ts  every CLI command the window runs on the car, with its arguments
src/lib/exports.ts   what the Export menu (and the inspector) can put on a USB stick
src/lib/carActions.ts what the right click menu of each row in the car panel offers
src/lib/look.ts      the built-in layouts, themes, bars and ways to draw the car, a copy of the CLI's
src/lib/setup.ts     the setup pages, and the editor's words for every setting on them
shared/next-steps.ts the editor's words for the steps the CLI suggests after a command
electron/catalog.ts  the recommended extensions, catalog/extensions.json for now
src/lib/components/  the panels, the title bar, the start screen, the dialogs, settings/
src/routes/          the editor (or start screen) at #/, the settings page at #/settings
scripts/             dev runner, build, the dash check, the icons, the new car screenshots
```

- **The window only talks to the main process through `window.smartify`**, whose shape is `SmartifyApi` in `shared/api.ts`. A new call goes into the contract, the preload and a handler in `main.ts`, with its channel name in `channels`.
- **A question the CLI asks shows up as a `prompt` event** and is answered by the generic `PromptDialog`. A new command needs nothing in the window to be usable.
- **The running app is a real window above the page.** Anything drawn over the viewport (a menu, a dialog) uses the `coversViewport` attachment so the app hides meanwhile.

## Working on the car

Everything the car panel and the inspector do (extensions, updating SmartifyOS, linking, devices, the USB sticks) is a command in `src/lib/commands.ts`, run with `editor.runTask`. The task dialog shows its steps and asks its questions inline (`PromptForm`), and once it is over the car is read again, the running app restarted when the car changed. A new command is one entry there and a button. Every row of the car panel also has a right click menu (`ui/ContextMenu.svelte`) with what its inspector does, listed in `src/lib/carActions.ts`, so a new action for a row goes there too. Whether there are updates is asked quietly with `cli.query` (`update --check`, `extension update --check`), which prints nothing to the console.

What the CLI says to do next comes as `data.steps` on a `note`, each with a `kind`. The CLI's words name commands to type, so `shared/next-steps.ts` says each kind the editor's way (a kind it does not know is said the CLI's way).

The add extension dialog lists the extensions the editor recommends, from `catalog.extensions()`. They ship with the editor in `electron/catalog/extensions.json` (a GitHub address, a title and a description each), until the list moves to a server where people can send in their own.

Opening in VS Code looks where its installers put it on every system before PATH, since `code` is not on PATH by default. When it is not there, `VsCodeDialog` links the download and the VS Code extensions worth adding.

## How the car looks

The Screen, car and About setup pages (see below) edit how the car looks (layout, theme, driver's side, bar, the 3D model, drawing or picture) and its About page, with their state in `state/look.svelte.ts`. Two sources: `lib/main.dart`, read with `appearance --show` and written by `appearance` and `about` (which is what lasts), and the running app, asked through `preview.call` (`describe`, `configure`, see `call` in the CLI's README) for its own layouts and themes and to show a change at once. A change goes to the running app first and is then written by the CLI, one at a time, with no task dialog. A new picture of the car only shows after a hot restart, which the editor does by itself. Something new the editor should change live is a parameter of `configure` in core's `EditorBridge` first, then a flag of a CLI command.

## Setting up the car

Everything else the car's `lib/main.dart` hands `SmartifyOs().init` that is plain data (how the 3D model sits and which of its parts move, the info display, Bluetooth, the reverse camera, the built-ins to leave out and the rest) is a setting of the CLI's `config`, by its key: `car.model3D.scale`. The car panel's Setup group has a page for each part (`setupAreas` in `src/lib/setup.ts`), shown by `setup/SetupInspector.svelte`. A page that is only settings is a list of folds in `fieldPages`, each setting drawn by `setup/ConfigField.svelte` with the control its type wants; the Screen, car, info display, About and built-ins pages have components of their own. The CLI says what each setting is and its default, the editor only what it is called and where it goes, so a new setting is a field in the CLI's schema and a line in `setup.ts`.

`state/config.svelte.ts` writes one change at a time, shows it at once (and keeps showing every change still waiting over what the CLI reports, so nothing flickers back), and takes a setting back to its default instead of writing the default. How the 3D model sits and is lit, and the info display, go to the running app at once too (`configure`, while a slider is dragged as well), when its `describe` lists them under `live`. Everything else SmartifyOS reads when it starts, so once every change is written the running app is restarted and what the page is about put on screen again (`show` in `setupAreas`). A setting written as code is only shown, with a way to it in VS Code. The wheels and steering wheel are picked from the names of the model's objects and the drawing's groups, which `appearance` reports.

An extension's inspector shows its settings the same way, through the CLI's `extension settings` (`state/extensionSettings.svelte.ts`, `ExtensionSettings.svelte`): the arguments its class takes, with its doc comments as the explanations, cut to a sentence with "More". One that is another class of the extension's is `ObjectSetting.svelte`, folded away and only asked about (`--describe`) once opened: which of its ready-made ones or constructors it is, and that one's settings, nested the same way. A list or map setting is `CollectionSetting.svelte`, its items drawn the same way, each by its key in brackets (`voices[de]`). `ConfigField` draws any `SettingsStore`, the car's or an extension's. Above them, `ExtensionAdds.svelte` lists what the extension added while the running app set it up (`extensions` in `describe`, matched by its class), a few of each, each put on screen with a click.

The preview takes the shape of the car's screen, `display.windowSize` in its `lib/main.dart`, unless another is picked.

## Windows, tiles and widgets

The car panel lists the app's own windows, quick settings tiles and home screen widgets, each with a "New" row opening `NewPartDialog` (a name, what kind, an icon). The CLI makes, reads, renames and removes them (`window`, `tile`, `widget`, see `partCommands`), and `state/parts.svelte.ts` restarts the running app after every change, since new code only runs after a restart. Making one opens it in VS Code at the line where what it shows or does is written. The inspector explains each one, puts it on screen in the preview (`show`), and edits its name, icon and order, and for a window whether it is in the app list (taking it out leaves a window the app opens itself, which `show` cannot open). The words for each kind and the icons are in `src/lib/parts.ts`, the icons a copy of the CLI's list. The CLI also lists the ones written some other way (several in a list of the owner's, a window's icon in an app list of their own), with `canChange` saying what it cannot change, and the inspector only shows those and opens them in VS Code. Since a file can hold several, the car panel picks them by `partKey`.

## Settings pages

The car's own settings pages are a section of the car panel, made in `NewSettingsPageDialog` and edited in `SettingsPageInspector` (the page) and `SettingsRowCard` (each row), all through the CLI's `settings` commands (see `settingsCommands`). A page written some other way than the CLI writes them is listed too, with `editable` false, and only shown. `state/settings.svelte.ts` runs changes one at a time, and after each restarts the running app and opens the page in it again (`show`, asked again until the restarted app knows it), so the preview follows the page being made. A switch or a choice can remember its value (a `SavedValue` in core, which the app reads as `<name>.value`) and run code of the owner's, the two independent of each other.

## Trying out the CAN bus

While the app runs, `state/bus.svelte.ts` follows its CAN bus through `preview.call` (`canDescribe` every two seconds, `canTraffic` every half second), and the car panel lists every device on it, the ones without a program too (selection `canDevice`), with a dot for the ones that are there. The devices the app defines come from `device list` (`defined`) too, so they are listed while the app is not running. `BusSimulator.svelte` in the inspector sends a device's messages into the app as if the device had (`canSend`, the messages whose `from` is that device), pretends the device is connected (`canDevice`, switched on again after a restart of the app), and logs what went each way. All of it is core's `EditorBridge`, nothing goes through the CLI's commands.

## Boards on a USB cable

A car with only one or two boards can leave the CAN bus out: a board on a USB cable (an ESP32, an Arduino Uno or Nano) is a `SerialDevice` in the car's app, listed by `device list` (`usb`) and in the car panel's Devices next to the ones on the bus (selection `usbDevice`), marked USB. `UsbDeviceInspector.svelte` changes what the driver reads and the speed (`device edit`, which changes the speed in its sketch too), makes its program (`device create <name> --usb`), puts it on the board, and exports it to a USB stick (`device export`), from which the car writes it onto the board itself once the driver taps Update on the stick's notification (core's `StickOffers`, one notification for everything on a stick, SmartifyOS updates and CAN devices included). Which port a board is on is never a setting: the car finds it by itself, since the sketch the CLI makes says which device it is when asked (`smartify-os:<name>`), and the editor runs on another computer than the car anyway. `state/serial.svelte.ts` follows the running app's boards through `preview.call` (`serialDescribe`, `serialTraffic`) the way the bus is followed, and `SerialSimulator.svelte` sends lines into the app as if the board printed them (`serialSend`, a field for each value the app listens for), makes it count as plugged in (`serialDevice`) and logs what went each way. Putting a program on any board stops the running app meanwhile (`stopsApp` on the task), since the app may have the board's port open.

## This computer and the settings

When the editor finds no CLI at all it installs it, by itself and in the task dialog: `InstallJob` (`electron/cli/install.ts`) runs the CLI's own installer from smartify-os.com (`install.sh`, or `install.ps1` on Windows), which puts it where `findCli` looks first and on PATH for a terminal. It never installs over one pointed at with `SMARTIFY_OS_CLI`. The first time the editor finds the CLI it runs `smartify-os setup` in the task dialog (Flutter unless there is one, PlatformIO and building for Android if wanted), and remembers that it did (`setUp` in the store), however it went. After that it only asks `doctor` quietly, and the start screen says when something SmartifyOS cannot work without is missing. The settings page (`#/settings`, the gear in the title bar, Cmd+, or Ctrl+,) has the doctor first: every check, with a button for the ones a command puts right (`fix` in the CLI's report), which is how building for Android (`setup --android`) or PlatformIO is set up later. Export for Android asks to install what building for Android needs too, when it is missing. A new setting goes into `Settings` in `shared/api.ts`, its default into `electron/settings.ts`, and a row into `settings/Settings.svelte`.

## Creating a car

`NewCarDialog` asks what `smartify-os create` asks, a page at a time, with a screenshot of every layout, driver's side and bar (all 36 combinations, so every picture shows the choices already made). The answers go to the CLI as flags, and `create --dry-run` checks them on the page they were typed on before anything is created. The layouts are a copy of the CLI's list, so a new built-in layout is a change in both, and new screenshots: `bun scripts/make-screenshots.ts` (macOS, needs Flutter and `cwebp`) runs a copy of the Miata app in each and writes `src/lib/assets/new-car/`.

## The live preview

`PreviewSession` starts `smartify-os run --json` in the project, finds the app's window among the CLI's descendant processes, and hands it to an `Embedder`:

- **Windows**: `SetParent` into the editor's window, frame taken off (`embed-windows.ts`).
- **Linux**: `XReparentWindow` (`embed-x11.ts`). The editor forces itself onto X11 and runs the app with `GDK_BACKEND=x11`, since Wayland allows no reparenting.
- **macOS**: no reparenting exists, and macOS will not group another app's window with yours. The app's window is moved, sized and hidden with the Accessibility API to sit over the viewport (`embed-macos.ts`). Keeping it in front is core's job (`SmartifyOsCorePlugin.swift` in smartify_os_core): while the editor or the app is the app in front, the window floats above every normal window, so clicking the editor cannot cover it, and when anything else comes to the front it goes back to normal directly above the editor's window (only the app can put its own window there). Core also keeps the window from being dragged, and the editor puts it back if macOS moved it some other way (`recheck`). The editor tells it who it is with `SMARTIFY_OS_EDITOR_PID` and `SMARTIFY_OS_EDITOR_WINDOW`. For an older core the editor orders its own window right behind the app's after every click instead (AppKit allows that for your own window), which flickers. Needs the Accessibility permission, which is granted per app (so per signing identity).

The app is run with `SMARTIFY_OS_EDITOR=1`, which tells SmartifyOS core (`_initWindow` in smartify_os_core) to leave out its title bar and window buttons, its shadow, full screen and taking the focus. Nothing outside an app can take a macOS title bar away, so this needs a core that knows the variable.

The window reports the viewport's rectangle in CSS pixels, or `null` while it is covered; the session turns it into client pixels (Windows, X11) or screen points (macOS). Hot reload and restart are `{"input":"r"}` and `{"input":"R"}` on the CLI's stdin.

## Updates

`electron/updates.ts` keeps the editor and the CLI up to date, shown to the user as one thing (the status bar on the left, and a dialog once a restart is needed). Users never hear that there is a CLI behind it.

- **The editor** updates with electron-updater from the GitHub releases: it downloads in the background, and a restart (or the next quit) installs it. electron-builder writes the update files (`latest-mac.yml`, `latest.yml`, `latest-linux.yml`, `latest-linux-arm64.yml` and the `.blockmap` files) because of `publish:` in electron-builder.yml, and release.yml uploads them, merging the two Mac and the two Windows builds' files with `scripts/merge-update-info.ts`. macOS only installs updates of a signed app.
- **The CLI** updates with `smartify-os self-update --json`, as soon as no CLI job runs (Windows cannot replace a running program). It needs no restart.

Background checks stay quiet unless they find something. A check the user asks for (the version in the status bar, or Check for Updates in the macOS app menu) also says it is up to date, or why it failed.

### Trying updates

Set `SMARTIFY_OS_UPDATE_URL` to a folder served over HTTP with a `latest-mac.yml` (or the one for your system) and the zip it names, with a higher version than package.json, and run `bun run dev`. Everything up to the restart works from source; installing it needs a packaged, signed app.

## Writing style

- Never use em dashes or en dashes, anywhere: UI strings, comments, docs. Use a comma, parentheses or a separate sentence. `scripts/check-dashes.ts` (part of `bun run check`) fails on either.
- Spell the project name out in full, `SmartifyOS` or `smartify-os`, never `Smartify` on its own.
- UI text is friendly and plain, written for someone who has never programmed: "your car's app", not "the Flutter project".

## Working on it

```bash
bun install
bun run dev        # Vite with hot reload, the main process rebuilt and restarted on change
bun run check      # typecheck both sides, prettier, the dash check
bun run dist:dir   # an unpacked app for this computer in release/
bun run release    # cut a release (scripts/release.ts), --dry-run to only look
```

`SMARTIFY_OS_CLI` points the editor at another CLI binary or script, for trying both repos together.

Releases are cut with `bun run release` and nothing else. It checks the repo, asks for the version and an optional summary, bumps package.json in a `chore: release vX` commit, and pushes a `vX` tag whose message is the release notes (the `feat:`, `fix:` and `refactor:` commits since the last tag). The release workflow checks the tag against package.json, builds every installer and publishes the tag's message as the release notes. The same script is in SmartifyOS-CLI; keep the two alike.

The Mac builds in release.yml are signed with a Developer ID certificate and notarized by Apple, from the repo secrets `MAC_CERTIFICATE` (the .p12, base64), `MAC_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID`. Without them the Mac builds come out unsigned. Windows and Linux are not signed.
