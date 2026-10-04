// The dancer: Clawd as on the official stickers, in claude-toons' scene
// language, shared by every ballet scene (each scene's code starts with it).
//
// Clawd is toons' Clawd, pixel for pixel: the 12 by 6 block with its
// corners cut, two arm stubs and four short legs. Like the stickers, it
// never changes shape to turn: a three-quarter view shades its far side and
// slides its eyes toward the way it faces, and from behind its eyes are
// gone. The ballet is the sticker's: a pink tutu checked in two pinks over
// the lower body, an arm raised as a stub from the top corner, the other
// held out, and a leg pointed down behind. Arms are only ever the two
// stubs, and legs always point down, so it is two arms and four legs in
// every pose.
//
// The art is generated from pixel coordinates by scripts/art.py; each
// layer is a picture on a 24-pixel canvas, Clawd's grid starting 5 in.

export const DANCER = String.raw`
const ORANGE = '#d97757', SHADED = '#b5603f', EYES = '#2a1610';
const ease = k => k * k * (3 - 2 * k);
const pick = (lines, n) => lines[n % lines.length];

// art:begin
const BODY = '.......BBBBBBBBBB\n.......BBBBBBBBBB\n.......BBBBBBBBBB\n.......BBBBBBBBBB\n.......BBBBBBBBBB\n.......BBBBBBBBBB';
const SHADE = { right: '.......DD\n.......DD\n.......DD\n.......DD\n.......DD\n.......DD', left: '...............DD\n...............DD\n...............DD\n...............DD\n...............DD\n...............DD' };
const EYE = {
  front: { open: '\n\n.........E....E\n.........E....E', closed: '\n\n\n........EE....EE', happy: '\n\n.........E....E\n........E.E..E.E' },
  quarter: { open: '\n\n..........E....E\n..........E....E', closed: '\n\n\n.........EE...EE', happy: '\n\n..........E...E\n.........E.E.E.E' },
};
const ARM = {
  out: [2, '.....AA\n.....AA', '.................AA\n.................AA'],
  up: [-2, '.......AA\n.......AA', '...............AA\n...............AA'],
  down: [4, '......A\n......A', '.................A\n.................A'],
  high: [0, '...AAA\n...AAA\n.....AA\n.....AA', '..................AAA\n..................AAA\n.................AA\n.................AA'],
};
const LEGS = {
  stand: [0, '........L.L..L.L\n........S.S..S.S'],
  plie: [0, '.......L..L..L..L\n.......S..S..S..S'],
  passe: [0, '........L.L..L\n........S.S..S'],
  derriere: [0, '......L...L..L.L\n......S...S..S.S'],
  jete: [0, '......L.L......L.L\n......S.S......S.S'],
};
// art:end

// A pose: where on the stage (0 to 1), the view (front, right, left, back),
// the arms [left, right] and legs by name, and anything more (eyes, air in
// pixels, spin in degrees while spinning).
const P = (x, view, arms, legs, more) => Object.assign({ x, view, arms, legs, eyes: 'open', air: 0, spin: 0, spinning: false, swirl: 0 }, more || {});
// Numbers blend eased; names switch halfway, like sprite frames.
function blend(p, q, k) {
  const out = {};
  for (const key of Object.keys(p)) {
    const a = p[key];
    const b = q[key];
    out[key] = typeof a === 'number' && typeof b === 'number' ? a + (b - a) * k : k < 0.5 ? a : b;
  }
  return out;
}
// Where [time, pose] keyframes are at u, eased between each pair.
function track(keys, u) {
  if (u <= keys[0][0]) return blend(keys[0][1], keys[0][1], 0);
  for (let i = 1; i < keys.length; i++) {
    if (u < keys[i][0]) return blend(keys[i - 1][1], keys[i][1], ease((u - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
  }
  return blend(keys[keys.length - 1][1], keys[keys.length - 1][1], 0);
}

// Flips a picture left to right on the 24-pixel canvas, once per picture.
const MIRRORED = {};
function mirror(art) {
  if (MIRRORED[art]) return MIRRORED[art];
  const flipped = art.split('\n').map(row => {
    let out = '';
    for (let x = 23; x >= 0; x--) out += x < row.length ? row[x] : '.';
    return out;
  }).join('\n');
  MIRRORED[art] = flipped;
  return flipped;
}

// Draws Clawd in a pose with its middle at column cx and its feet on pixel
// row ground (lifted by air); returns where it is, for speech.
function dancer(p, cx, ground, look) {
  // Spinning, the view follows the spin, and the tutu's checks go round.
  if (p.spinning) {
    const a = mod(p.spin, 360);
    p.view = a < 45 || a >= 315 ? 'front' : a < 135 ? 'right' : a < 225 ? 'back' : 'left';
    p.swirl = p.spin / 30;
  }
  const isLeft = p.view === 'left';
  const x0 = Math.round(cx) - 12;
  // On whole rows only: half a row off, every edge falls inside a cell,
  // which terminals with line spacing draw with a seam.
  // The body is rows 0 to 5, the tutu 6 and 7, the legs 8 and 9.
  // Kneeling, the body sits on the floor, the legs folded out of sight.
  const isKneeling = p.legs === 'kneel';
  let top = Math.round(ground - (isKneeling ? 5 : 9) - (p.air || 0));
  if (mod(top, 2) === 1) top -= 1;
  // Pointe shoes in the tutu's light colour, or boots.
  const colors = { B: ORANGE, D: SHADED, E: EYES, A: ORANGE, L: ORANGE, S: look.shoes || look.frill || '#fbd9e3' };
  const leg = LEGS[p.legs] || LEGS.stand;
  if (!isKneeling) pixels(x0, top + 8 + leg[0], isLeft ? mirror(leg[1]) : leg[1], colors);
  pixels(x0, top, BODY, colors);
  if (p.view === 'right') pixels(x0, top, SHADE.right, colors);
  if (isLeft) pixels(x0, top, SHADE.left, colors);
  if (p.view === 'front') pixels(x0, top, EYE.front[p.eyes] || EYE.front.open, colors);
  if (p.view === 'right') pixels(x0, top, EYE.quarter[p.eyes] || EYE.quarter.open, colors);
  if (isLeft) pixels(x0, top, mirror(EYE.quarter[p.eyes] || EYE.quarter.open), colors);
  // The tutu, as on the sticker: two tiers checked in two pinks at the
  // hips, under the whole body, the lower one wider; the checks turn with
  // Clawd.
  const tutu = look.tutu || '#f2a7bb';
  const light = look.frill || '#fbd9e3';
  const spin = Math.floor(p.swirl || 0);
  // A partner (look.bare) has no tutu: breeches the width of the body, in a
  // whole row of cells, joining it to the legs; none while kneeling.
  if (look.bare) {
    if (!isKneeling) for (let x = -5; x < 5; x++) for (let y = 6; y < 8; y++) pixel(Math.round(cx) + x, top + y, look.breeches || '#c8a070');
  } else {
    for (let x = -7; x < 7; x++) pixel(Math.round(cx) + x, top + 6, mod(x + spin, 2) === 0 ? light : tutu);
    for (let x = -9; x < 9; x++) pixel(Math.round(cx) + x, top + 7, mod(x + spin, 2) === 1 ? light : tutu);
  }
  if (look.crown) pixels(Math.round(cx) - 3, top - 2, look.crown, look.crownColors);
  // The arms: one stub each side.
  const left = ARM[p.arms[0]] || ARM.out;
  const right = ARM[p.arms[1]] || ARM.out;
  // The far arm, like the far side, in shade.
  const far = Object.assign({}, colors, { A: SHADED });
  pixels(x0, top + left[0], left[1], p.view === 'right' ? far : colors);
  pixels(x0, top + right[0], right[2], isLeft ? far : colors);
  return { x: Math.round(cx), row: Math.floor(top / 2), top };
}
`
