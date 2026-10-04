# Checks every sprite combination the dancer can draw, from the coordinates
# in scripts/art.py: every arm and leg, on either side, in every view, with
# the body and the tutu. Run: python3 scripts/check.py
#
# - Attached: every pixel of an arm or a leg reaches the body or the tutu
#   through pixels that share an edge.
# - No corner-only joins: no pixel of a limb meets the rest of its limb only
#   at a corner.
# - Whole cells only: every limb pixel's cell is filled top and bottom.
#   Terminals draw a whole cell solid whatever their background; some draw a
#   half-coloured cell as a short bar set low, a gap or a stray pixel.
import pathlib, sys
here = pathlib.Path(__file__).resolve().parent
src = (here / 'art.py').read_text()
ns = {}
exec(src[:src.index('def layer')], ns)
BODY, ARM, LEGS, EYES, mirror = ns['BODY'], ns['ARM'], ns['LEGS'], ns['EYES'], ns['mirror']
# The tutu: rows 6 and 7, cols 0..13 and -2..15 (centered on the body).
TUTU = [(c, 6) for c in range(0, 14)] + [(c, 7) for c in range(-2, 16)]
N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
problems = []

def check(name, limb, base):
    limb = set(limb)
    figure = set(base) | limb
    # Attached: flood from the base through the figure.
    seen = set(base)
    todo = list(base)
    while todo:
        c, r = todo.pop()
        for dc, dr in N4:
            q = (c + dc, r + dr)
            if q in figure and q not in seen:
                seen.add(q)
                todo.append(q)
    loose = limb - seen
    if loose: problems.append(f'{name}: not attached at {sorted(loose)}')
    for c, r in limb:
        has_edge = any((c + dc, r + dr) in figure for dc, dr in N4)
        has_corner = any((c + dc, r + dr) in figure for dc in (-1, 1) for dr in (-1, 1))
        if not has_edge and has_corner: problems.append(f'{name}: pixel {(c, r)} meets the rest only at a corner')
        # Whole cells only: a limb pixel's partner in its cell (the other
        # half) is part of the figure too. Every terminal draws a whole cell
        # solid; Terminal.app draws a half-coloured one as a short bar set
        # low, which shows as a gap or a stray pixel.
        partner = (c, r + 1) if r % 2 == 0 else (c, r - 1)
        if partner not in figure: problems.append(f'{name}: pixel {(c, r)} fills only half its cell')

base = BODY + TUTU
for arm, pts in ARM.items():
    check(f'arm {arm} (left)', pts, base)
    check(f'arm {arm} (right)', mirror(pts), base)
# Legs: under the tutu, no two side by side in their first row, or two legs
# merge into one thick one.
for leg, pts in LEGS.items():
    top = sorted(c for c, r in pts if r == 0)
    if any(b - a == 1 for a, b in zip(top, top[1:])): problems.append(f'legs {leg}: two legs touch side by side and read as one')
for leg, pts in LEGS.items():
    rows = [(c, r + 8) for c, r in pts]
    check(f'legs {leg}', rows, base)
    check(f'legs {leg} (mirrored)', mirror(rows), base)
# A partner (Rudolf in Mayerling) has breeches the width of the body in
# place of a tutu; the legs a partner uses hang from them.
BREECHES = [(c, r) for c in range(2, 12) for r in (6, 7)]
for leg in ('stand', 'plie'):
    rows = [(c, r + 8) for c, r in LEGS[leg]]
    check(f'legs {leg} (partner)', rows, BODY + BREECHES)
    check(f'legs {leg} (partner, mirrored)', mirror(rows), BODY + BREECHES)
# Eyes: every state, in every view and mirrored, inside the face, and not
# on its edge, where they would look stuck to an arm.
inner = {(c, r) for c, r in BODY if 2 < c < 11}
for view, states in EYES.items():
    for state, pts in states.items():
        for side, eye in (('', pts), (' (mirrored)', mirror(pts))):
            out = [p for p in eye if p not in set(BODY)]
            edge = [p for p in eye if p in set(BODY) and p not in inner]
            if out: problems.append(f'eyes {view} {state}{side}: outside the face at {out}')
            if edge: problems.append(f'eyes {view} {state}{side}: on the face\'s edge at {edge}')
# Both arms together, every pair, so no two arms merge into a third shape.
for a in ARM:
    for b in ARM:
        both = set(ARM[a]) | set(mirror(ARM[b]))
        if len(both) != len(ARM[a]) + len(ARM[b]): problems.append(f'arms {a} + {b} overlap')

print('\n'.join(problems) if problems else f'all {2 * (len(ARM) + len(LEGS))} limb drawings attached, edge to edge, in whole cells; all {2 * sum(len(v) for v in EYES.values())} eye drawings inside the face')
sys.exit(1 if problems else 0)
