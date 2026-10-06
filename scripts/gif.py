"""Draws the routine's frames (from scripts/frames.ts on stdin) as an animated
GIF under a Claude Code spinner line, the way claude-toons draws its scenes.

    node --experimental-transform-types scripts/frames.ts | python3 scripts/gif.py out.gif [--still N]

Frames from frames.ts --story come with the session around the stage: then
the GIF shows the whole screen, as claude-toons' demo does, the transcript
scrolling above the spinner line and the prompt below the stage.

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
# The session around the stage (frames.ts --story), as Claude Code draws it.
GREEN = (78, 186, 101)
RED = (255, 107, 128)
PROMPT_BACK = (58, 60, 74)
RULE = (90, 92, 104)
LOG_ROWS = 12
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
    missing = bytes(mono.getmask('\U000F0000'))
    def font_for(ch):
        if ch not in cache:
            # Menlo lacks a few shapes (drawing its empty box): Apple Symbols has them.
            cache[ch] = mono if ch == ' ' or bytes(mono.getmask(ch)) != missing else symbols
        return cache[ch]
    bold = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 17, index=1)
    log = data.get('log') or []

    def write(d, x, y, text, color, font=None):
        # A cell a character, as in the terminal.
        for i, c in enumerate(text):
            if c == '⏺':
                # No font here has Claude Code's dot: a disc in its place.
                cx, cy = x + i * CW + CW // 2, y + CH // 2
                d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=color)
            elif c != ' ':
                d.text((x + i * CW, y + 1), c, fill=color, font=font or font_for(c))

    def session(d, t):
        # The transcript's last lines, newest at the bottom.
        lines = [l for l in log if l[0] <= t and (len(l) < 4 or l[3] is None or t < l[3])]
        lines = lines[-LOG_ROWS:]
        top = 4 + (LOG_ROWS - len(lines)) * CH
        for i, (_, style, text, *_) in enumerate(lines):
            y = top + i * CH
            if style == 'prompt':
                d.rectangle([0, y, W - 1, y + CH - 1], fill=PROMPT_BACK)
                write(d, 4, y, '❯ ' + text, FORE)
            elif style.startswith('call'):
                dot = {'call': GREEN, 'call-fail': RED}.get(style, DIM)
                name, _, rest = text.partition('(')
                write(d, 4, y, '⏺', dot)
                write(d, 4 + 2 * CW, y, name, FORE, bold)
                write(d, 4 + (2 + len(name)) * CW, y, '(' + rest, FORE)
            elif style.startswith('result'):
                write(d, 4, y, '  ⎿  ' if style != 'result-more' else '     ', DIM)
                write(d, 4 + 5 * CW, y, text, RED if style == 'result-fail' else DIM)
            elif style == 'text':
                write(d, 4, y, '⏺ ' + text, FORE)
            elif style == 'more':
                write(d, 4 + 2 * CW, y, text, FORE)
        return 4 + (LOG_ROWS + 1) * CH

    # The spinner line the strip hangs under, as Claude Code draws it.
    title_h = CH + 8
    top_h = (4 + (LOG_ROWS + 1) * CH) if log else 0
    foot_h = 3 * CH + 4 if log else 0
    W, H = cols * CW, top_h + rows * CH + title_h + foot_h
    images = []
    picked = [still] if still is not None else range(len(data['frames']))
    for n in picked:
        raw = base64.b64decode(data['frames'][n])
        words = struct.unpack('<%dI' % (len(raw) // 4), raw)
        im = Image.new('RGB', (W, H), BACK)
        d = ImageDraw.Draw(im)
        if log:
            session(d, n / fps)
        glyph = SPINNER[(n // 3) % len(SPINNER)]
        d.text((4, top_h + 4), glyph, fill=SPIN, font=font_for(glyph))
        d.text((4 + CW * 2, top_h + 4), 'Pirouetting…', fill=SPIN, font=mono)
        status = 'esc to interrupt' if log else data['moves'][n]
        secs = data.get('clock', 0) + n // fps
        took = f'{secs // 60}m {secs % 60}s' if secs >= 60 else f'{secs}s'
        d.text((4 + CW * 15, top_h + 4), f"({took} · {status})", fill=DIM, font=mono)
        if log:
            # The prompt box under the band.
            y = top_h + title_h + rows * CH + CH // 2
            d.line([0, y, W - 1, y], fill=RULE)
            write(d, 4, y + CH // 2, '❯', FORE)
            d.rectangle([4 + 2 * CW, y + CH // 2 + 2, 4 + 3 * CW - 2, y + CH // 2 + CH - 2], fill=FORE)
            d.line([0, y + 2 * CH, W - 1, y + 2 * CH], fill=RULE)
        for row in range(rows):
            for col in range(cols):
                at = (row * cols + col) * 3
                ch, fg, bg = words[at], words[at + 1], words[at + 2]
                x, y = col * CW, top_h + title_h + row * CH
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
