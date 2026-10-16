/**
 * Makes the screenshots the "Create your car's app" dialog shows: the Miata app in every
 * layout, with the driver on either side and every kind of bar, as
 * src/lib/assets/new-car/<layout>-<side>-<bar>.webp.
 *
 *   bun scripts/make-screenshots.ts [path to the SmartifyOS repo, ../SmartifyOS by default]
 *
 * macOS only, and it needs Flutter and cwebp (`brew install webp`). It copies the Miata app
 * somewhere temporary, so the SmartifyOS repo is never touched, and changes the copy's
 * main.dart to take the layout, side and bar from the environment, to leave out the counter
 * card, and to save a picture of itself and quit. Building it takes a few minutes, every
 * picture after that about ten seconds.
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repo = resolve(process.argv[2] ?? join(import.meta.dir, '..', '..', 'SmartifyOS'));
const miata = join(repo, 'smartify_os_miata_app');
const out = join(import.meta.dir, '..', 'src', 'lib', 'assets', 'new-car');
const bundleId = 'com.smartifyos.editorscreenshots';

const layouts = ['classic', 'split', 'sidebar', 'tiles', 'focus', 'portrait'];
const sides = ['left', 'right'];
const bars = ['info', 'dock', 'both'];

if (process.platform !== 'darwin') throw new Error('This only runs on macOS.');
if (!existsSync(miata)) throw new Error(`There is no Miata app in ${repo}.`);

async function run(cmd: string[], cwd?: string): Promise<void> {
	const proc = Bun.spawn(cmd, { cwd, stdout: 'inherit', stderr: 'inherit' });
	if ((await proc.exited) !== 0) throw new Error(`${cmd.join(' ')} failed.`);
}

/** Replaces `from` in `text`, failing loudly when the Miata app no longer has it. */
function swap(text: string, from: string | RegExp, to: string): string {
	const changed = text.replace(from, to);
	if (changed === text) throw new Error(`The Miata app's main.dart has changed: ${String(from)}`);
	return changed;
}

const work = mkdtempSync(join(tmpdir(), 'smartify-os-screenshots-'));
const app = join(work, 'miata');
console.log(`Working in ${work}`);

