"""Draws the routine's frames (from scripts/frames.ts on stdin) as an animated
GIF under a Claude Code spinner line, the way claude-toons draws its scenes.

    node --experimental-transform-types scripts/frames.ts | python3 scripts/gif.py out.gif [--still N]

With --still N, writes frame N as a PNG instead. With --gap N, draws each
cell's glyph N pixels low with the cell's background above it, as a terminal
with line spacing does. Needs Pillow.
"""
import base64, json, struct, sys
from PIL import Image, ImageDraw, ImageFont

CLEAR = 0x01000000
CW, CH = 10, 20
# A dark terminal, as in claude-toons' demo.
BACK = (40, 42, 54)
FORE = (220, 220, 220)
SPIN = (217, 119, 87)
DIM = (140, 140, 150)
SPINNER = '·✢✳✶✻✽'
# Blocks as exact rectangles, so pixel art has no seams: which quarters
# (top-left, top-right, bottom-left, bottom-right) each fills.
BLOCKS = {'█': (1,1,1,1), '▀': (1,1,0,0), '▄': (0,0,1,1), '▌': (1,0,1,0), '▐': (0,1,0,1),
          '▖': (0,0,1,0), '▗': (0,0,0,1), '▘': (1,0,0,0), '▙': (1,0,1,1), '▚': (1,0,0,1),
          '▛': (1,1,1,0), '▜': (1,1,0,1), '▝': (0,1,0,0), '▞': (0,1,1,0), '▟': (0,1,1,1)}

def rgb(c):
    return ((c >> 16) & 255, (c >> 8) & 255, c & 255)

def main():
    data = json.load(sys.stdin)
    out = sys.argv[1]
    still = int(sys.argv[sys.argv.index('--still') + 1]) if '--still' in sys.argv else None
    gap = int(sys.argv[sys.argv.index('--gap') + 1]) if '--gap' in sys.argv else 0
    cols, rows, fps = data['cols'], data['rows'], data['fps']
    mono = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 17)
    symbols = ImageFont.truetype('/System/Library/Fonts/Apple Symbols.ttf', 17)
    cache = {}
    def font_for(ch):
        if ch not in cache:
            # Menlo lacks a few shapes: Apple Symbols has them.
            cache[ch] = mono if mono.getmask(ch).getbbox() or ch == ' ' else symbols
        return cache[ch]
    # The spinner line the strip hangs under, as Claude Code draws it.
    title_h = CH + 8
    W, H = cols * CW, rows * CH + title_h
    images = []
    picked = [still] if still is not None else range(len(data['frames']))
    for n in picked:
        raw = base64.b64decode(data['frames'][n])
        words = struct.unpack('<%dI' % (len(raw) // 4), raw)
        im = Image.new('RGB', (W, H), BACK)
        d = ImageDraw.Draw(im)
        glyph = SPINNER[(n // 3) % len(SPINNER)]
        d.text((4, 4), glyph, fill=SPIN, font=font_for(glyph))
        d.text((4 + CW * 2, 4), 'Pirouetting…', fill=SPIN, font=mono)
        d.text((4 + CW * 15, 4), f"({n // fps}s · {data['moves'][n]})", fill=DIM, font=mono)
        for row in range(rows):
            for col in range(cols):
                at = (row * cols + col) * 3
                ch, fg, bg = words[at], words[at + 1], words[at + 2]
                x, y = col * CW, title_h + row * CH
                if bg != CLEAR:
                    d.rectangle([x, y, x + CW - 1, y + CH - 1], fill=rgb(bg))
                c = chr(ch) if ch else ' '
                if c == ' ':
                    continue
                color = FORE if fg == CLEAR else rgb(fg)
                if c in BLOCKS:
                    # The glyph fills the cell below the gap.
                    hw, hh = CW // 2, (CH - gap) // 2
                    for i, (qx, qy) in enumerate([(0, 0), (hw, 0), (0, hh), (hw, hh)]):
                        if BLOCKS[c][i]:
                            d.rectangle([x + qx, y + gap + qy, x + qx + hw - 1, y + gap + qy + hh - 1], fill=color)
                else:
                    d.text((x, y + 1), c, fill=color, font=font_for(c))
        images.append(im)
    if still is not None:
        images[0].save(out)
    else:
        q = [im.quantize(colors=256, method=Image.Quantize.FASTOCTREE) for im in images]
        q[0].save(out, save_all=True, append_images=q[1:], duration=int(1000 / fps), loop=0, optimize=False)
    print(f'{out}: {len(images)} frames, {W}x{H}')

main()
