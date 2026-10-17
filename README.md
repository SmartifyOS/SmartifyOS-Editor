# SmartifyOS Editor

The editor for [SmartifyOS](https://smartify-os.com/), the open source car infotainment system built in Flutter. It is for people who would rather click than type: open your car's app, press Run, and see it live in the middle of the editor.

> [!NOTE]
> Early days. The editor opens your car's app, remembers the ones you opened, shows what it runs, and runs it with a live preview and hot reload. Changing your car's settings from the editor comes next.

## Install

Click the button for your computer, it downloads the newest version.

<p align="center">
  <a href="https://github.com/SmartifyOS/SmartifyOS-Editor/releases/latest/download/smartify-os-editor-mac-arm64.dmg"><img alt="Download for macOS, Apple Silicon" src="https://img.shields.io/badge/macOS-Apple_Silicon-000000?style=for-the-badge&logo=apple&logoColor=white"></a>
  <a href="https://github.com/SmartifyOS/SmartifyOS-Editor/releases/latest/download/smartify-os-editor-mac-x64.dmg"><img alt="Download for macOS, Intel" src="https://img.shields.io/badge/macOS-Intel-555555?style=for-the-badge&logo=apple&logoColor=white"></a>
</p>
<p align="center">
  <a href="https://github.com/SmartifyOS/SmartifyOS-Editor/releases/latest/download/smartify-os-editor-win-x64.exe"><img alt="Download for Windows, x64" src="https://img.shields.io/badge/Windows-x64-0078D4?style=for-the-badge&logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0zIDEyVjYuNzVsNi0xLjMydjYuNDh6bTE3LTl2OC43NWwtMTAgLjE1VjUuMjF6TTMgMTNsNiAuMDl2Ni44MWwtNi0xLjE1em0xNyAuMjVWMjJsLTEwLTEuOTFWMTMuMXoiLz48L3N2Zz4="></a>
  <a href="https://github.com/SmartifyOS/SmartifyOS-Editor/releases/latest/download/smartify-os-editor-win-arm64.exe"><img alt="Download for Windows, ARM64" src="https://img.shields.io/badge/Windows-ARM64-005A9E?style=for-the-badge&logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0zIDEyVjYuNzVsNi0xLjMydjYuNDh6bTE3LTl2OC43NWwtMTAgLjE1VjUuMjF6TTMgMTNsNiAuMDl2Ni44MWwtNi0xLjE1em0xNyAuMjVWMjJsLTEwLTEuOTFWMTMuMXoiLz48L3N2Zz4="></a>
</p>
<p align="center">
  <a href="https://github.com/SmartifyOS/SmartifyOS-Editor/releases/latest/download/smartify-os-editor-linux-x86_64.AppImage"><img alt="Download the AppImage for Linux, x64" src="https://img.shields.io/badge/Linux-AppImage_x64-E95420?style=for-the-badge&logo=linux&logoColor=white"></a>
  <a href="https://github.com/SmartifyOS/SmartifyOS-Editor/releases/latest/download/smartify-os-editor-linux-arm64.AppImage"><img alt="Download the AppImage for Linux, ARM64" src="https://img.shields.io/badge/Linux-AppImage_ARM64-C34113?style=for-the-badge&logo=linux&logoColor=white"></a>
</p>
<p align="center">
  <a href="https://github.com/SmartifyOS/SmartifyOS-Editor/releases/latest/download/smartify-os-editor-linux-amd64.deb"><img alt="Download the .deb for Debian and Ubuntu, x64" src="https://img.shields.io/badge/Debian,_Ubuntu-x64-A81D33?style=for-the-badge&logo=debian&logoColor=white"></a>
  <a href="https://github.com/SmartifyOS/SmartifyOS-Editor/releases/latest/download/smartify-os-editor-linux-arm64.deb"><img alt="Download the .deb for Debian and Ubuntu, ARM64" src="https://img.shields.io/badge/Debian,_Ubuntu-ARM64-7A1525?style=for-the-badge&logo=debian&logoColor=white"></a>
</p>

Not sure which one? A Mac from 2021 or later is almost always Apple Silicon (Apple menu, About This Mac says "Apple M1" or newer). Almost every Windows and Linux computer is x64. Older versions are on the [releases page](https://github.com/SmartifyOS/SmartifyOS-Editor/releases).

- **macOS**: open the `.dmg` and drag SmartifyOS Editor into Applications.
- **Windows**: run the `.exe` and follow the installer. The editor is not signed, so the first time Windows warns you about it: click More info and then Run anyway.
- **Linux**: make the `.AppImage` runnable (right click, Properties, allow executing, or `chmod +x` it) and open it, or install the `.deb`.

That is all. The first time it starts, the editor installs everything else it needs by itself: the [SmartifyOS CLI](https://github.com/SmartifyOS/SmartifyOS-CLI), which does the work behind the editor, and [Flutter](https://flutter.dev), which builds your car's app (unless this computer has it already). Both go into your home folder and need no administrator rights.

## Using it

Open your car's app, the folder with `pubspec.yaml` in it, and press Run. Your app starts and shows in the middle of the editor, and every change you save shows up with a hot reload.

The editor keeps itself up to date. Updates download in the background, and once one is ready it asks you to restart (or it is put in place the next time you quit).

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