try {
	await run(['rsync', '-a', '--exclude', 'build', '--exclude', '.dart_tool', `${miata}/`, app]);

	// The copy lives elsewhere, so the packages next to the Miata app are named in full.
	const overrides = join(app, 'pubspec_overrides.yaml');
	if (existsSync(overrides)) {
		const text = await Bun.file(overrides).text();
		await Bun.write(overrides, text.replaceAll('path: ../', `path: ${repo}/`));
	}

	// A bundle id of its own keeps the Miata's saved settings out of it, and without the
	// sandbox it can write its picture anywhere.
	const info = join(app, 'macos', 'Runner', 'Configs', 'AppInfo.xcconfig');
	await Bun.write(
		info,
		(await Bun.file(info).text()).replace(
			/PRODUCT_BUNDLE_IDENTIFIER = .*/,
			`PRODUCT_BUNDLE_IDENTIFIER = ${bundleId}`
		)
	);
	const entitlements = join(app, 'macos', 'Runner', 'Release.entitlements');
	await Bun.write(
		entitlements,
		swap(await Bun.file(entitlements).text(), /(app-sandbox<\/key>\s*)<true\/>/, '$1<false/>')
	);

	const mainPath = join(app, 'lib', 'main.dart');
	let main = await Bun.file(mainPath).text();
	main = swap(
		main,
		"import 'package:flutter/material.dart';",
		"import 'dart:io';\nimport 'dart:ui' as ui;\n\nimport 'package:flutter/material.dart';\nimport 'package:flutter/rendering.dart';"
	);
	// No counter card, and the window the size of a car's screen.
	main = swap(
		main,
		'homeWidgets: HomeWidgetsConfig(widgets: miataHomeWidgets),',
		`homeWidgets: HomeWidgetsConfig(
      widgets: miataHomeWidgets.where((w) => w.id != counterWidgetId).toList(),
    ),
    display: DisplayConfig(
      fullScreen: false,
      windowSize: _env('SHOT_LAYOUT') == 'portrait' ? const Size(600, 1024) : const Size(1024, 600),
    ),`
	);
	// Only the layouts and themes every car gets.
	main = swap(main, 'layout: Layouts.classic,', 'layout: _layout(),');
	main = swap(
		main,
		'layouts: miataLayouts,',
		"driverSide: _env('SHOT_SIDE') == 'right' ? DriverSide.right : DriverSide.left,"
	);
	main = swap(main, /\n\s*themes: const ThemesConfig\(themes: miataThemes\),/, '');
	main = swap(
		main,
		/bar: const BarConfig\(\n(\s*\/\/.*\n)*\s*content: BarContent\.infoDisplay\(\),/,
		'bar: BarConfig(\n      content: _bar(),'
	);
	main = swap(
		main,
		/dockApps: \[.*\],/,
		"dockApps: ['settings', 'android_auto', 'reverse_camera', 'debug'],"
	);
	main = swap(
		main,
		/\n  runApp\(const SmartifyOsApp\(\)\);\n\}/,
		`
  runApp(const SmartifyOsApp());

  // Once everything has settled, a picture of the whole window, and done.
  await Future<void>.delayed(const Duration(seconds: 8));
  final view = RendererBinding.instance.renderViews.first;
  final size = view.size * view.flutterView.devicePixelRatio;
  // ignore: invalid_use_of_protected_member
  final image = await (view.layer! as OffsetLayer).toImage(Offset.zero & size);
  final png = await image.toByteData(format: ui.ImageByteFormat.png);
  await File(_env('SHOT_OUT')!).writeAsBytes(png!.buffer.asUint8List());
  exit(0);
}

String? _env(String name) => Platform.environment[name];

String _layout() => switch (_env('SHOT_LAYOUT')) {
  'split' => Layouts.split,
  'sidebar' => Layouts.sidebar,
  'tiles' => Layouts.tiles,
  'focus' => Layouts.focus,
  'portrait' => Layouts.portrait,
  _ => Layouts.classic,
};

BarContent _bar() => switch (_env('SHOT_BAR')) {
  'dock' => const BarContent.dock(),
  'both' => const BarContent.infoDisplayAndDock(),
  _ => const BarContent.infoDisplay(),
};`
	);
	await Bun.write(mainPath, main);

	await run(['flutter', 'build', 'macos', '--release'], app);
	const binary = join(
		app,
		'build/macos/Build/Products/Release/smartify_os_miata_app.app/Contents/MacOS/smartify_os_miata_app'
	);

	mkdirSync(out, { recursive: true });
	for (const layout of layouts) {
		for (const side of sides) {
			for (const bar of bars) {
				const name = `${layout}-${side}-${bar}`;
				const png = join(work, `${name}.png`);
				// Nothing the last run saved, like a layout picked in Settings, carries over.
				await Bun.spawn(['defaults', 'delete', bundleId], { stderr: 'ignore' }).exited;
				const proc = Bun.spawn([binary], {
					env: {
						...process.env,
						SMARTIFY_OS_EDITOR: '1',
						SHOT_LAYOUT: layout,
						SHOT_SIDE: side,
						SHOT_BAR: bar,
						SHOT_OUT: png
					},
					stdout: 'ignore',
					stderr: 'ignore'
				});
				const timer = setTimeout(() => proc.kill(), 60_000);
				await proc.exited;
				clearTimeout(timer);
				if (!existsSync(png)) throw new Error(`No picture came out for ${name}.`);
				// Half the window's pixels on a Retina screen: sharp enough, and small.
				const width = layout === 'portrait' ? '600' : '1024';
				await run([
					'cwebp',
					'-quiet',
					'-q',
					'82',
					'-resize',
					width,
					'0',
					png,
					'-o',
					join(out, `${name}.webp`)
				]);
				console.log(`  ${name}`);
			}
		}
	}
	console.log(`Done, in ${out}`);
} finally {
	rmSync(work, { recursive: true, force: true });
}
