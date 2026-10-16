The editor for SmartifyOS, the open source car infotainment system built in Flutter.

It is for people doing something like programming for the first time. The CLI (the separate SmartifyOS-CLI repo) stays complete on its own for anyone who wants something small; this editor is the friendly face on top of it, with a live preview of the car's app in the middle, laid out like Unity.

## The one rule

**The editor never does the CLI's work.** Anything that changes a car, reads a car or runs Flutter is a CLI command run with `--json` (the protocol is in the CLI's README and `src/ui/json.ts`, mirrored in `shared/cli.ts`). If the editor needs something the CLI cannot do yet, the CLI gets it first. What belongs here is only what makes no sense in a terminal: the layout, the live preview, recent projects, and later editing settings with the preview following along.

## Tech stack

- **Electron** for the window on macOS, Windows and Linux.
- **SvelteKit** (Svelte 5, runes only) for the window, as a static single page with the hash router, served by Electron from `app://editor/`.
- **Tailwind CSS 4**, every color a token in `src/routes/layout.css`. Dark only: near black surfaces edge to edge, hairline borders of white at a few percent, rounded controls with a faint top highlight, glass for menus and dialogs. Text is 14px and controls 32 to 36px tall; nothing smaller than 12px.
- **Every button is `ui/Button.svelte`** (variants `primary`, `outline`, `ghost`, `ghost-muted`), with `ui/Kbd.svelte` for shortcuts and `ui/Select.svelte` for choices.
- **unplugin-icons** for every icon, from the Lucide Iconify set: `import Play from '~icons/lucide/play'`. Never draw an icon by hand.
- **koffi** for the few native calls the live preview needs (Win32, Xlib, macOS Accessibility). The only runtime dependency.
- **Bun** for installing, scripts and the dev runner. **esbuild** bundles the main process and preload. **electron-builder** packages.

## Structure

```
shared/              the IPC contract (api.ts) and the CLI's JSON protocol (cli.ts), used by both sides
electron/main.ts     the window, the app:// protocol, the menu, every IPC handler
electron/preload.ts  puts window.smartify on the page, nothing else
electron/cli/        finding the CLI, running jobs with --json, the console
electron/preview/    the live preview: session.ts runs `smartify-os run`, one embedder per system
electron/native/     the koffi bindings, each loaded only on its own system
electron/projects.ts the open project and the recent ones, read through the CLI
electron/store.ts    what the editor remembers, one JSON file in userData
resources/           the app icons, made from icon-source.png by scripts/make-icons.py
src/lib/state/       the window's reactive state (editor.svelte.ts), the only user of window.smartify
src/lib/components/  the panels, the title bar, the start screen, the CLI prompt dialog
scripts/             dev runner, build, the dash check, the icons, the new car screenshots
```

- **The window only talks to the main process through `window.smartify`**, whose shape is `SmartifyApi` in `shared/api.ts`. A new call goes into the contract, the preload and a handler in `main.ts`, with its channel name in `channels`.
- **A question the CLI asks shows up as a `prompt` event** and is answered by the generic `PromptDialog`. A new command needs nothing in the window to be usable.
- **The running app is a real window above the page.** Anything drawn over the viewport (a menu, a dialog) uses the `coversViewport` attachment so the app hides meanwhile.

## Creating a car

`NewCarDialog` asks what `smartify-os create` asks, a page at a time, with a screenshot of every layout, driver's side and bar (all 36 combinations, so every picture shows the choices already made). The answers go to the CLI as flags, and `create --dry-run` checks them on the page they were typed on before anything is created. The layouts are a copy of the CLI's list, so a new built-in layout is a change in both, and new screenshots: `bun scripts/make-screenshots.ts` (macOS, needs Flutter and `cwebp`) runs a copy of the Miata app in each and writes `src/lib/assets/new-car/`.

## The live preview

`PreviewSession` starts `smartify-os run --json` in the project, finds the app's window among the CLI's descendant processes, and hands it to an `Embedder`:

- **Windows**: `SetParent` into the editor's window, frame taken off (`embed-windows.ts`).
- **Linux**: `XReparentWindow` (`embed-x11.ts`). The editor forces itself onto X11 and runs the app with `GDK_BACKEND=x11`, since Wayland allows no reparenting.
- **macOS**: no reparenting exists. The app's window is moved, sized and hidden with the Accessibility API to sit over the viewport (`embed-macos.ts`), and the editor keeps it directly in front by ordering its own window right behind it (AppKit allows that for your own window). Needs the Accessibility permission, which is granted per app (so per signing identity).

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
