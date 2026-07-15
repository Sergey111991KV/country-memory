#!/usr/bin/env python3
"""Resize iOS simulator screenshots to App Store 6.5\" display sizes."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print('Install Pillow: pip3 install Pillow', file=sys.stderr)
    raise SystemExit(1)

# App Store Connect → iPhone 6.5" Display (portrait / landscape)
PRESETS: dict[str, tuple[int, int]] = {
    '1242x2688': (1242, 2688),
    '1284x2778': (1284, 2778),
    '2688x1242': (2688, 1242),
    '2778x1284': (2778, 1284),
    '2064x2752': (2064, 2752),
    '2752x2064': (2752, 2064),
}


def resize_one(src: Path, dst: Path, size: tuple[int, int], letterbox: bool) -> None:
    with Image.open(src) as im:
        rgb = im.convert('RGB') if im.mode in ('RGBA', 'P') else im
        if letterbox:
            tw, th = size
            sw, sh = rgb.size
            scale = min(tw / sw, th / sh)
            nw, nh = round(sw * scale), round(sh * scale)
            scaled = rgb.resize((nw, nh), Image.Resampling.LANCZOS)
            canvas = Image.new('RGB', size, (11, 8, 20))
            canvas.paste(scaled, ((tw - nw) // 2, (th - nh) // 2))
            out = canvas
        else:
            out = rgb.resize(size, Image.Resampling.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        out.save(dst, format='PNG', optimize=True)
    print(f'{src.name} -> {dst} ({size[0]}x{size[1]})')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        'inputs',
        nargs='+',
        type=Path,
        help='PNG files or directories to scan',
    )
    parser.add_argument(
        '-o',
        '--output',
        type=Path,
        default=Path('screenshots/ios/app-store-6.5'),
        help='Output directory',
    )
    parser.add_argument(
        '--preset',
        choices=sorted(PRESETS.keys()),
        default='1284x2778',
        help='Target size (default: 1284x2778)',
    )
    parser.add_argument(
        '--letterbox',
        action='store_true',
        help='Fit inside target size with dark padding (use for iPad from iPhone shots)',
    )
    args = parser.parse_args()
    size = PRESETS[args.preset]

    files: list[Path] = []
    for item in args.inputs:
        if item.is_dir():
            files.extend(sorted(item.glob('*.png')))
        elif item.suffix.lower() == '.png' and item.is_file():
            files.append(item)

    if not files:
        print('No PNG files found.', file=sys.stderr)
        return 1

    for index, src in enumerate(files, start=1):
        dst = args.output / f'{index:02d}-{src.stem}.png'
        resize_one(src, dst, size, args.letterbox)

    print(f'\nDone: {len(files)} file(s) → {args.output.resolve()}')
    print(f'Upload {size[0]} × {size[1]} px PNGs to App Store Connect (6.5" Display).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
