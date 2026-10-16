# SmartifyOS Editor

The editor for [SmartifyOS](https://smartify-os.com/), the open source car infotainment system built in Flutter. It is for people who would rather click than type: open your car's app, press Run, and see it live in the middle of the editor.

> [!NOTE]
> Early days. The editor opens your car's app, remembers the ones you opened, shows what it runs, and runs it with a live preview and hot reload. Changing your car's settings from the editor comes next.

## Install

Download the editor for your computer from the [newest release](https://github.com/SmartifyOS/SmartifyOS-Editor/releases/latest):

| Computer                              | Download the file ending in                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| Mac with Apple Silicon (M1 and newer) | `mac-arm64.dmg`                                                                              |
| Mac with Intel                        | `mac-x64.dmg`                                                                                |
| Windows                               | `win-x64.exe`, or `win-arm64.exe` on an ARM PC                                               |
| Linux                                 | `linux-x86_64.AppImage`, or `linux-amd64.deb` for Debian and Ubuntu (`arm64` instead on ARM) |

- **macOS**: open the `.dmg` and drag SmartifyOS Editor into Applications.
- **Windows**: run the `.exe` and follow the installer.
- **Linux**: make the `.AppImage` runnable (right click, Properties, allow executing, or `chmod +x` it) and open it, or install the `.deb`.

On Windows the editor is not signed, so the first time you open it Windows warns you about it: click More info and then Run anyway.

### What else you need

- The [SmartifyOS CLI](https://github.com/SmartifyOS/SmartifyOS-CLI), which does the actual work behind the editor. The editor tells you how to install it if it is missing.
- [Flutter](https://docs.flutter.dev/get-started/install), the same as for the CLI.

## Using it

Open your car's app, the folder with `pubspec.yaml` in it, and press Run. Your app starts and shows in the middle of the editor, and every change you save shows up with a hot reload.

On macOS the editor asks once for the Accessibility permission. It needs it to keep your app's window lined up with the preview while you move or resize the editor. Without it your app simply runs in a window of its own.

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
bun run release    # cut a release, for the maintainer
```

Set `SMARTIFY_OS_CLI` to another CLI to try the editor against it, for example a script that runs the CLI from its source:

```bash
SMARTIFY_OS_CLI=/path/to/smartify-os-dev bun run dev
```

`bun run release` walks through a release: it asks for the version and an optional summary, writes the release notes from the `feat:`, `fix:` and `refactor:` commits since the last one, bumps package.json, commits and tags it, and pushes both. `bun run release --dry-run` asks the same and changes nothing. The tag starts `.github/workflows/release.yml`, which builds the installers and publishes them with those notes: a `.dmg` for macOS (Apple Silicon and Intel), an installer `.exe` for Windows (x64 and ARM64), and an `.AppImage` and `.deb` for Linux (x64 and ARM64).
