# Generates the dancer's pixel art (the block between the art markers in
# hooks/dance.ts) from pixel coordinates on toons' 14-column Clawd grid,
# placed on a 24-pixel canvas. Edit the coordinates here, then run:
#
#   python3 scripts/art.py
OFF = 5  # grid col 0 is canvas x 5

def art(points, ch):
    """points: (col, row) on the grid, rows from a layer's first row."""
    if not points: return ''
    rows = max(r for _, r in points) + 1
    grid = [['.'] * 24 for _ in range(rows)]
    for c, r in points:
        x = c + OFF
        if 0 <= x < 24: grid[r][x] = ch
    return '\\n'.join(''.join(g).rstrip('.') for g in grid)

def mirror(points):
    return [(13 - c, r) for c, r in points]

# The body, as on the stickers: a plain block, cols 2..11, rows 0..5.
# (toons' sprite widens rows 2-4 by a pixel each side for its claws; here
# the arms are drawn on their own, so the block alone, or Clawd would have
# two pairs.)
BODY = [(c, r) for r in range(6) for c in range(2, 12)]
# The far side in shade, for a three-quarter view facing right.
SHADE_R = [(c, r) for (c, r) in BODY if c <= 3]
EYES = {
    'front': {'open': [(4, 2), (4, 3), (9, 2), (9, 3)], 'closed': [(3, 3), (4, 3), (9, 3), (10, 3)], 'happy': [(3, 3), (4, 2), (5, 3), (8, 3), (9, 2), (10, 3)]},
    # Turned toward the right: a column toward the way it faces, every eye
    # state inside the face.
    'quarter': {'open': [(5, 2), (5, 3), (10, 2), (10, 3)], 'closed': [(4, 3), (5, 3), (9, 3), (10, 3)], 'happy': [(4, 3), (5, 2), (6, 3), (8, 3), (9, 2), (10, 3)]},
}
# One arm, the left; the right mirrors it. Rows may be negative (above).
# Each touches the body, and every pixel of it touches the next along an
# edge, never only at a corner.
ARM = {
    # Held out to the side, as on the stickers.
    'out': [(0, 2), (1, 2), (0, 3), (1, 3)],
    # Raised straight up from the top corner, as on the ballet sticker.
    'up': [(2, -2), (3, -2), (2, -1), (3, -1)],
    # Hanging down by the side, resting on the tutu.
    'down': [(1, 4), (1, 5)],
    # Raised at 45 degrees from the middle of the side, where the arms are
    # on the stickers: a band of whole cells (a cell is about twice as tall
    # as wide, so each row up steps two columns out), each block overlapping
    # the one below by a column so the band never breaks. Whole cells only:
    # every terminal draws a whole cell solid, whatever its background, but
    # some (Terminal.app) draw a half-coloured one as a short bar set low.
    'high': [(0, 2), (1, 2), (0, 3), (1, 3), (-2, 0), (-1, 0), (0, 0), (-2, 1), (-1, 1), (0, 1)],
}
# Legs, rows from 6 (toons' feet are rows 6 and 7).
STAND = [(c, r) for c in (3, 5, 8, 10) for r in (0, 1)]
LEGS = {
    # Always Clawd's four legs, plain straight stubs pointing down under
    # the body, only moved into place: never out to the side (they would
    # read as more arms), never with a toe (an extra pixel), and whole cells
    # only.
    'stand': STAND,
    # A plié in second: the outer legs step out, knees over toes.
    'plie': [(2, 0), (2, 1), (5, 0), (5, 1), (8, 0), (8, 1), (11, 0), (11, 1)],
    # Passé: one leg drawn up out of sight under the tutu (with all four
    # showing, a pirouette doesn't read as a turn).
    'passe': [(3, 0), (3, 1), (5, 0), (5, 1), (8, 0), (8, 1)],
    # Facing right: the back leg stepped out behind, as on the sticker.
    'derriere': [(1, 0), (1, 1), (5, 0), (5, 1), (8, 0), (8, 1), (10, 0), (10, 1)],
    # Facing right, in the air: the back legs reaching behind, the front
    # ones ahead.
    'jete': [(1, 0), (1, 1), (3, 0), (3, 1), (10, 0), (10, 1), (12, 0), (12, 1)],
}

def layer(points, ch): return "'" + art(points, ch) + "'"

out = []
out.append("const BODY = " + layer(BODY, 'B') + ";")
out.append("const SHADE = { right: " + layer(SHADE_R, 'D') + ", left: " + layer(mirror(SHADE_R), 'D') + " };")
out.append("const EYE = {")
for view, states in EYES.items():
    out.append(f"  {view}: {{ " + ", ".join(f"{k}: {layer(v, 'E')}" for k, v in states.items()) + " },")
out.append("};")
# Arms: row offset (top row), art for each side.
out.append("const ARM = {")
for name, pts in ARM.items():
    top = min(r for _, r in pts)
    norm = [(c, r - top) for c, r in pts]
    out.append(f"  {name}: [{top}, {layer(norm, 'A')}, {layer(mirror(norm), 'A')}],")
out.append("};")
out.append("const LEGS = {")
for name, pts in LEGS.items():
    top = min(r for _, r in pts)
    norm = [(c, r - top) for c, r in pts]
    # The bottom pixel of each leg is its pointe shoe (S), in the tutu's
    # light colour: the same whole cell, two colours.
    rows = art(norm, 'L').split('\\n')
    shoes = '\\n'.join(rows[:-1] + [rows[-1].replace('L', 'S')])
    out.append(f"  {name}: [{top}, '{shoes}'],")
out.append("};")
import pathlib
path = pathlib.Path(__file__).resolve().parent.parent / 'hooks' / 'dance.ts'
src = path.read_text()
begin, end = '// art:begin\n', '// art:end\n'
a, b = src.index(begin) + len(begin), src.index(end)
path.write_text(src[:a] + '\n'.join(out) + '\n' + src[b:])
print(f'{path}: art rewritten')
