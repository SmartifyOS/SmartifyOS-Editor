# SmartifyOS Editor

The editor for [SmartifyOS](https://smartify-os.com/), the open source car infotainment system built in Flutter. It is for people who would rather click than type: open your car's app, press Run, and see it live in the middle of the editor.

Everything it does to your car goes through the [SmartifyOS CLI](https://github.com/SmartifyOS/SmartifyOS-CLI), so the CLI on its own stays a complete, minimal way to do all of it.

> [!NOTE]
> Early days. The editor opens your car's app, remembers the ones you opened, shows what it runs, and runs it with a live preview and hot reload. Changing your car's settings from the editor comes next.

## What you need

- The SmartifyOS CLI. The editor tells you how to install it if it is missing.
- Flutter, the same as for the CLI.

## The live preview

Run starts your car's app with `smartify-os run` and puts its window into the editor's preview.

| System  | How                                                                                                                                                                                                |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Windows | The app's window becomes part of the editor's                                                                                                                                                      |
| Linux   | The same, through X11. On Wayland both the editor and the app run through XWayland, which every Wayland desktop has                                                                                |
| macOS   | macOS lets no program take in another's window, so the app's window is laid over the preview and moves, resizes and hides with the editor. This needs the Accessibility permission, asked for once |

Without the permission (or when anything else is in the way) the app simply runs in its own window. Inside the editor the app shows without its title bar, which needs a SmartifyOS that knows it runs in the editor.

| Key                | Does                           |
| ------------------ | ------------------------------ |
| Ctrl+P (⌘P)        | Run, or stop                   |
| Ctrl+R (⌘R)        | Hot reload, shows your changes |
| Ctrl+Shift+R (⇧⌘R) | Restart the app                |

## Working on it

You need [Bun](https://bun.sh). Everything else comes from `bun install`.

```bash
bun install
bun run dev        # the editor from source, with hot reload
bun run check      # typecheck, formatting and the dash rule. Run it before every push
bun run build      # build the window and the main process into out/
bun run dist       # installers for this computer, into release/
bun run dist:dir   # the same, unpacked, quicker to try
```

Set `SMARTIFY_OS_CLI` to another CLI to try the editor against it, for example a script that runs the CLI from its source:

```bash
SMARTIFY_OS_CLI=/path/to/smartify-os-dev bun run dev
```

Installers for every system are built by `.github/workflows/release.yml` when a `v*` tag is pushed: a `.dmg` for macOS (Apple Silicon and Intel), an installer `.exe` for Windows (x64 and ARM64), and an `.AppImage` and `.deb` for Linux (x64 and ARM64).
