#!/usr/bin/env python3
"""Generate solid-color PNG tiles for the pastel raster card pack (no deps)."""
from __future__ import annotations

import os
import struct
import zlib

ROOT = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "card-packs", "pastel")


def hsl_to_rgb(h: float, s: float, l: float) -> tuple[int, int, int]:
    """h 0-360, s/l 0-1."""
    h = (h % 360) / 360
    if s == 0:
        v = int(l * 255)
        return v, v, v

    def hue2rgb(p: float, q: float, t: float) -> float:
        if t < 0:
            t += 1
        if t > 1:
            t -= 1
        if t < 1 / 6:
            return p + (q - p) * 6 * t
        if t < 1 / 2:
            return q
        if t < 2 / 3:
            return p + (q - p) * (2 / 3 - t) * 6
        return p

    q = l * (1 + s) if l < 0.5 else l + s - l * s
    p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
    return int(r * 255), int(g * 255), int(b * 255)


def write_png(path: str, w: int, h: int, rgb: tuple[int, int, int]) -> None:
    r, g, b = rgb
    raw_rows = []
    row_len = w * 3
    for _ in range(h):
        raw_rows.append(b"\x00" + bytes([r, g, b]) * w)
    raw = b"".join(raw_rows)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    sig = b"\x89PNG\r\n\x1a\n"
    data = (
        sig
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(data)


def main() -> None:
    os.makedirs(ROOT, exist_ok=True)
    for i in range(1, 37):
        hue = (i * 37) % 360
        rgb = hsl_to_rgb(hue, 0.55, 0.58)
        name = f"{i:02d}.png"
        write_png(os.path.join(ROOT, name), 64, 64, rgb)
    print(f"Wrote 36 PNGs to {ROOT}")


if __name__ == "__main__":
    main()
