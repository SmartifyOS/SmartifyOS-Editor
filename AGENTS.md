The desktop editor for SmartifyOS, the open source car infotainment system built in Flutter.

It is for people doing something like programming for the first time. The CLI (the separate SmartifyOS-CLI repo) stays complete on its own for anyone who wants something small; this editor is the friendly face on top of it, with a live preview of the car's app in the middle, laid out like Unity.

## The one rule

**The editor never does the CLI's work.** Anything that changes a car, reads a car or runs Flutter is a CLI command run with `--json` (the protocol is in the CLI's README and `src/ui/json.ts`, mirrored in `shared/cli.ts`). If the editor needs something the CLI cannot do yet, the CLI gets it first. What belongs here is only what makes no sense in a terminal: the layout, the live preview, recent projects, and later editing settings with the preview following along.

## Tech stack

- **Electron** for the window on macOS, Windows and Linux.
- **SvelteKit** (Svelte 5, runes only) for the window, as a static single page with the hash router, served by Electron from `app://editor/`.
- **Tailwind CSS 4**, every color a token in `src/routes/layout.css`. Dark only.
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
src/lib/state/       the window's reactive state (editor.svelte.ts), the only user of window.smartify
src/lib/components/  the panels, the title bar, the start screen, the CLI prompt dialog
scripts/             dev runner, build, the dash check
```

- **The window only talks to the main process through `window.smartify`**, whose shape is `SmartifyApi` in `shared/api.ts`. A new call goes into the contract, the preload and a handler in `main.ts`, with its channel name in `channels`.
- **A question the CLI asks shows up as a `prompt` event** and is answered by the generic `PromptDialog`. A new command needs nothing in the window to be usable.
- **The running app is a real window above the page.** Anything drawn over the viewport (a menu, a dialog) uses the `coversViewport` attachment so the app hides meanwhile.

## The live preview

`PreviewSession` starts `smartify-os run --json` in the project, finds the app's window among the CLI's descendant processes, and hands it to an `Embedder`:

- **Windows**: `SetParent` into the editor's window, frame taken off (`embed-windows.ts`).
- **Linux**: `XReparentWindow` (`embed-x11.ts`). The editor forces itself onto X11 and runs the app with `GDK_BACKEND=x11`, since Wayland allows no reparenting.
- **macOS**: no reparenting exists. The app's window is moved, sized, raised and hidden with the Accessibility API to sit over the viewport (`embed-macos.ts`). Needs the Accessibility permission, which is granted per app (so per signing identity).

The window reports the viewport's rectangle in CSS pixels, or `null` while it is covered; the session turns it into client pixels (Windows, X11) or screen points (macOS). Hot reload and restart are `{"input":"r"}` and `{"input":"R"}` on the CLI's stdin.

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
```

`SMARTIFY_OS_CLI` points the editor at another CLI binary or script, for trying both repos together.
