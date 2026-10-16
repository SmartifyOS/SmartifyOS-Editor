"""
Makes every app icon from resources/icon-source.png (1024x1024, square, no rounding).

    python3 scripts/make-icons.py

Needs Pillow. The results are committed, so this only runs again when the logo changes:

- resources/icon.icns   macOS, on Apple's icon grid: an 824px rounded square (185px corners) in a 1024px canvas
                        with a soft shadow, so it sits with every other Mac app
- resources/icon.ico    Windows, lightly rounded
- resources/icon.png    Linux and the window icon, lightly rounded
- src/lib/assets/icon.png  the editor's own UI, lightly rounded
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

root = Path(__file__).resolve().parent.parent
source = Image.open(root / "resources" / "icon-source.png").convert("RGBA")
SIZE = 1024
SCALE = 4  # masks are drawn this much bigger and scaled down, for smooth edges


def rounded_mask(size: int, radius_ratio: float) -> Image.Image:
    big = size * SCALE
    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, big - 1, big - 1), radius=int(big * radius_ratio), fill=255
    )
    return mask.resize((size, size), Image.LANCZOS)


def clip(image: Image.Image, mask: Image.Image) -> Image.Image:
    out = image.copy()
    out.putalpha(ImageChops.multiply(image.getchannel("A"), mask))
    return out


# macOS: 824px body, centered, with the shadow Apple's template has.
body_size = 824
body = clip(source.resize((body_size, body_size), Image.LANCZOS), rounded_mask(body_size, 185 / 824))
mac = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
offset = (SIZE - body_size) // 2
shadow_shape = Image.new("RGBA", (body_size, body_size), (0, 0, 0, 120))
shadow.paste(shadow_shape, (offset, offset + 12), rounded_mask(body_size, 185 / 824))
mac = Image.alpha_composite(mac, shadow.filter(ImageFilter.GaussianBlur(14)))
mac.alpha_composite(body, (offset, offset))
mac.save(
    root / "resources" / "icon.icns",
    sizes=[(16, 16), (32, 32), (64, 64), (128, 128), (256, 256), (512, 512), (1024, 1024)],
)
mac.save(root / "resources" / "icon-macos.png")

# Everywhere else: the whole square, corners rounded a little.
flat = clip(source, rounded_mask(SIZE, 0.18))
flat.save(root / "resources" / "icon.png")
flat.save(
    root / "resources" / "icon.ico",
    sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)
flat.resize((256, 256), Image.LANCZOS).save(root / "src" / "lib" / "assets" / "icon.png")
print("Icons written.")
