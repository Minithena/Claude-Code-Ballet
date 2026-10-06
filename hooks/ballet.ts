// The ballets: claude-toons scenes, each the dancer (hooks/dance.ts) and a
// choreography of eased keyframes on a set of its own. toons' renderer
// (hooks/script.ts) plays them as it plays its stock scenes: the band grows
// in, speech bubbles find a clear spot and type out, and one piece
// dissolves into the next. Speech is plain ASCII, as toons' bubbles are.

import { DANCER } from './dance'

// Shared by the pieces after the dancer: keyframes added in order, speech
// by time (said from beside Clawd, clear of its arms and tutu), a blink now and then, a bourrée's quick steps, the boards, and
// sparkles that keep off Clawd and the floor. Arms are named for each side
// ([left, right]): down, out, high, or up (the sticker's raised stub).
export const COMMON = String.raw`
const BAS = ['down', 'down'], SECOND = ['out', 'out'], FIFTH = ['high', 'high'];
// The ballet sticker's arms: the front one raised, the back one out.
const RAISED = { right: ['out', 'up'], left: ['up', 'out'], front: ['out', 'up'], back: ['out', 'up'] };
const KEYS = [];
const key = (t, p) => KEYS.push([t, p]);
const LINES = [];
const line = (t0, t1, lines) => LINES.push([t0, t1, lines]);
function saying(u, n) {
  for (const l of LINES) if (u >= l[0] && u < l[1]) return pick(l[2], n);
  return '';
}
// Speech beside Clawd: toons centres a bubble near the point it is given
// (and may drift it a few columns toward the speaker, as it doesn't count
// a two-cell arm as something to keep off), so the point is set out by half
// the bubble's width beyond Clawd's widest reach (its tutu and raised arms,
// 10 columns from its middle) and a margin for that drift, on the side with
// more room.
function speak(text, d) {
  const off = 15 + Math.ceil((text.length + 4) / 2);
  say(text, d.x + (d.x < w / 2 ? off : -off), d.row + 1);
}
function blinking(p, t) {
  if (p.eyes === 'open' && fract(t * 0.31) < 0.04) p.eyes = 'closed';
  return p;
}
// Tiny quick steps on pointe: the feet fluttering in and out.
function bourree(p, t) {
  p.legs = Math.floor(t * 12) % 2 === 0 ? 'stand' : 'plie';
  return p;
}
function boards(floor, cx, edge, board, light) {
  for (let x = 0; x < w; x++) {
    const pool = clamp(1 - Math.abs(x - cx) / 14);
    const seam = x % 9 === 0;
    put(x, floor, '▀', mix(seam ? '#684226' : edge, light, pool * 0.45), mix(seam ? '#684226' : board, light, pool * 0.25));
  }
}
function sparkles(t, d, floor, color) {
  const tick = Math.floor(t * 10);
  for (let i = 0; i < 7; i++) {
    if (rand(i * 7 + tick * 13) < 0.45) continue;
    const a = rand(i * 11 + tick * 17) * Math.PI * 2;
    const col = Math.round(d.x + Math.cos(a) * (13 + rand(i + tick) * 4));
    const row = Math.round(d.row + 2 + Math.sin(a) * 3);
    if (row < 0 || row >= floor || (col > d.x - 13 && col < d.x + 13 && row >= d.row - 2)) continue;
    put(col, row, '✦✧·*'[i % 4], color);
  }
}
// Grand jetés: from a plié, up into a stride at the top of the arc, and
// down into a plié, n times across, facing the way they go.
function leaps(t0, x0, x1, n) {
  const view = x1 > x0 ? 'right' : 'left';
  for (let i = 0; i < n; i++) {
    const t = t0 + i * 0.75;
    const a = x0 + ((x1 - x0) * i) / n;
    const b = x0 + ((x1 - x0) * (i + 1)) / n;
    key(t, P(a, view, BAS, 'plie'));
    key(t + 0.36, P((a + b) / 2, view, RAISED[view], 'jete', { air: 4 }));
    key(t + 0.7, P(b, view, SECOND, 'plie'));
  }
}
// Pirouettes: from a plié, n turns in passé with the arms high, and back
// into a plié, facing front. A landing keeps the spin it ends on: blending
// back to 0 would turn Clawd backwards while it still spins.
function pirouettes(t0, length, x, n) {
  key(t0, P(x, 'front', SECOND, 'plie'));
  key(t0 + 0.2, P(x, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
  key(t0 + length - 0.3, P(x, 'front', FIFTH, 'passe', { spinning: true, spin: 360 * n }));
  key(t0 + length, P(x, 'front', SECOND, 'plie', { spin: 360 * n }));
}
// A tour en l'air: up from a plié, round n times in the air, and down.
function tour(t0, x, n) {
  key(t0, P(x, 'front', SECOND, 'plie'));
  key(t0 + 0.15, P(x, 'front', FIFTH, 'stand', { spinning: true, spin: 0 }));
  key(t0 + 0.4, P(x, 'front', FIFTH, 'stand', { spinning: true, spin: 180 * n, air: 4 }));
  key(t0 + 0.65, P(x, 'front', FIFTH, 'stand', { spinning: true, spin: 360 * n }));
  key(t0 + 0.8, P(x, 'front', SECOND, 'plie', { spin: 360 * n }));
}
// Balancés: a waltz, rocking side to side, down on each first beat; n steps
// of a given length, facing the way each one goes.
function balances(t0, x, n, arms, step, more) {
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? -1 : 1;
    const view = side > 0 ? 'right' : 'left';
    key(t0 + i * step, P(x + side * 0.02, view, arms, 'plie', more));
    key(t0 + (i + 0.5) * step, P(x + side * 0.03, view, arms, 'stand', more));
  }
}
// Entrechats: straight up, n times, the legs beating in the air.
function entrechats(t0, x, n) {
  for (let i = 0; i < n; i++) {
    key(t0 + i * 0.6, P(x, 'front', BAS, 'plie'));
    key(t0 + i * 0.6 + 0.3, P(x, 'front', BAS, 'stand', { air: 4 }));
  }
  key(t0 + n * 0.6, P(x, 'front', SECOND, 'plie'));
}
function beating(p, t) {
  if (p.air > 1.5 && !p.spinning && p.legs !== 'jete') p.legs = Math.floor(t * 10) % 2 ? 'stand' : 'plie';
  return p;
}
// A révérence: the back leg pointed behind, the arms lowered, the eyes
// closed; held, and up again.
function reverence(t0, x, view, length) {
  key(t0, P(x, view, SECOND, 'derriere'));
  key(t0 + 0.4, P(x, view, BAS, 'derriere', { eyes: 'closed' }));
  key(t0 + length, P(x, view, BAS, 'derriere', { eyes: 'closed' }));
}
`

// The gala: a stage with velvet curtains, the boards lit where Clawd
// dances, and roses at the curtain call.
const GALA = String.raw`
const ROUTINE = 20;
key(0, P(-0.3, 'right', SECOND, 'stand'));
key(2.2, P(0.48, 'right', SECOND, 'stand'));
key(2.6, P(0.5, 'front', BAS, 'stand'));
key(3.2, P(0.5, 'front', BAS, 'plie'));
key(3.7, P(0.5, 'front', SECOND, 'stand'));
key(4.2, P(0.5, 'front', SECOND, 'plie'));
key(4.8, P(0.5, 'front', FIFTH, 'stand'));
pirouettes(5.3, 2.4, 0.5, 3);
key(8.2, P(0.5, 'front', FIFTH, 'stand', { eyes: 'happy' }));
key(9.4, P(0.5, 'front', FIFTH, 'stand', { eyes: 'happy' }));
leaps(9.7, 0.5, 0.95, 3);
key(12.2, P(0.95, 'left', SECOND, 'stand'));
key(12.5, P(0.95, 'left', RAISED.left, 'derriere'));
key(13.7, P(0.95, 'left', RAISED.left, 'derriere'));
leaps(13.9, 0.95, 0.3, 3);
key(16.3, P(0.3, 'front', SECOND, 'stand'));
key(16.9, P(0.3, 'right', RAISED.right, 'derriere'));
reverence(17.4, 0.3, 'right', 1.5);
key(19.2, P(0.3, 'left', SECOND, 'stand'));
key(20, P(-0.3, 'left', SECOND, 'stand'));
line(2.6, 3.8, ['and 5, 6, 7, 8!', 'and... begin!', 'from the top!']);
line(16.8, 18.6, ['merci, merci!', 'thank you, thank you!', 'roses! for me?']);

// The curtains: drawn across the stage at open 0, tied back in the wings
// at open 1, the hems leading as they part and close.
function curtains(t, floor, wing, open) {
  if (wing <= 0 && open >= 1) return;
  const tie = Math.floor(floor * 0.62);
  const half = Math.ceil(w / 2);
  for (const side of [-1, 1]) {
    for (let y = 0; y < floor; y++) {
      const k = y < tie ? y / tie : 1 - (y - tie) / (floor - tie);
      const tied = Math.max(2, wing - Math.round((wing - 2) * k * 0.6));
      const reach = Math.round(lerp(half, tied, open * (1 - 0.15 * (1 - open) * (floor - y) / floor)));
      for (let i = 0; i < reach; i++) {
        const x = side < 0 ? i : w - 1 - i;
        const isFold = (i + (Math.sin(t * 1.3 + y * 0.3) > 0.85 ? 1 : 0)) % 3 === 1;
        if (y === tie && open > 0.95) put(x, y, '▬', '#deb252', '#961c2c');
        else put(x, y, '█', isFold ? '#68101e' : '#961c2c');
      }
    }
  }
}
function rose(k, x0, x1, floor) {
  const x = lerp(x0, x1, k);
  const py = lerp(-4, floor * 2 - 4, k) - Math.sin(Math.PI * k) * 6;
  pixels(Math.round(x), Math.round(py), '.r.\nrrr\n.g.\ngg.', { r: '#e0304a', g: '#4a9a50' });
}

function frame(t, dt) {
  const u = mod(t, ROUTINE);
  const n = Math.floor(t / ROUTINE);
  const floor = h - 1;
  const wing = w >= 50 ? 6 : w >= 32 ? 3 : 0;
  const L = wing + 12;
  const R = w - wing - 12;
  let p = blinking(track(KEYS, u), t);
  if (u < 2.2 || u > 19.2) p = bourree(p, t);
  const cx = Math.round(L + (R - L) * p.x);
  boards(floor, cx, '#b07c4e', '#8c5c36', '#ffe8b4');
  const d = dancer(p, cx, floor * 2 - 1, {});
  for (let i = 0; i < 3; i++) {
    const k = (u - 16.9 - i * 0.45) / 0.9;
    if (k >= 0 && u < 19.2) rose(clamp(k), w - wing - 3, cx + 11 + i * 4, floor);
  }
  // Up as Clawd comes on, down after the bow.
  curtains(t, floor, wing, ease(clamp(u / 1.6)) * (1 - ease(clamp((u - 19.2) / 0.8))));
  if ((u > 5.6 && u < 7.4) || p.air > 3.5) sparkles(t, d, floor, '#ffd68c');
  const said = saying(u, n);
  if (said) speak(said, d);
}
`

// Swan Lake's acts share Odette, the prince, the wingbeat, the lake and
// von Rothbart as an owl.
const SWAN_COMMON = String.raw`
// Odette's headpiece: white feathers swept over the head.
const ODETTE = { tutu: '#e6ecfa', frill: '#ffffff', crown: '..ww..\n.wwww.', crownColors: { w: '#ffffff' } };
// Prince Siegfried: white tights, boots, a coronet.
const PRINCE = { bare: true, breeches: '#e8e4f0', shoes: '#1a1a20', crown: '.y.y.\n.yyy.', crownColors: { y: '#ffd84a' } };
// A wingbeat: the arms up, out, down, out.
const BEAT = [FIFTH, SECOND, BAS, SECOND];
// The lake at night, the moon (unless hasMoon is false) and reeds.
function lake(t, floor, hasMoon) {
  for (let x = 0; x < w; x++) {
    const shine = Math.sin(x * 0.7 + t * 2) > 0.6;
    put(x, floor, '▀', shine ? '#7fa8e0' : '#2a4a80', '#142850');
  }
  if (hasMoon !== false) {
    pixels(w - 14, 1, '.mmm.\nmmmmm\nmmmmm\n.mmm.', { m: '#f0ecc8' });
    // The moon on the water, shimmering.
    for (let x = w - 15; x < w - 8; x++) {
      if (Math.sin(x * 1.9 + t * 3) > -0.2) put(x, floor, '▀', mix('#c8c4a0', '#f0ecc8', fract(t + x * 0.3)), '#142850');
    }
  }
  for (let x = 1; x < w; x += 23) {
    put(x, floor - 1, '|', '#3a6a4a');
    put(x + 2, floor - 1, '/', '#3a6a4a');
    put(x + 1, floor - 2, '|', '#4a7a5a');
  }
}
// Von Rothbart as an owl at a column and pixel row (even: whole rows),
// wings up and down.
function owlAt(t, x, py) {
  const flap = Math.floor(t * 5) % 2;
  pixels(x, py, flap ? 'w....w\nww..ww\n.wyyw.\n..ww..' : '......\n.wyyw.\nwwwwww\nw.ww.w', { w: '#6a5080', y: '#ffd040' });
}
// Lightning: the whole strip flashing white and fading, from t0.
function lightning(u, t0) {
  const k = (u - t0) / 0.3;
  if (k >= 0 && k < 1) fill(0, 0, w, h, ' ', mix('#e8e8ff', '#101420', k), mix('#e8e8ff', '#101420', k));
}
`

// Swan Lake, act II: night on the lake, a moon, reeds, and Clawd as the swan queen
// in a white tutu, the arms beating like wings; the cygnets join on a wide
// strip.
const SWANS = String.raw`
const ROUTINE = 22;
const LOOK = ODETTE;
key(0, P(1.3, 'left', SECOND, 'stand'));
key(3, P(0.55, 'left', SECOND, 'stand'));
key(3.4, P(0.5, 'left', RAISED.left, 'derriere'));
key(5.2, P(0.5, 'left', RAISED.left, 'derriere'));
pirouettes(5.5, 2.2, 0.5, 2);
key(8, P(0.5, 'front', SECOND, 'stand'));
key(14.2, P(0.5, 'front', SECOND, 'stand'));
key(14.8, P(0.5, 'front', SECOND, 'plie'));
key(16.4, P(0.5, 'front', BAS, 'plie', { eyes: 'closed' }));
key(18.6, P(0.5, 'front', BAS, 'plie', { eyes: 'closed' }));
key(19.4, P(0.5, 'front', FIFTH, 'stand', { eyes: 'happy' }));
key(19.8, P(0.5, 'left', SECOND, 'stand'));
key(22, P(-0.3, 'left', SECOND, 'stand'));
line(0.5, 2.4, ['by the lake, at midnight...', 'a swan glides in...', 'swan lake, act two.']);
line(19.2, 21, ['...just kidding!', 'i feel better now.', 'encore!']);

// Von Rothbart, the sorcerer as an owl, flying across the moon as the
// swan dies.
function owl(t, u) {
  const k = (u - 14.4) / 4.4;
  if (k < 0 || k > 1) return;
  owlAt(t, Math.round(lerp(w + 4, -8, k)), Math.round(Math.sin(k * 7)) * 2);
}

function frame(t, dt) {
  const u = mod(t, ROUTINE);
  const n = Math.floor(t / ROUTINE);
  const floor = h - 1;
  lake(t, floor);
  owl(t, u);
  let p = blinking(track(KEYS, u), t);
  // Wingbeats while gliding in and out, slower as the swan sinks.
  if (u < 3 || u > 19.8) p.arms = BEAT[Math.floor(t * 5) % 4];
  if (u > 14.2 && u < 16.4) p.arms = BEAT[Math.floor(t * 2.5) % 4];
  if (u < 3 || u > 19.8) p = bourree(p, t);
  // The little swans: arms linked, stepping side to side in unison and
  // turning their heads together, where the strip has room for them.
  if (u > 8.2 && u < 14.2 && w >= 72) {
    const count = w >= 110 ? 4 : w >= 90 ? 3 : 2;
    const k = u - 8.2;
    const step = Math.floor(k * 3);
    const view = step % 8 < 2 ? 'right' : step % 8 < 4 ? 'front' : step % 8 < 6 ? 'left' : 'front';
    const x0 = w / 2 - (count - 1) * 9.5 + Math.sin(k * 1.5) * 4;
    for (let i = 0; i < count; i++) {
      const q = P(0, view, SECOND, step % 2 ? 'stand' : 'plie', { air: step % 4 === 3 ? 2 : 0 });
      dancer(blinking(q, t + i * 0.7), Math.round(x0 + i * 19), floor * 2 - 1, LOOK);
    }
    const said = saying(u, n);
    if (said) say(said, Math.round(w / 2), 0);
    return;
  }
  const cx = Math.round(12 + (w - 24) * p.x);
  const d = dancer(p, cx, floor * 2 - 1, LOOK);
  if (u > 5.7 && u < 7.4) sparkles(t, d, floor, '#d8e4ff');
  const said = saying(u, n);
  if (said) speak(said, d);
}
`

// The Nutcracker: snow falling on a winter night, the tree lit up, and
// Clawd as the Sugar Plum Fairy, all turns and sparkle.
const SUGAR = String.raw`
const ROUTINE = 20;
const LOOK = { tutu: '#d87ab8', frill: '#ffc8e8', crown: '.y.y.\nyyyyy', crownColors: { y: '#ffd84a' } };
key(0, P(-0.3, 'right', SECOND, 'stand'));
key(1.6, P(0.2, 'right', SECOND, 'stand'));
key(1.8, P(0.2, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
key(4.2, P(0.7, 'front', FIFTH, 'passe', { spinning: true, spin: 1440 }));
key(4.5, P(0.7, 'front', SECOND, 'plie', { spin: 1440 }));
key(4.8, P(0.7, 'front', FIFTH, 'stand', { air: 4 }));
key(5.1, P(0.7, 'front', BAS, 'plie'));
key(5.4, P(0.7, 'front', FIFTH, 'stand', { air: 4 }));
key(5.7, P(0.7, 'front', BAS, 'plie'));
key(6, P(0.7, 'front', SECOND, 'stand', { air: 4 }));
key(6.4, P(0.7, 'front', BAS, 'plie'));
key(7, P(0.6, 'front', FIFTH, 'stand'));
key(7.8, P(0.6, 'right', RAISED.right, 'derriere'));
key(8.8, P(0.6, 'right', RAISED.right, 'derriere'));
key(9.2, P(0.6, 'left', RAISED.left, 'derriere'));
key(10.6, P(0.6, 'left', RAISED.left, 'derriere'));
leaps(10.8, 0.6, 0.2, 2);
key(12.6, P(0.2, 'front', SECOND, 'plie'));
key(12.8, P(0.2, 'front', SECOND, 'passe', { spinning: true, spin: 0 }));
key(15.6, P(0.2, 'front', SECOND, 'passe', { spinning: true, spin: 2160 }));
key(16, P(0.2, 'right', RAISED.right, 'derriere', { eyes: 'happy', spin: 2160 }));
key(17.6, P(0.2, 'right', RAISED.right, 'derriere', { eyes: 'happy' }));
key(18.2, P(0.2, 'front', BAS, 'plie', { eyes: 'closed' }));
key(19.2, P(0.2, 'left', SECOND, 'stand'));
key(20, P(-0.3, 'left', SECOND, 'stand'));
line(0.4, 1.6, ['sugar plum, coming through!', 'tinkle tinkle!', 'a winter night...']);
line(16.1, 17.8, ['the sugar plum fairy!', 'ta-da!', 'merry everything!']);

const LIGHTS = ['#ff5a5a', '#ffd84a', '#5ad0ff', '#9aff6a'];
function tree(t, floor) {
  const x0 = w - 12;
  for (let y = 0; y < floor - 1; y++) {
    const half = Math.min(5, Math.floor(y * 0.8) + 1);
    for (let x = -half; x <= half; x++) {
      const isLight = (x * 7 + y * 3) % 5 === 0;
      put(x0 + x, y, isLight ? '•' : '▲', isLight ? LIGHTS[mod(x + y + Math.floor(t * 3), 4)] : '#2e7a40');
    }
  }
  put(x0, 0, '★', '#ffd84a');
  put(x0, floor - 1, '█', '#6a4428');
}

function frame(t, dt) {
  const u = mod(t, ROUTINE);
  const n = Math.floor(t / ROUTINE);
  const floor = h - 1;
  const R = w - (w >= 60 ? 30 : 12);
  if (w >= 60) tree(t, floor);
  let p = blinking(track(KEYS, u), t);
  if (u < 1.6 || u > 19.2) p = bourree(p, t);
  // Fouettés: the arms whip out to the side and back in each turn.
  if (u > 12.8 && u < 15.6) p.arms = mod(p.spin, 360) < 180 ? FIFTH : SECOND;
  const cx = Math.round(12 + (R - 12) * p.x);
  boards(floor, cx, '#9a7a9a', '#6a4a6a', '#ffe0f4');
  const d = dancer(p, cx, floor * 2 - 1, LOOK);
  if ((u > 1.9 && u < 4.2) || (u > 12.9 && u < 15.6) || p.air > 2.5) sparkles(t, d, floor, '#ffc8f0');
  const said = saying(u, n);
  if (said) speak(said, d);
}
`

// Class: the studio, a barre along the wall, and Clawd working through
// the exercises with a teacher counting.
const CLASS = String.raw`
const ROUTINE = 20;
const B = (legs, arms, more) => P(0.3, 'right', arms || ['out', 'out'], legs, more);
key(0, B('stand', BAS));
key(0.8, B('plie', BAS));
key(1.4, B('stand', SECOND));
key(2, B('plie', SECOND));
key(2.6, B('stand', FIFTH));
key(3.4, B('derriere', RAISED.right));
key(3.9, B('stand'));
key(4.4, B('derriere', RAISED.right));
key(4.9, B('stand'));
key(5.4, B('passe', FIFTH));
key(5.9, B('stand'));
key(6.4, B('passe', FIFTH));
key(6.9, B('stand'));
key(7.4, B('passe', FIFTH));
key(9.4, B('passe', FIFTH));
key(9.8, P(0.6, 'front', BAS, 'stand'));
pirouettes(10.4, 1.6, 0.6, 2);
key(12.4, P(0.6, 'front', SECOND, 'stand', { air: 4 }));
key(12.8, P(0.6, 'front', BAS, 'plie'));
key(13.2, P(0.6, 'front', SECOND, 'stand', { air: 4 }));
key(13.6, P(0.6, 'front', BAS, 'plie'));
key(14, P(0.6, 'front', FIFTH, 'stand', { air: 4 }));
key(14.4, P(0.6, 'front', BAS, 'plie'));
key(15.2, P(0.6, 'front', FIFTH, 'stand', { eyes: 'happy' }));
key(16.8, P(0.6, 'front', FIFTH, 'stand', { eyes: 'happy' }));
key(17.4, P(0.6, 'right', RAISED.right, 'derriere'));
key(18.2, P(0.6, 'front', BAS, 'plie', { eyes: 'closed' }));
key(19.2, P(0.3, 'right', BAS, 'stand'));
key(20, P(0.3, 'right', BAS, 'stand'));
line(0.2, 2.2, ['and plie, 2, 3, 4...', 'at the barre, please.', 'class, begin!']);
line(15, 16.6, ['lovely!', 'beautiful line!', 'very nice, clawd.']);
line(17.4, 18.8, ['merci, madame.', 'thank you!', 'same time tomorrow?']);

// The piano, where the teacher plays and counts, a metronome on it ticking
// and notes rising; where the strip has room.
function piano(t, floor) {
  const x0 = w - 12;
  for (let i = 0; i < 9; i++) {
    put(x0 + i, floor - 3, '█', '#4a2a1a');
    put(x0 + i, floor - 2, '▀', i % 3 === 1 ? '#2a2420' : '#f0ece0', '#4a2a1a');
  }
  put(x0, floor - 1, '│', '#4a2a1a');
  put(x0 + 8, floor - 1, '│', '#4a2a1a');
  put(x0 + 6, floor - 4, '╱│╲│'[Math.floor(t * 4) % 4], '#e0c080');
  for (let i = 0; i < 3; i++) {
    const k = fract(t * 0.4 + i / 3);
    put(x0 + 2 + Math.round(Math.sin(k * 6 + i) * 2), Math.round((floor - 4) * (1 - k)), '♪♫♪'[i], mix('#be96d2', '#2a2a40', k));
  }
}
function studio(floor) {
  for (let y = 0; y < floor; y++) for (let x = 4; x < w - 4; x += 16) put(x, y, '│', '#3a3a50');
  // In pixels, so Clawd in front of it covers it.
  for (let x = 2; x < w - 2; x++) pixel(x, (floor - 4) * 2 + 1, '#b08860');
  for (let x = 6; x < w - 4; x += 20) {
    put(x, floor - 3, '│', '#806040');
    put(x, floor - 2, '│', '#806040');
  }
  for (let x = 0; x < w; x++) put(x, floor, '▀', '#8a7a68', '#6a5c4c');
}

function frame(t, dt) {
  const u = mod(t, ROUTINE);
  const n = Math.floor(t / ROUTINE);
  const floor = h - 1;
  studio(floor);
  const hasPiano = w >= 60;
  if (hasPiano) piano(t, floor);
  const p = blinking(track(KEYS, u), t);
  const R = hasPiano ? w - 26 : w - 12;
  const cx = Math.round(12 + (R - 12) * p.x);
  const d = dancer(p, cx, floor * 2 - 1, { tutu: '#c8c0e8', frill: '#ece8fa' });
  if (u > 10.5 && u < 11.8) sparkles(t, d, floor, '#e8e0ff');
  const said = saying(u, n);
  // The teacher counts from the piano; the last word is Clawd's.
  if (said && hasPiano && u < 17.4) say(said, w - 8, floor - 4);
  else if (said) speak(said, d);
}
`

// The Firebird: the enchanted garden at night, the tree of golden apples,
// and Clawd as the Firebird in red and gold with a plume, embers trailing
// wherever it flies. It steals an apple, is caught, leaves a feather, dances
// the infernal dance, sings the lullaby and flies off.
const FIRE = String.raw`
const ROUTINE = 22;
const LOOK = { tutu: '#c8283a', frill: '#ffb84a', crown: 'r.y.r\nryyyr', crownColors: { r: '#ff5a2a', y: '#ffd040' } };
const BEAT = [FIFTH, SECOND, BAS, SECOND];
key(0, P(1.3, 'left', SECOND, 'stand'));
leaps(0.2, 1.3, 0.6, 3);
key(2.8, P(0.6, 'front', FIFTH, 'stand', { eyes: 'happy' }));
key(3.4, P(0.6, 'left', FIFTH, 'stand'));
key(5.4, P(0.14, 'left', FIFTH, 'stand'));
key(5.7, P(0.14, 'left', RAISED.left, 'stand'));
key(6.4, P(0.14, 'left', RAISED.left, 'stand', { eyes: 'happy' }));
// Caught: twisting this way and that.
for (let i = 0; i < 8; i++) {
  const side = i % 2 ? 'left' : 'right';
  key(6.6 + i * 0.3, P(0.16 + (i % 2) * 0.04, side, i % 2 ? FIFTH : SECOND, i % 2 ? 'stand' : 'plie'));
}
reverence(9.2, 0.3, 'right', 1.2);
key(10.9, P(0.3, 'front', SECOND, 'stand'));
// The infernal dance: turning all the way across.
key(11.2, P(0.3, 'front', SECOND, 'plie'));
key(11.4, P(0.3, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
key(13.8, P(0.75, 'front', FIFTH, 'passe', { spinning: true, spin: 2160 }));
key(14.1, P(0.75, 'front', SECOND, 'plie', { spin: 2160 }));
tour(14.3, 0.75, 2);
entrechats(15.2, 0.75, 2);
// The lullaby: rocking slowly, eyes closed.
balances(16.8, 0.6, 4, FIFTH, 0.7, { eyes: 'closed' });
key(19.6, P(0.6, 'left', SECOND, 'stand'));
leaps(19.8, 0.6, -0.4, 3);
line(2.7, 3.6, ['the firebird!', 'ta-da!', 'hot hot hot!']);
line(6.7, 8.2, ['eek! let me go!', 'who grabbed me?!', 'unhand me, ivan!']);
line(9.4, 10.8, ['take this feather.', 'call me if you need me.', 'a gift, for you.']);

// The tree of golden apples, at the left; the apple Clawd takes is gone
// from then on.
function garden(t, u, floor) {
  if (w < 60) return;
  const x0 = 7;
  const half = [3, 5, 6, 5];
  for (let y = 0; y < 4; y++) {
    for (let x = -half[y]; x <= half[y]; x++) {
      const leaf = mod(x + y, 3) === 0 ? '#1a3a24' : '#24502e';
      const isApple = mod(x * 5 + y * 3, 7) === 0 && !(x === 5 && y === 1 && u > 5.9);
      const glint = fract(t * 0.5 + x * 0.13 + y * 0.31) < 0.08;
      if (isApple) put(x0 + x, y, '●', glint ? '#fff4b0' : '#ffc830', leaf);
      else put(x0 + x, y, '█', leaf);
    }
  }
  for (let y = 4; y < floor; y++) put(x0, y, '█', '#4a2e1c');
}
// Embers where Clawd has just been: a ring of where it was, drawn as
// sparks fading from gold to red, off Clawd itself.
const TRAIL = [];
let slot = 0;
function embers(t, d, floor) {
  TRAIL[slot % 16] = [t, d.x, d.row];
  slot++;
  for (let i = 0; i < TRAIL.length; i++) {
    const e = TRAIL[i];
    const age = t - e[0];
    if (age < 0.05 || age > 0.8 || Math.abs(e[1] - d.x) < 4) continue;
    for (let j = 0; j < 2; j++) {
      const col = Math.round(e[1] + (rand(e[0] * 97 + j) - 0.5) * 12);
      const row = Math.round(e[2] + 1 + rand(e[0] * 89 + j + 1) * 3 - age * 2);
      if (row < 0 || row >= floor || (col > d.x - 11 && col < d.x + 11 && row >= d.row - 1)) continue;
      put(col, row, age < 0.3 ? '*' : '·', mix('#ffe070', '#c02818', age / 0.8));
    }
  }
}
// The feather Clawd leaves: drifting down from beside it, then lying on
// the ground, glowing.
function feather(t, u, x, floor) {
  if (u < 9.8 || u > 21.5) return;
  const k = clamp((u - 9.8) / 1.6);
  const col = Math.round(x + 11 + Math.sin(k * 9) * 2);
  if (k < 1) {
    let py = Math.round(lerp(4, floor * 2 - 4, k));
    if (mod(py, 2) === 1) py -= 1;
    pixels(col, py, '.y\nyr\nrr\nr.', { y: '#ffd040', r: '#ff5a2a' });
  } else {
    const glow = 0.5 + 0.5 * Math.sin(t * 4);
    pixels(col - 1, floor * 2 - 1, 'rryy', { r: mix('#c02818', '#ff7a3a', glow), y: mix('#e0a020', '#fff0a0', glow) });
  }
}

function frame(t, dt) {
  const u = mod(t, ROUTINE);
  const n = Math.floor(t / ROUTINE);
  const floor = h - 1;
  let p = blinking(track(KEYS, u), t);
  if (u > 3.4 && u < 5.4) {
    p = bourree(p, t);
    p.arms = BEAT[Math.floor(t * 6) % 4];
  }
  if (u > 11.4 && u < 13.8) p.arms = mod(p.spin, 360) < 180 ? FIFTH : SECOND;
  p = beating(p, t);
  const cx = Math.round(12 + (w - 24) * p.x);
  for (let x = 0; x < w; x++) {
    const pool = clamp(1 - Math.abs(x - cx) / 12);
    put(x, floor, '▀', mix(x % 7 === 0 ? '#3a5a2a' : '#2a4422', '#ff9040', pool * 0.35), mix('#1a2c18', '#802a10', pool * 0.3));
  }
  garden(t, u, floor);
  feather(t, u, 12 + (w - 24) * 0.3, floor);
  const d = dancer(p, cx, floor * 2 - 1, LOOK);
  if (u < 2.8 || u > 19.6 || (u > 11.4 && u < 16.6)) embers(t, d, floor);
  if (u > 6.6 && u < 9) put(d.x + (Math.floor(t * 6) % 2 ? -7 : 7), Math.max(0, d.row - 2), '!', '#ffe070');
  if ((u > 11.5 && u < 13.8) || p.air > 3.5) sparkles(t, d, floor, '#ffb040');
  if (u > 16.8 && u < 19.4) sparkles(t * 0.3, d, floor, '#a06040');
  const said = saying(u, n);
  if (said) speak(said, d);
}
`

// Shared by the pieces for more than one dancer (Mayerling, McGregor):
// Rudolf, poses placed for partners, a second track, a turn in the air on
// any track, a phrase of sharp poses, and the lights.
const DUETS = String.raw`
// Rudolf: Clawd without a tutu, in breeches and boots.
const RUDOLF = { bare: true, breeches: '#c8a070', shoes: '#16120e' };
// Poses placed from the stage's middle: x a fraction of the stage, dx in
// columns, so partners meet exactly whatever the width.
const M = (x, dx, view, arms, legs, more) => P(x, view, arms, legs, Object.assign({ dx: dx }, more || {}));
const RK = [];
const rkey = (t, p) => RK.push([t, p]);
const CK = [];
const ckey = (t, p) => CK.push([t, p]);
// A tour en l'air on a track (key, rkey, ...): a partner's straight legs,
// as breeches have no room for a stride.
function tourOn(add, t0, x, dx, n) {
  add(t0, M(x, dx, 'front', SECOND, 'plie'));
  add(t0 + 0.15, M(x, dx, 'front', FIFTH, 'stand', { spinning: true, spin: 0 }));
  add(t0 + 0.4, M(x, dx, 'front', FIFTH, 'stand', { spinning: true, spin: 180 * n, air: 4 }));
  add(t0 + 0.65, M(x, dx, 'front', FIFTH, 'stand', { spinning: true, spin: 360 * n }));
  add(t0 + 0.8, M(x, dx, 'front', SECOND, 'plie', { spin: 360 * n }));
}
// Pirouettes on a track, placed as M places them: n turns in passé from a
// plié, landing on the spin they end on.
function pirouettesOn(add, t0, length, x, dx, n) {
  add(t0, M(x, dx, 'front', SECOND, 'plie'));
  add(t0 + 0.2, M(x, dx, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
  add(t0 + length - 0.3, M(x, dx, 'front', FIFTH, 'passe', { spinning: true, spin: 360 * n }));
  add(t0 + length, M(x, dx, 'front', SECOND, 'plie', { spin: 360 * n }));
}
// Travelling steps on a track: n little jumps from x0 to x1, each from a
// plié, a beat apart, facing the way they go: dancers run on in steps
// rather than glide.
function steps(add, t0, x0, x1, dx, n, arms, beat) {
  const view = x1 > x0 ? 'right' : 'left';
  for (let i = 0; i < n; i++) {
    add(t0 + i * beat, M(x0 + (x1 - x0) * i / n, dx, view, arms, 'plie'));
    add(t0 + (i + 0.5) * beat, M(x0 + (x1 - x0) * (i + 0.5) / n, dx, view, arms, 'stand', { air: 2 }));
  }
  add(t0 + n * beat, M(x1, dx, view, arms, 'plie'));
}
// A phrase of sharp poses, one every dt seconds, on a track: each step
// [view, arms, legs, columns aside]. A dancer in breeches (isBare) has no
// room for a leg behind or a stride, so those become a plié.
function phrase(add, t0, dt, x, dx, steps, isBare) {
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    const legs = isBare && (st[2] === 'derriere' || st[2] === 'jete') ? 'plie' : st[2];
    add(t0 + i * dt, M(x, dx + (st[3] || 0), st[0], st[1], legs, st[4]));
  }
}
// The lights closing in: dark outside an oval round (cx, middle) of a
// radius in columns, a cell twice as tall as wide.
function lights(cx, radius, floor) {
  for (let y = 0; y <= floor; y++) {
    const dy = (y - floor / 2) * 2;
    const half = radius > Math.abs(dy) ? Math.sqrt(radius * radius - dy * dy) : 0;
    const a = Math.round(cx - half);
    const b = Math.round(cx + half);
    if (half <= 0) fill(0, y, w, 1, ' ', '#050608', '#050608');
    else {
      if (a > 0) fill(0, y, a, 1, ' ', '#050608', '#050608');
      if (b < w) fill(b, y, w - b, 1, ' ', '#050608', '#050608');
    }
  }
}
`

// Mayerling, act I: the wedding ball at the Hofburg, Vienna, 1881. Rudolf
// and Princess Stephanie (pale blue, a tiara) bow, waltz arm in arm, and
// she twirls under his arm; he turns away from her, dances alone, all
// jumps and turns, and leaves her standing.
const BALL = String.raw`
const ROUTINE = 22;
const STEPH = { tutu: '#b8c8e8', frill: '#e8f0ff', crown: '.y.y.\nyyyyy', crownColors: { y: '#ffd84a' } };
key(0, M(-0.3, 0, 'right', SECOND, 'stand'));
key(2.2, M(0.5, -9, 'right', SECOND, 'stand'));
rkey(0, M(1.3, 0, 'left', BAS, 'stand'));
rkey(2.2, M(0.5, 9, 'left', BAS, 'stand'));
// Bows: her curtsy, his bow.
key(2.4, M(0.5, -9, 'right', SECOND, 'derriere'));
key(2.8, M(0.5, -9, 'right', BAS, 'derriere', { eyes: 'closed' }));
key(3.3, M(0.5, -9, 'right', BAS, 'derriere', { eyes: 'closed' }));
rkey(2.4, M(0.5, 9, 'left', BAS, 'plie', { eyes: 'closed' }));
rkey(3.3, M(0.5, 9, 'left', BAS, 'plie', { eyes: 'closed' }));
// The waltz, arm in arm: down on each first beat, travelling.
for (let i = 0; i <= 10; i++) {
  const x = 0.5 + 0.2 * Math.sin(i * 0.6);
  const legs = i % 2 ? 'stand' : 'plie';
  key(3.6 + i * 0.45, M(x, -7, 'right', ['down', 'out'], legs));
  rkey(3.6 + i * 0.45, M(x, 7, 'left', ['out', 'down'], legs));
}
// She twirls under his raised arm.
key(8.4, M(0.5, -9, 'front', SECOND, 'plie'));
key(8.6, M(0.5, -9, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
key(9.8, M(0.5, -9, 'front', FIFTH, 'passe', { spinning: true, spin: 720 }));
key(10.1, M(0.5, -9, 'right', ['down', 'out'], 'stand', { spin: 720 }));
rkey(8.4, M(0.5, 7, 'left', ['high', 'down'], 'stand'));
rkey(10, M(0.5, 7, 'left', ['high', 'down'], 'stand'));
// He turns his back on her, and dances alone.
rkey(10.6, M(0.5, 7, 'right', BAS, 'stand'));
rkey(11.4, M(0.6, 0, 'right', SECOND, 'stand'));
tourOn(rkey, 11.8, 0.6, 0, 2);
rkey(12.9, M(0.68, 0, 'right', FIFTH, 'stand', { air: 4 }));
rkey(13.3, M(0.76, 0, 'right', SECOND, 'plie'));
rkey(13.7, M(0.84, 0, 'right', FIFTH, 'stand', { air: 4 }));
rkey(14.1, M(0.9, 0, 'right', SECOND, 'plie'));
tourOn(rkey, 14.4, 0.9, 0, 2);
rkey(15.4, M(0.9, 0, 'left', BAS, 'stand', { eyes: 'closed' }));
rkey(16.4, M(0.9, 0, 'right', BAS, 'stand'));
rkey(18, M(1.4, 0, 'right', BAS, 'stand'));
key(10.6, M(0.5, -9, 'right', ['down', 'out'], 'stand'));
key(16.6, M(0.5, -9, 'right', ['down', 'out'], 'stand'));
key(17.2, M(0.5, -9, 'front', BAS, 'stand'));
key(18.4, M(0.5, -9, 'front', BAS, 'plie', { eyes: 'closed' }));
key(20.4, M(0.5, -9, 'front', BAS, 'plie', { eyes: 'closed' }));
key(21, M(0.5, -9, 'left', BAS, 'stand'));
key(22, M(-0.2, 0, 'left', BAS, 'stand'));
line(0.3, 2.2, ['vienna, 1881.', 'the royal wedding ball.', 'the hofburg, ablaze.']);
line(10.6, 11.6, ['how dull.', 'excuse me.', 'i need air.']);
line(17.6, 19.4, ['some wedding...', 'rudolf?', 'well then.']);

// The ballroom: cream and gold pilasters on dark rose walls, chandeliers
// twinkling, a parquet floor.
function ballroom(t, floor) {
  for (let x = 2; x < w; x += 20) {
    fill(x, 0, 2, floor, ' ', '#3a2a22', '#3a2a22');
    fill(x, 0, 1, floor, '│', '#b8944a', '#3a2a22');
  }
  for (let x = 12; x < w - 4; x += 20) {
    put(x, 0, '┃', '#b8944a');
    for (let i = -1; i <= 1; i++) put(x + i, 1, '▼', fract(t * 0.7 + x * 0.13 + i * 0.37) < 0.15 ? '#ffffff' : '#ffe0a0');
  }
}

function frame(t, dt) {
  const u = mod(t, ROUTINE);
  const n = Math.floor(t / ROUTINE);
  const floor = h - 1;
  const ground = floor * 2 - 1;
  const at = p => Math.round(12 + (w - 24) * p.x + (p.dx || 0));
  let s = blinking(track(KEYS, u), t);
  if (u < 2.2 || u > 21) s = bourree(s, t);
  const r = blinking(track(RK, u), t);
  const scx = at(s);
  const rcx = at(r);
  ballroom(t, floor);
  boards(floor, (scx + rcx) / 2, '#a07840', '#7a5a30', '#ffe8b4');
  dancer(r, rcx, ground, RUDOLF);
  const d = dancer(s, scx, ground, STEPH);
  const said = saying(u, n);
  if (said && u < 2.2) say(said, Math.round(w / 2), 0);
  else if (said && u > 10.5 && u < 15.4) speak(said, { x: rcx, row: d.row });
  else if (said) speak(said, d);
}
`

// Mayerling, act II: Mitzi Caspar's tavern. The Hungarian officers stamp
// and clap; Mitzi (red and black) dances among them; they turn in the air
// together; Rudolf comes in, and she dances with him, laughs off his talk
// of dying, and ends held high in a tableau with the officers knelt
// round her.
const TAVERN = String.raw`
const ROUTINE = 22;
const MITZI = { tutu: '#b01830', frill: '#1a1012', shoes: '#f0c0c8' };
const HUSSAR = { bare: true, breeches: '#2a3a6a', shoes: '#16120e' };
const OK = [];
const okey = (t, p) => OK.push([t, p]);
// Mitzi: in, leaping between the officers, a pose while they turn, to
// Rudolf, turns, and the tableau.
key(0, M(-0.3, 0, 'right', SECOND, 'stand'));
key(2.4, M(0.5, 0, 'right', SECOND, 'stand'));
leaps(2.6, 0.5, 0.7, 2);
leaps(4.1, 0.7, 0.3, 3);
leaps(6.4, 0.3, 0.5, 1);
key(7.4, M(0.5, 0, 'front', FIFTH, 'stand', { eyes: 'happy' }));
key(7.8, M(0.5, 0, 'right', RAISED.right, 'derriere'));
key(10.6, M(0.5, 0, 'right', RAISED.right, 'derriere'));
key(11.6, M(0.5, -7, 'right', ['down', 'out'], 'derriere'));
key(13, M(0.5, -7, 'right', ['down', 'out'], 'derriere'));
key(13.4, M(0.5, -9, 'right', FIFTH, 'stand', { air: 4, eyes: 'happy' }));
key(14.4, M(0.5, -9, 'right', FIFTH, 'stand', { air: 4, eyes: 'happy' }));
key(14.8, M(0.5, -9, 'front', SECOND, 'plie'));
key(15, M(0.5, -4, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
key(18.4, M(0.5, -4, 'front', FIFTH, 'passe', { spinning: true, spin: 1800 }));
key(18.8, M(0.5, -4, 'front', FIFTH, 'stand', { spin: 1800, eyes: 'happy' }));
key(22, M(0.5, -4, 'front', FIFTH, 'stand', { eyes: 'happy' }));
// Rudolf: in late, takes her hands, lifts her, then stands apart.
rkey(0, M(1.4, 0, 'left', BAS, 'stand'));
rkey(10.6, M(1.4, 0, 'left', BAS, 'stand'));
rkey(11.6, M(0.5, 7, 'left', SECOND, 'plie'));
rkey(13, M(0.5, 7, 'left', SECOND, 'plie'));
rkey(13.4, M(0.5, 7, 'left', ['high', 'down'], 'stand'));
rkey(14.4, M(0.5, 7, 'left', ['high', 'down'], 'stand'));
rkey(15, M(0.5, 18, 'left', BAS, 'stand', { eyes: 'closed' }));
rkey(22, M(0.5, 18, 'left', BAS, 'stand', { eyes: 'closed' }));
// The officers: stamping, three tours en l'air together, stamping, and
// down on one knee.
okey(0, M(0, 0, 'front', SECOND, 'stand'));
okey(7.6, M(0, 0, 'front', SECOND, 'stand'));
tourOn(okey, 7.8, 0, 0, 1);
tourOn(okey, 8.7, 0, 0, 1);
tourOn(okey, 9.6, 0, 0, 2);
okey(10.6, M(0, 0, 'front', SECOND, 'stand'));
okey(18.6, M(0, 0, 'front', SECOND, 'stand'));
okey(19, M(0, 0, 'front', FIFTH, 'kneel', { eyes: 'happy' }));
okey(22, M(0, 0, 'front', FIFTH, 'kneel', { eyes: 'happy' }));
const STAMPING = [[0, 7.6], [10.6, 18.6]];
line(0.3, 2.4, ['the tavern of mitzi caspar.', 'the hungarian officers!', 'vienna by night.']);
line(13.4, 14.6, ['die with me, mitzi.', 'a pact, mitzi?', 'together, forever...']);
line(15.2, 16.8, ['die? i would rather dance!', 'ha! no thank you!', 'dance with me instead!']);

// The tavern: dark beams and lanterns flickering.
function tavern(t, floor) {
  for (let x = 0; x < w; x += 11) fill(x, 0, 1, floor, '║', '#2a1a10', '#140c08');
  for (let x = 6; x < w - 2; x += 22) {
    put(x, 0, '│', '#4a3020');
    put(x, 1, '◘', mix('#ffb040', '#ffe090', rand(Math.floor(t * 6) + x)));
  }
}

function frame(t, dt) {
  const u = mod(t, ROUTINE);
  const n = Math.floor(t / ROUTINE);
  const floor = h - 1;
  const ground = floor * 2 - 1;
  const R = w - 12;
  const at = p => Math.round(12 + (R - 12) * p.x + (p.dx || 0));
  let m = blinking(track(KEYS, u), t);
  if (u < 2.4) m = bourree(m, t);
  const r = blinking(track(RK, u), t);
  let o = track(OK, u);
  for (const s of STAMPING) {
    if (u > s[0] && u < s[1]) {
      o.legs = Math.floor(t * 4) % 2 ? 'plie' : 'stand';
      o.arms = Math.floor(t * 4) % 2 ? FIFTH : SECOND;
    }
  }
  tavern(t, floor);
  boards(floor, at(m), '#6a4a2a', '#4a3018', '#ffc070');
  // As many officers as the strip has room for, at the ends of the stage,
  // clear of the middle where Mitzi and Rudolf dance.
  const PLACES = w >= 150 ? [0, 0.17, 0.83, 1] : w >= 90 ? [0, 1] : [];
  for (let i = 0; i < PLACES.length; i++) {
    dancer(blinking(Object.assign({}, o), t + i), Math.round(12 + (R - 12) * PLACES[i]), ground, HUSSAR);
  }
  if (u > 10.6) dancer(r, at(r), ground, RUDOLF);
  const d = dancer(m, at(m), ground, MITZI);
  if (u > 15 && u < 18.4) sparkles(t, d, floor, '#ffb0c0');
  const said = saying(u, n);
  if (said && u < 2.4) say(said, Math.round(w / 2), 0);
  else if (said && u > 13.4 && u < 14.6) speak(said, { x: at(r), row: d.row });
  else if (said) speak(said, d);
}
`

// Mayerling, act III: the hunting lodge, January 1889. Crown Prince Rudolf and Mary
// Vetsera: she arrives, the pull (her arabesque, his lunge, hands joined),
// her turns, her flight and return, and the enveloping kiss, Mary held
// upside down above Rudolf on his knees (drawn as one picture: the person
// chose it, an exception to legs pointing down). The lights close in on
// them and go to black; then, like Swan Lake, a joke: a pop in the dark
// (champagne), the lights up on both of them grinning, and a bow.
const MAYER = String.raw`
const ROUTINE = 24;
const MARY = { tutu: '#e8dcc0', frill: '#fff4e0' };
// Mary bourrées in to Rudolf, who waits brooding.
key(0, M(-0.3, 0, 'right', SECOND, 'stand'));
key(2.6, M(0.5, -14, 'right', SECOND, 'stand'));
// The pull: her arabesque, her arm out to his.
key(3, M(0.5, -7, 'right', ['down', 'out'], 'derriere'));
key(5.6, M(0.5, -7, 'right', ['down', 'out'], 'derriere'));
// Her turns beside him.
key(5.9, M(0.5, -9, 'front', SECOND, 'plie'));
key(6.1, M(0.5, -9, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
key(7.8, M(0.5, -9, 'front', FIFTH, 'passe', { spinning: true, spin: 720 }));
key(8.1, M(0.5, -9, 'front', SECOND, 'plie', { spin: 720 }));
// Away from him in leaps, back on pointe, and a leap into his arms.
key(8.3, M(0.5, -9, 'left', BAS, 'plie'));
key(8.65, M(0.5, -22, 'left', RAISED.left, 'jete', { air: 4 }));
key(9, M(0.5, -34, 'left', SECOND, 'plie'));
key(9.4, M(0.5, -34, 'right', SECOND, 'stand'));
key(11.2, M(0.5, -20, 'right', SECOND, 'stand'));
key(11.5, M(0.5, -20, 'right', BAS, 'plie'));
key(11.9, M(0.5, -8, 'right', RAISED.right, 'jete', { air: 4 }));
key(12.2, M(0.5, 0, 'right', RAISED.right, 'jete', { air: 4 }));
// After the dark, the joke: the lights up on both grinning, his bottle
// and her glass raised, the cork pops, and a bow.
key(17.9, M(0.5, -9, 'front', ['high', 'out'], 'stand', { eyes: 'happy' }));
key(20.4, M(0.5, -9, 'front', ['high', 'out'], 'stand', { eyes: 'happy' }));
key(20.6, M(0.5, -9, 'right', SECOND, 'derriere'));
key(21, M(0.5, -9, 'right', BAS, 'derriere', { eyes: 'closed' }));
key(22.4, M(0.5, -9, 'right', BAS, 'derriere', { eyes: 'closed' }));
key(22.8, M(0.5, -9, 'front', FIFTH, 'stand', { eyes: 'happy' }));
key(24, M(0.5, -9, 'front', FIFTH, 'stand', { eyes: 'happy' }));
rkey(0, M(0.5, 7, 'front', BAS, 'plie', { eyes: 'closed' }));
rkey(2.3, M(0.5, 7, 'front', BAS, 'plie', { eyes: 'closed' }));
rkey(2.7, M(0.5, 7, 'left', SECOND, 'plie'));
rkey(5.6, M(0.5, 7, 'left', SECOND, 'plie'));
rkey(6, M(0.5, 7, 'left', ['out', 'high'], 'stand'));
rkey(8.2, M(0.5, 7, 'left', ['out', 'high'], 'stand'));
rkey(8.6, M(0.5, 7, 'left', SECOND, 'stand'));
rkey(11, M(0.5, 7, 'left', SECOND, 'stand'));
rkey(11.6, M(0.5, 7, 'left', FIFTH, 'kneel'));
rkey(17.8, M(0.5, 7, 'left', FIFTH, 'kneel'));
rkey(17.9, M(0.5, 7, 'front', ['out', 'high'], 'stand', { eyes: 'happy' }));
rkey(20.4, M(0.5, 7, 'front', ['out', 'high'], 'stand', { eyes: 'happy' }));
rkey(20.6, M(0.5, 7, 'left', BAS, 'plie', { eyes: 'closed' }));
rkey(22.4, M(0.5, 7, 'left', BAS, 'plie', { eyes: 'closed' }));
rkey(22.8, M(0.5, 7, 'front', FIFTH, 'stand', { eyes: 'happy' }));
rkey(24, M(0.5, 7, 'front', FIFTH, 'stand', { eyes: 'happy' }));
const KISS_AT = 12.2;
line(0.3, 2.5, ['mayerling, 1889.', 'the hunting lodge...', 'a winter night.']);
line(3.2, 5.5, ['never let me go.', 'rudolf...', 'hold on to me.']);
line(19.4, 20.6, ['...just kidding!', 'champagne, anyone?', 'plot twist: we are fine!']);

// The kiss: Rudolf kneeling, body on the floor, his near arm up round
// her; Mary upside down above him, set four columns aside so the two
// shapes step apart, her nightdress fallen down her sides, her near arm
// round his neck, both with eyes closed, shaded on opposite sides. Her
// feet slowly part and close (two pictures). Whole cells throughout;
// Rudolf's body is columns 6 to 15.
const KISS_BODY = [
  'TFTFTFTFTFTFTF',
  'FTFTFTFTFTFTFT',
  '.FDDBBBBBBBBF',
  '.TDDBBBBBBBBT',
  '.FDDEEBBBEEBF',
  '.TDDBBBBBBBBT',
  'AADDBBBBBBBBAARRR',
  'AADDBBBBBBBBAARRR',
  '......DDBBBBBBBBRR',
  '......DDBBBBBBBBRR',
  '......DDBBBBBBBBRR',
  '......DDEEBBBEEBRR',
  '......DDBBBBBBBB',
  '......DDBBBBBBBB',
].join('\n');
const KISS = [
  '..S..S..S..S\n..L..L..L..L\n' + KISS_BODY,
  '...S.S..S.S\n...L.L..L.L\n' + KISS_BODY,
];
function kiss(t, rcx, ground) {
  const feet = Math.floor(t / 0.8) % 2;
  pixels(rcx - 11, ground - 15, KISS[feet], { S: MARY.frill, L: ORANGE, T: MARY.tutu, F: MARY.frill, B: ORANGE, D: SHADED, E: EYES, A: ORANGE, R: ORANGE });
}
// Little hearts drifting up from the kiss.
function hearts(t, u, x, floor) {
  for (let i = 0; i < 3; i++) {
    const k = fract((u - KISS_AT) * 0.45 + i / 3);
    const row = Math.round((floor - 4) * (1 - k));
    const col = Math.round(x + 10 + i * 3 + Math.sin(k * 6 + i) * 2);
    if (u - KISS_AT > i * 0.7) put(col, row, '♥', mix('#ff8aa8', '#3a2028', k * k));
  }
}
// The champagne: a bottle in Rudolf's raised hand, a glass in Mary's; at
// POP the cork flies off in an arc to the floor and the foam sprays up
// and falls.
const POP_AT = 18.6;
function champagne(t, u, dr, d, floor) {
  pixels(dr.x + 6, dr.top - 6, '.y.
.g.
ggg
ggg
ggg
ggg', { y: '#ffd84a', g: '#1e6a30' });
  pixels(d.x - 9, d.top - 4, 'c.c
cyc
.c.
ccc', { c: '#e8eef0', y: '#ffe070' });
  const k = u - POP_AT;
  if (k < 0) return;
  const top = Math.max(0, Math.floor(dr.top / 2) - 3);
  if (k < 0.25) put(dr.x + 7, top, '✶', '#ffffff');
  if (k < 0.9) put(dr.x + 8 + Math.round(k * 24), Math.round(lerp(top, floor - 1, (k / 0.9) * (k / 0.9))), '●', '#d8b080');
  // The foam: spilling out of the neck to both sides and falling.
  for (let i = 0; i < 14 && k < 1.8; i++) {
    const a = k - rand(i) * 0.5;
    if (a < 0 || a > 1.2) continue;
    const col = dr.x + 7 + Math.round((rand(i * 3) - 0.5) * 18 * a);
    const row = top + Math.round(a * a * 7);
    if (row < floor) put(col, row, a < 0.7 ? '●' : '•', mix('#fffbe8', '#ffe070', a / 1.2));
  }
}
// The window: night outside, snow falling past it.
function snowWindow(t, floor, x0) {
  fill(x0, 0, 10, floor - 2, ' ', '#101c34', '#101c34');
  for (let y = 0; y < floor - 2; y++) {
    put(x0, y, '█', '#2a1a10');
    put(x0 + 5, y, '│', '#2a1a10', '#101c34');
    put(x0 + 9, y, '█', '#2a1a10');
  }
  for (let x = x0; x < x0 + 10; x++) put(x, floor - 2, '▀', '#3a2618', '#0a2420');
  for (let i = 0; i < 8; i++) {
    const x = x0 + 1 + Math.floor(rand(i * 13) * 8);
    const y = Math.floor(mod(rand(i * 7) * (floor - 2) + t * (0.6 + rand(i) * 0.5), floor - 2));
    if (x !== x0 + 5) put(x, y, '·', '#e8f0ff', '#101c34');
  }
}

// The room: tall panels of green velvet between dark frames, lit where
// the two dance, and a candelabra.
function room(t, floor, cx) {
  for (let x = 0; x < w; x++) {
    const i = mod(x, 14);
    const light = clamp(1 - Math.abs(x - cx) / 30) * 0.5;
    const c = i < 2 ? '#0a0e0a' : mix(mix('#10261a', '#1e4222', 0.5 + 0.5 * Math.sin(i * 1.2 + Math.floor(x / 14))), '#3a6a30', light);
    fill(x, 0, 1, floor, ' ', c, c);
    put(x, floor, '▀', mix('#12403a', '#3a8070', light), '#0a2420');
  }
}
function candelabra(t, floor, x0, flames) {
  put(x0, floor - 1, '┴', '#a08040');
  put(x0, floor - 2, '│', '#a08040');
  put(x0 - 2, floor - 3, '└', '#a08040');
  put(x0 - 1, floor - 3, '─', '#a08040');
  put(x0, floor - 3, '┼', '#a08040');
  put(x0 + 1, floor - 3, '─', '#a08040');
  put(x0 + 2, floor - 3, '┘', '#a08040');
  for (let i = 0; i < 3; i++) {
    put(x0 - 2 + i * 2, floor - 4, '│', '#f0e8d0');
    if (i < flames) put(x0 - 2 + i * 2, floor - 5, '▲', mix('#ffb030', '#fff0a0', rand(Math.floor(t * 8) + i * 7)));
  }
}

function frame(t, dt) {
  const u = mod(t, ROUTINE);
  const n = Math.floor(t / ROUTINE);
  const floor = h - 1;
  const ground = floor * 2 - 1;
  const hasCandles = w >= 60;
  const L = hasCandles ? 16 : 10;
  const R = w - 10;
  const at = p => Math.round(L + (R - L) * p.x + p.dx);
  let m = blinking(track(KEYS, u), t);
  if (u < 2.6 || (u > 9.4 && u < 11.2)) m = bourree(m, t);
  const r = blinking(track(RK, u), t);
  const rcx = at(r);
  const mcx = at(m);
  room(t, floor, u < KISS_AT ? (mcx + rcx) / 2 : rcx);
  if (hasCandles) candelabra(t, floor, 6, 3);
  if (w >= 90) snowWindow(t, floor, w - 22);
  let d;
  if (u < KISS_AT || u > 17.9) {
    // Rudolf leans back in the pull, Mary with him.
    const lean = u > 3 && u < 5.6 ? Math.round(Math.sin((u - 3) * 2.4)) : 0;
    const dr = dancer(r, rcx + lean, ground, RUDOLF);
    d = dancer(m, mcx + lean, ground, MARY);
    if (u > 17.9 && u < 20.4) champagne(t, u, dr, d, floor);
  } else {
    kiss(t, rcx, ground);
    if (u < 15.6) hearts(t, u, rcx, floor);
    d = { x: rcx, row: 0, top: 0 };
  }
  // The lights close in on the kiss and go to black; then they come up
  // on the two of them, fine, with champagne.
  if (u > 15 && u < 18.4) {
    const radius = u < 17.4 ? 40 * (1 - (u - 15) / 2.4) : u < 17.9 ? 0 : 60 * (u - 17.9) / 0.5;
    lights(rcx - 2, Math.max(0, radius), floor);
    if (u < 17.9) return;
  }
  if (u > POP_AT && u < POP_AT + 0.7) say('POP!', at(r) - 4, 0);
  if (u > 19.2 && u < 21) sparkles(t, d, floor, '#ffe080');
  const said = saying(u, n);
  if (said && u < 2.6) say(said, Math.round(w / 2), 0);
  else if (said) speak(said, d);
}
`

// Wayne McGregor, a triple bill. His dancers' hyperextended lines are
// beyond Clawd's block of a body, so the style is in the staging: phrases
// of sharp poses snapping from one to the next, off-centre, sudden
// stillness, partners pulling each other off balance, and the designs.

// Chroma (2006): John Pawson's white room with its opening at the back,
// pale costumes, Jack White's orchestrated White Stripes. She steps out
// of the opening and dances alone, all snaps and freezes; he arrives and
// pulls her off balance, turns her, lifts her; they dance the phrase in
// canon; they turn; they go back into the opening and the light goes.
const CHROMA = String.raw`
const ROUTINE = 22;
const HER = { tutu: '#e8c4a8', frill: '#f6dcc6' };
const HIM = { bare: true, breeches: '#e0bc9e', shoes: '#e0bc9e' };
const SHARP = [
  ['right', ['high', 'down'], 'stand'], ['right', ['out', 'up'], 'derriere'], ['front', ['down', 'high'], 'plie', -2], ['left', ['up', 'out'], 'stand', -2],
  ['back', FIFTH, 'passe'], ['front', ['high', 'out'], 'stand', 2], ['right', BAS, 'plie', 2], ['left', ['out', 'high'], 'derriere', 1],
];
key(0, M(0.5, 0, 'front', BAS, 'stand', { eyes: 'closed' }));
key(1.2, M(0.5, 0, 'front', BAS, 'stand'));
phrase(key, 1.6, 0.3, 0.5, 0, SHARP);
phrase(key, 4, 0.25, 0.42, 0, SHARP);
key(6.2, M(0.42, 0, 'right', ['out', 'up'], 'derriere'));
key(7.4, M(0.42, 0, 'right', ['out', 'up'], 'derriere'));
key(7.7, M(0.42, 0, 'right', ['down', 'out'], 'derriere'));
key(9.4, M(0.42, 0, 'right', ['down', 'out'], 'derriere'));
key(9.6, M(0.42, -2, 'front', SECOND, 'plie'));
key(9.8, M(0.42, -2, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
key(11, M(0.42, -2, 'front', FIFTH, 'passe', { spinning: true, spin: 1080 }));
key(11.3, M(0.42, 1, 'right', RAISED.right, 'jete', { air: 4, spin: 1080 }));
key(12, M(0.42, 1, 'right', RAISED.right, 'jete', { air: 4 }));
phrase(key, 12.2, 0.3, 0.3, 0, SHARP);
phrase(key, 14.6, 0.3, 0.3, 0, SHARP);
pirouettes(17.2, 1.4, 0.3, 2);
key(19.4, M(0.5, -5, 'right', BAS, 'stand'));
key(22, M(0.5, -5, 'front', BAS, 'stand', { eyes: 'closed' }));
rkey(0, M(1.4, 0, 'left', BAS, 'stand'));
rkey(6.8, M(1.4, 0, 'left', BAS, 'stand'));
rkey(7.7, M(0.42, 14, 'left', SECOND, 'plie'));
rkey(9.4, M(0.42, 14, 'left', SECOND, 'plie'));
rkey(9.6, M(0.42, 14, 'left', ['out', 'high'], 'stand'));
rkey(11.2, M(0.42, 14, 'left', FIFTH, 'plie'));
rkey(12.1, M(0.42, 14, 'left', FIFTH, 'plie'));
phrase(rkey, 12.5, 0.3, 0.7, 0, SHARP, true);
phrase(rkey, 14.9, 0.3, 0.7, 0, SHARP, true);
tourOn(rkey, 17.4, 0.7, 0, 2);
rkey(19.4, M(0.5, 5, 'left', BAS, 'stand'));
rkey(22, M(0.5, 5, 'front', BAS, 'stand', { eyes: 'closed' }));
line(0.3, 1.5, ['chroma.']);

// The white room, its opening at the back stepped into the wall.
function whiteRoom(floor) {
  fill(0, 0, w, floor, ' ', '#e4e2dc', '#e4e2dc');
  const half = Math.min(14, Math.floor(w / 6));
  const x0 = Math.round(w / 2) - half;
  fill(x0, 1, half * 2, floor - 1, ' ', '#c9c6be', '#c9c6be');
  fill(x0 + 2, 2, half * 2 - 4, floor - 2, ' ', '#b4b0a6', '#b4b0a6');
  for (let x = 0; x < w; x++) put(x, floor, '▀', '#d4d0c8', '#bcb8b0');
}

function frame(t, dt) {
  const u = mod(t, ROUTINE);
  const n = Math.floor(t / ROUTINE);
  const floor = h - 1;
  const ground = floor * 2 - 1;
  const at = p => Math.round(12 + (w - 24) * p.x + (p.dx || 0));
  const s = blinking(track(KEYS, u), t);
  const r = blinking(track(RK, u), t);
  whiteRoom(floor);
  dancer(r, at(r), ground, HIM);
  const d = dancer(s, at(s), ground, HER);
  if (u > 20.6) lights(Math.round(w / 2), Math.max(0, 40 * (1 - (u - 20.6) / 1.2)), floor);
  const said = saying(u, n);
  if (said && u < 1.5) say(said, Math.round(w / 2), 0);
  else if (said && u > 20.6) return;
  else if (said) speak(said, d);
}
`

// Infra (2008): Julian Opie's LED screen across the top, little figures
// walking along it the whole time; below, Max Richter, dark, and boxes of
// light. Two couples dance in them; a cut; a crowd walks past one woman
// left alone, crying, and nobody stops; then one does, and they dance;
// the light goes, and the walkers walk on.
const INFRA = String.raw`
const ROUTINE = 24;
const HER = { tutu: '#3c3c48', frill: '#5c5c6c' };
const HIM = { bare: true, breeches: '#3c3c48', shoes: '#1a1a20' };
const CROWD = { bare: true, breeches: '#6a6a74', shoes: '#2a2a30' };
// The first couple; the second dances the same, mirrored, a beat behind.
key(0, M(0.25, -7, 'right', ['down', 'out'], 'derriere'));
key(2.4, M(0.25, -7, 'right', ['down', 'out'], 'derriere'));
key(2.6, M(0.25, -9, 'front', SECOND, 'plie'));
key(2.8, M(0.25, -9, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
key(4.4, M(0.25, -9, 'front', FIFTH, 'passe', { spinning: true, spin: 720 }));
key(4.7, M(0.25, -9, 'right', RAISED.right, 'derriere', { spin: 720 }));
key(5.4, M(0.25, -6, 'right', FIFTH, 'jete', { air: 4 }));
key(6.4, M(0.25, -6, 'right', FIFTH, 'jete', { air: 4 }));
key(6.8, M(0.25, -9, 'right', BAS, 'plie'));
key(7.6, M(0.25, -9, 'front', BAS, 'stand', { eyes: 'closed' }));
// Alone in the crowd, crying; then he comes back to her.
key(8, M(0.5, 0, 'front', BAS, 'stand', { eyes: 'closed' }));
key(15.4, M(0.5, 0, 'front', BAS, 'stand', { eyes: 'closed' }));
key(15.8, M(0.5, -7, 'right', ['down', 'out'], 'stand'));
key(17, M(0.5, -7, 'right', ['down', 'out'], 'derriere'));
key(17.3, M(0.5, -9, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
key(18.8, M(0.5, -9, 'front', FIFTH, 'passe', { spinning: true, spin: 720 }));
key(19.1, M(0.5, -6, 'right', FIFTH, 'jete', { air: 4, spin: 720 }));
key(20, M(0.5, -6, 'right', FIFTH, 'jete', { air: 4 }));
key(20.4, M(0.5, -7, 'right', ['down', 'out'], 'stand', { eyes: 'closed' }));
key(24, M(0.5, -7, 'right', ['down', 'out'], 'stand', { eyes: 'closed' }));
rkey(0, M(0.25, 7, 'left', SECOND, 'plie'));
rkey(2.4, M(0.25, 7, 'left', SECOND, 'plie'));
rkey(2.6, M(0.25, 7, 'left', ['out', 'high'], 'stand'));
rkey(5.2, M(0.25, 7, 'left', ['out', 'high'], 'stand'));
rkey(5.4, M(0.25, 7, 'left', FIFTH, 'plie'));
rkey(6.6, M(0.25, 7, 'left', FIFTH, 'plie'));
rkey(7.2, M(0.25, 7, 'right', BAS, 'stand'));
rkey(8, M(1.4, 0, 'right', BAS, 'stand'));
rkey(14.2, M(1.4, 0, 'left', BAS, 'stand'));
rkey(15.4, M(0.5, 7, 'left', SECOND, 'stand'));
rkey(17, M(0.5, 7, 'left', SECOND, 'plie'));
rkey(17.3, M(0.5, 7, 'left', ['out', 'high'], 'stand'));
rkey(19, M(0.5, 7, 'left', FIFTH, 'plie'));
rkey(20.2, M(0.5, 7, 'left', FIFTH, 'plie'));
rkey(20.4, M(0.5, 7, 'left', ['out', 'down'], 'stand', { eyes: 'closed' }));
rkey(24, M(0.5, 7, 'left', ['out', 'down'], 'stand', { eyes: 'closed' }));
line(0.3, 2.4, ['infra.']);

const WALKER = ['.w.\nwww\n.w.\nw.w', '.w.\nwww\n.w.\n.w.'];
const OPIE = ['#e8e8e8', '#8ac8ff', '#ff9ab8', '#ffe070', '#9aff9a'];
// The LED screen: figures walking both ways at their own pace.
function screen(t) {
  fill(0, 0, w, 2, ' ', '#101216', '#101216');
  for (let i = 0; i < Math.floor(w / 8); i++) {
    const dir = i % 2 ? 1 : -1;
    const speed = 3 + rand(i) * 4;
    const x = Math.round(mod(rand(i * 3) * w + dir * t * speed, w + 6) - 3);
    pixels(x, 0, WALKER[Math.floor(t * speed * 0.7 + i) % 2], { w: OPIE[i % 5] });
  }
}
// A box of light on the floor, and its glow.
function lightBox(x, floor) {
  fill(x - 11, 2, 22, floor - 2, ' ', '#16181e', '#16181e');
  for (let i = -11; i < 11; i++) put(x + i, floor, '▀', '#8a8c94', '#3a3c44');
}
const mirrored = p => Object.assign({}, p, { view: p.view === 'right' ? 'left' : p.view === 'left' ? 'right' : p.view, arms: [p.arms[1], p.arms[0]], x: 1 - p.x, dx: -p.dx });

function frame(t, dt) {
  const u = mod(t, ROUTINE);
  const n = Math.floor(t / ROUTINE);
  const floor = h - 1;
  const ground = floor * 2 - 1;
  const at = p => Math.round(12 + (w - 24) * p.x + (p.dx || 0));
  for (let x = 0; x < w; x++) put(x, floor, '▀', '#24262c', '#121318');
  screen(t);
  const s = blinking(track(KEYS, u), t);
  const r = blinking(track(RK, u), t);
  let d;
  if (u < 7.8) {
    lightBox(at(s) + 7, floor);
    if (w >= 90) lightBox(w - at(s) - 7, floor);
    if (w >= 90) {
      const s2 = mirrored(blinking(track(KEYS, Math.max(0, u - 0.5)), t + 0.3));
      const r2 = mirrored(blinking(track(RK, Math.max(0, u - 0.5)), t + 0.6));
      dancer(r2, at(r2), ground, HIM);
      dancer(s2, at(s2), ground, HER);
    }
  } else {
    lightBox(Math.round(w / 2), floor);
    // The crowd, walking past her both ways, never stopping.
    if (u > 8.4 && u < 14.6) {
      const count = w >= 120 ? 4 : w >= 70 ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const dir = i % 2 ? -1 : 1;
        const k = (u - 8.4) / 6.2;
        const x = dir > 0 ? lerp(-12, w + 12, mod(k * (1 + i * 0.3) + i * 0.27, 1)) : lerp(w + 12, -12, mod(k * (1 + i * 0.25) + i * 0.41, 1));
        const q = P(0, dir > 0 ? 'right' : 'left', BAS, Math.floor(t * 4 + i) % 2 ? 'stand' : 'plie');
        dancer(blinking(q, t + i), Math.round(x), ground, CROWD);
      }
    }
  }
  dancer(r, at(r), ground, HIM);
  d = dancer(s, at(s), ground, HER);
  if (u > 7.6 && u < 8.2) fill(0, 0, w, h, ' ', '#050608', '#050608');
  // The light goes; the walkers walk on.
  if (u > 21) {
    lights(Math.round(w / 2), Math.max(0, 40 * (1 - (u - 21) / 1.6)), floor);
    screen(t);
  }
  const said = saying(u, n);
  if (said && u < 2.4) say(said, Math.round(w / 2), 3);
  else if (said && u > 21) say(said, Math.round(w / 2), 3);
  else if (said) speak(said, d);
}
`

// Untitled, 2023: Carmen Herrera's white canvas cut across by a gash of
// baize green, close-fitting costumes in green and cream (Burberry), Anna
// Thorvaldsdottir's frozen landscapes of sound. Three dancers: frozen,
// waking; slow canon; a burst; one long slow turn; a duet leaning; and
// still again.
const UNTITLED = String.raw`
const ROUTINE = 22;
const GREEN = { bare: true, breeches: '#2e6a3a', shoes: '#f0eee8' };
const CREAM = { bare: true, breeches: '#bdb59e', shoes: '#f0eee8' };
const SLOW = [BAS, ['out', 'down'], SECOND, ['high', 'out'], FIFTH];
const BURST = [
  ['right', ['high', 'down'], 'plie'], ['left', ['up', 'out'], 'stand'], ['front', FIFTH, 'stand', 0, { air: 4 }], ['front', SECOND, 'plie'],
  ['back', ['down', 'high'], 'passe'], ['right', ['out', 'up'], 'stand'], ['front', ['high', 'out'], 'stand', 0, { air: 4 }], ['front', BAS, 'plie'],
];
const PLACES = [0.2, 0.5, 0.8];
const TRACKS = [key, rkey, ckey];
for (let i = 0; i < 3; i++) {
  const add = TRACKS[i];
  const x = PLACES[i];
  add(0, M(x, 0, 'front', BAS, 'stand', { eyes: 'closed' }));
  add(1.2 + i * 0.6, M(x, 0, 'front', BAS, 'stand', { eyes: 'closed' }));
  add(1.4 + i * 0.6, M(x, 0, 'front', BAS, 'stand'));
  for (let j = 0; j < SLOW.length; j++) add(3 + i * 0.5 + j * 0.8, M(x, 0, 'front', SLOW[j], j > 2 ? 'passe' : 'stand'));
  add(7.9, M(x, 0, 'front', FIFTH, 'stand'));
  phrase(add, 8.1, 0.25, x, 0, BURST, true);
  add(10.3, M(x, 0, 'front', BAS, 'plie'));
}
// The middle one turns once, slowly; the others kneel, arms lowering.
rkey(11, M(0.5, 0, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
rkey(14.4, M(0.5, 0, 'front', FIFTH, 'passe', { spinning: true, spin: 360 }));
rkey(14.8, M(0.5, 0, 'front', SECOND, 'plie', { spin: 360 }));
key(11, M(0.2, 0, 'front', FIFTH, 'kneel'));
key(14.6, M(0.2, 0, 'front', BAS, 'kneel'));
ckey(11, M(0.8, 0, 'front', FIFTH, 'kneel'));
ckey(14.6, M(0.8, 0, 'front', BAS, 'kneel'));
// A duet, leaning away from each other, hands joined; the third balances.
key(15.2, M(0.5, -21, 'right', ['down', 'out'], 'plie'));
key(18.2, M(0.5, -21, 'right', ['down', 'out'], 'plie'));
rkey(15.2, M(0.5, -7, 'left', ['out', 'down'], 'plie'));
rkey(18.2, M(0.5, -7, 'left', ['out', 'down'], 'plie'));
ckey(15.2, M(0.8, 0, 'front', SECOND, 'stand'));
ckey(16.2, M(0.8, 0, 'right', ['high', 'out'], 'passe'));
ckey(18.2, M(0.8, 0, 'right', ['high', 'out'], 'passe'));
for (let i = 0; i < 3; i++) {
  TRACKS[i](18.8, M(PLACES[i], 0, 'front', FIFTH, 'stand'));
  TRACKS[i](22, M(PLACES[i], 0, 'front', FIFTH, 'stand', { eyes: 'closed' }));
}
line(0.3, 2.6, ['untitled, 2023.']);

// The canvas: white, a hard-edged gash of green across it.
function canvas(floor) {
  fill(0, 0, w, floor, ' ', '#eeede8', '#eeede8');
  for (let y = 0; y < floor; y++) fill(Math.round(w * 0.62 - y * 4), y, Math.max(6, Math.round(w / 12)), 1, ' ', '#2e6a3a', '#2e6a3a');
  for (let x = 0; x < w; x++) put(x, floor, '▀', '#d8d6ce', '#c4c2ba');
}

function frame(t, dt) {
  const u = mod(t, ROUTINE);
  const n = Math.floor(t / ROUTINE);
  const floor = h - 1;
  const ground = floor * 2 - 1;
  const at = p => Math.round(12 + (w - 24) * p.x + (p.dx || 0));
  canvas(floor);
  const a = blinking(track(KEYS, u), t);
  const b = blinking(track(RK, u), t + 0.4);
  const c = blinking(track(CK, u), t + 0.8);
  if (w >= 60) dancer(c, at(c), ground, GREEN);
  dancer(a, at(a), ground, GREEN);
  const d = dancer(b, at(b), ground, CREAM);
  if (u > 20.4) lights(Math.round(w / 2), Math.max(0, 40 * (1 - (u - 20.4) / 1.4)), floor);
  const said = saying(u, n);
  if (said && u < 2.6) say(said, Math.round(w / 2), 0);
  else if (said && u < 20.4) speak(said, d);
}
`

// Swan Lake, act I: the palace garden at dusk, Prince Siegfried's
// birthday. His two friends dance a pas de trois with him; he is given a
// crossbow, wonders whom he must marry, sees swans fly over and follows
// them to the lake.
const SWAN1 = String.raw`
const ROUTINE = 22;
const PINK = { tutu: '#f0c0d4', frill: '#fff0f6' };
const BLUE = { tutu: '#b8d4f0', frill: '#eef6ff' };
rkey(0, M(-0.3, 0, 'right', SECOND, 'stand'));
steps(rkey, 0.2, -0.3, 0.5, 0, 4, SECOND, 0.5);
rkey(2.6, M(0.5, 0, 'front', SECOND, 'stand'));
key(0, M(1.3, 0, 'left', SECOND, 'stand'));
key(2.4, M(0.5, 20, 'left', SECOND, 'stand'));
ckey(0, M(-0.4, 0, 'right', SECOND, 'stand'));
ckey(2.4, M(0.5, -20, 'right', SECOND, 'stand'));
// The pas de trois, in a line, together.
const TRIO = [
  ['front', SECOND, 'plie'], ['front', FIFTH, 'stand', 0, { air: 4 }], ['front', SECOND, 'plie'], ['right', RAISED.right, 'derriere'],
  ['front', BAS, 'plie'], ['front', FIFTH, 'stand', 0, { air: 4 }], ['front', SECOND, 'plie'], ['left', RAISED.left, 'derriere'],
];
phrase(key, 3, 0.45, 0.5, 20, TRIO);
phrase(ckey, 3, 0.45, 0.5, -20, TRIO);
phrase(rkey, 3, 0.45, 0.5, 0, TRIO, true);
tourOn(key, 6.6, 0.5, 20, 2);
tourOn(ckey, 6.6, 0.5, -20, 2);
tourOn(rkey, 6.6, 0.5, 0, 2);
key(7.6, M(0.5, 20, 'left', BAS, 'derriere', { eyes: 'closed' }));
key(8.8, M(0.5, 20, 'left', BAS, 'derriere', { eyes: 'closed' }));
key(9.2, M(0.5, 20, 'right', SECOND, 'stand'));
key(11, M(1.3, 0, 'right', SECOND, 'stand'));
ckey(7.6, M(0.5, -20, 'right', BAS, 'derriere', { eyes: 'closed' }));
ckey(8.8, M(0.5, -20, 'right', BAS, 'derriere', { eyes: 'closed' }));
ckey(9.2, M(0.5, -20, 'left', SECOND, 'stand'));
ckey(11, M(-0.4, 0, 'left', SECOND, 'stand'));
// The crossbow, from his mother; then alone at dusk, his slow solo,
// wondering whom he must marry: the arms opening, a slow double
// pirouette, a reach to each side, double tours.
rkey(7.6, M(0.5, 0, 'front', BAS, 'plie', { eyes: 'happy' }));
rkey(9.4, M(0.5, 0, 'front', ['out', 'high'], 'stand', { eyes: 'happy' }));
rkey(10.6, M(0.5, 0, 'front', ['out', 'high'], 'stand', { eyes: 'happy' }));
rkey(11, M(0.5, 0, 'front', BAS, 'stand', { eyes: 'closed' }));
rkey(11.5, M(0.5, 0, 'front', SECOND, 'plie', { eyes: 'closed' }));
rkey(12, M(0.5, 0, 'front', FIFTH, 'stand'));
pirouettesOn(rkey, 12.2, 1.6, 0.5, 0, 2);
rkey(14.2, M(0.45, 0, 'left', ['high', 'down'], 'plie', { eyes: 'closed' }));
rkey(14.8, M(0.55, 0, 'right', ['down', 'high'], 'plie', { eyes: 'closed' }));
tourOn(rkey, 15.2, 0.55, 0, 2);
rkey(16.2, M(0.55, 0, 'front', BAS, 'stand'));
// Swans fly over; he points to them, and runs after them.
rkey(16.8, M(0.55, 0, 'right', ['out', 'up'], 'stand'));
rkey(18.6, M(0.55, 0, 'right', ['out', 'up'], 'stand'));
steps(rkey, 18.9, 0.55, 1.4, 0, 6, SECOND, 0.5);
line(0.3, 2.2, ['swan lake, act one.', 'the palace garden.', 'a birthday!']);
line(9.6, 10.6, ['a crossbow? for me?', 'thank you, mother!', 'how... practical.']);

// Dusk deepening over the garden, the palace's towers dark against it.
function dusk(u, floor) {
  const k = clamp((u - 12) / 8);
  for (let y = 0; y < floor; y++) {
    const c = mix(mix('#4a3a6a', '#e09060', y / floor), mix('#141030', '#5a3050', y / floor), k);
    fill(0, y, w, 1, ' ', c, c);
  }
  if (w >= 70) {
    const x0 = w - 16;
    fill(x0, 2, 12, floor - 2, ' ', '#241a2a', '#241a2a');
    fill(x0 + 1, 0, 3, 2, ' ', '#241a2a', '#241a2a');
    fill(x0 + 8, 0, 3, 2, ' ', '#241a2a', '#241a2a');
    put(x0 + 5, 3, '▮', k > 0.3 ? '#ffd070' : '#3a2a3a');
  }
  for (let x = 0; x < w; x++) put(x, floor, '▀', '#5a7a3a', '#3a5a2a');
}
// Swans flying over in a V.
function swansOver(u) {
  const k = (u - 16.6) / 4;
  if (k < 0 || k > 1) return;
  for (let i = 0; i < 5; i++) {
    const x = Math.round(lerp(-12, w + 12, k) - Math.abs(i - 2) * 4);
    pixels(x, Math.abs(i - 2) * 2, Math.floor(u * 6 + i) % 2 ? 'w.w\n.w.' : '...\nwww', { w: '#ffffff' });
  }
}

function frame(t, dt) {
  const u = mod(t, ROUTINE);
  const n = Math.floor(t / ROUTINE);
  const floor = h - 1;
  const ground = floor * 2 - 1;
  const at = p => Math.round(12 + (w - 24) * p.x + (p.dx || 0));
  dusk(u, floor);
  swansOver(u);
  let a = blinking(track(KEYS, u), t);
  let c = blinking(track(CK, u), t + 0.5);
  const r = blinking(track(RK, u), t + 0.3);
  if (u < 2.4 || (u > 9.2 && u < 11)) {
    a = bourree(a, t);
    c = bourree(c, t);
  }
  dancer(a, at(a), ground, PINK);
  dancer(c, at(c), ground, BLUE);
  const d = dancer(r, at(r), ground, PRINCE);
  if (u > 9.6 && u < 10.8) pixels(d.x + 6, d.top - 4, 'bbbbb\n..b..\n..b..\n..b..', { b: '#8a5a2a' });
  const said = saying(u, n);
  if (said && u < 2.2) say(said, Math.round(w / 2), 0);
  else if (said) speak(said, d);
}
`

// Swan Lake, act III: the ball. Von Rothbart brings his daughter Odile,
// the black swan, dressed as Odette; she dazzles the prince, pas de deux,
// her thirty-two fouettés, he swears to love her, Rothbart
// gloats, lightning, and the prince runs for the lake.
const SWAN3 = String.raw`
const ROUTINE = 24;
const ODILE = { tutu: '#18181e', frill: '#44445a', crown: '.r.r.\nkkkkk', crownColors: { r: '#e03040', k: '#101014' } };
const ROTHBART = { bare: true, breeches: '#3a1a3a', shoes: '#101010', crown: 'k...k\nkkkkk', crownColors: { k: '#1a0a1a' } };
// Odile bourrées in; Rothbart steps in behind her, and the prince comes
// to meet her.
key(0, M(-0.3, 0, 'right', SECOND, 'stand'));
key(2.4, M(0.5, -7, 'right', SECOND, 'stand'));
ckey(0, M(-0.4, 0, 'right', BAS, 'stand'));
steps(ckey, 0.2, -0.4, 0.12, 0, 4, BAS, 0.5);
rkey(0, M(0.8, 0, 'left', BAS, 'stand'));
rkey(2, M(0.8, 0, 'left', BAS, 'stand'));
steps(rkey, 2.2, 0.8, 0.59, 0, 2, SECOND, 0.45);
// The adagio: her arabesque, a balance in passé, arabesque again, a look
// back to her father, three turns in the prince's hands, and arabesque;
// Rothbart, behind, works her like a puppet.
key(3.2, M(0.5, -7, 'right', ['down', 'out'], 'derriere'));
key(4, M(0.5, -7, 'front', FIFTH, 'passe'));
key(4.6, M(0.5, -7, 'right', RAISED.right, 'derriere'));
key(5.2, M(0.5, -7, 'left', RAISED.left, 'derriere'));
key(5.6, M(0.5, -7, 'left', RAISED.left, 'derriere'));
key(5.8, M(0.5, -9, 'front', SECOND, 'plie'));
key(6, M(0.5, -9, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
key(7.2, M(0.5, -9, 'front', FIFTH, 'passe', { spinning: true, spin: 1080 }));
key(7.5, M(0.5, -9, 'right', RAISED.right, 'derriere', { spin: 1080, eyes: 'happy' }));
key(8.8, M(0.5, -9, 'right', RAISED.right, 'derriere', { eyes: 'happy' }));
rkey(3.2, M(0.5, 7, 'left', SECOND, 'plie'));
rkey(4, M(0.5, 7, 'left', ['out', 'high'], 'stand'));
rkey(4.6, M(0.5, 7, 'left', SECOND, 'plie'));
rkey(5.6, M(0.5, 7, 'left', SECOND, 'plie'));
rkey(5.8, M(0.5, 7, 'left', ['out', 'high'], 'stand'));
rkey(8.8, M(0.5, 7, 'left', ['out', 'high'], 'stand'));
rkey(9.2, M(0.5, 24, 'left', ['out', 'high'], 'stand'));
phrase(ckey, 2.6, 0.8, 0.12, 0, [
  ['right', ['out', 'high'], 'stand'], ['right', FIFTH, 'plie'], ['right', ['out', 'high'], 'stand'], ['right', FIFTH, 'plie'],
  ['right', ['out', 'high'], 'stand'], ['right', FIFTH, 'plie'], ['right', ['out', 'high'], 'stand'],
], true);
// Thirty-two fouettés (well, twelve turns; nobody's counting).
key(9.2, M(0.5, -4, 'front', SECOND, 'plie'));
key(9.4, M(0.5, -4, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
key(14.2, M(0.5, -4, 'front', FIFTH, 'passe', { spinning: true, spin: 4320 }));
key(14.5, M(0.5, -6, 'right', RAISED.right, 'derriere', { spin: 4320, eyes: 'happy' }));
key(16.6, M(0.5, -6, 'right', RAISED.right, 'derriere', { eyes: 'happy' }));
// He kneels and swears; Rothbart gloats, turning in the air in the
// lightning, and Odile dances her triumph; the prince sees, and runs.
rkey(14.6, M(0.5, 10, 'left', FIFTH, 'kneel'));
rkey(16.4, M(0.5, 10, 'left', FIFTH, 'kneel'));
rkey(16.8, M(0.5, 10, 'left', SECOND, 'stand'));
rkey(19.2, M(0.5, 10, 'left', SECOND, 'stand'));
rkey(19.4, M(0.5, 10, 'right', SECOND, 'stand'));
steps(rkey, 19.6, 0.5, 1.4, 10, 4, SECOND, 0.3);
ckey(16.6, M(0.12, 0, 'right', ['out', 'high'], 'stand'));
tourOn(ckey, 16.9, 0.2, 0, 2);
ckey(18, M(0.2, 0, 'right', FIFTH, 'stand', { eyes: 'happy' }));
ckey(21, M(0.2, 0, 'right', FIFTH, 'stand', { eyes: 'happy' }));
ckey(21.4, M(0.2, 0, 'left', SECOND, 'stand'));
steps(ckey, 21.6, 0.2, -0.4, 0, 4, SECOND, 0.55);
key(17, M(0.5, -6, 'front', FIFTH, 'stand', { eyes: 'happy' }));
balances(17.4, 0.5, 4, FIFTH, 0.6, { dx: -6, eyes: 'happy' });
key(20, M(0.5, -6, 'right', SECOND, 'derriere'));
key(20.4, M(0.5, -6, 'right', BAS, 'derriere', { eyes: 'closed' }));
key(21.6, M(0.5, -6, 'right', BAS, 'derriere', { eyes: 'closed' }));
key(22, M(0.5, -6, 'left', SECOND, 'stand'));
key(24, M(-0.3, 0, 'left', SECOND, 'stand'));
line(0.3, 2.4, ['swan lake, act three.', 'the palace ball.', 'a mysterious guest...']);
line(14.8, 16.4, ['i swear to love you forever!', 'i promise!', 'marry me!']);
line(17.9, 19.2, ['ha! wrong swan!', 'fooled you!', 'she is my daughter!']);
// Who says each line: up to each time, the prince (r), Odile (o), or
// Rothbart (c).
const WHO = [[5.6, 'r'], [14.6, 'o'], [17, 'r'], [19.4, 'c'], [21, 'r'], [24, 'o']];

// The ballroom: dark rose walls, gold pilasters, a marble floor, and the
// window where Odette beats her wings unseen.
function ballroom(t, u, floor) {
  fill(0, 0, w, floor, ' ', '#3a1a26', '#3a1a26');
  for (let x = 3; x < w; x += 18) fill(x, 0, 1, floor, '│', '#c8a050', '#3a1a26');
  for (let x = 0; x < w; x++) put(x, floor, '▀', mod(x, 4) < 2 ? '#e8e0d0' : '#2a2a30', '#8a8478');
  if (w >= 80) {
    const x0 = w - 22;
    fill(x0, 0, 8, 2, ' ', '#101a34', '#101a34');
    if (u > 6 && u < 10.6) pixels(x0 + 2 + Math.round(Math.sin(t * 3)), 0, Math.floor(t * 6) % 2 ? 'w..w\n.ww.' : '....\nwwww', { w: '#ffffff' });
  }
}

function frame(t, dt) {
  const u = mod(t, ROUTINE);
  const n = Math.floor(t / ROUTINE);
  const floor = h - 1;
  const ground = floor * 2 - 1;
  const at = p => Math.round(12 + (w - 24) * p.x + (p.dx || 0));
  ballroom(t, u, floor);
  let o = blinking(track(KEYS, u), t);
  const r = blinking(track(RK, u), t + 0.3);
  const c = blinking(track(CK, u), t + 0.6);
  // Fouettés: the arms whip open and shut each turn.
  if (u > 9.4 && u < 14.2) o.arms = mod(o.spin, 360) < 180 ? FIFTH : SECOND;
  if (u < 2.4 || u > 22) o = bourree(o, t);
  const dc = dancer(c, at(c), ground, ROTHBART);
  const dr = dancer(r, at(r), ground, PRINCE);
  const d = dancer(o, at(o), ground, ODILE);
  if (u > 9.4 && u < 14.4) sparkles(t, d, floor, '#e03040');
  lightning(u, 17.2);
  lightning(u, 17.8);
  const said = saying(u, n);
  let who = 'o';
  for (const k of WHO) if (u < k[0]) { who = k[1]; break; }
  if (!said) return;
  if (u < 2.4) say(said, Math.round(w / 2), 0);
  else if (who === 'r') speak(said, dr);
  else if (who === 'c') speak(said, dc);
  else speak(said, d);
}
`

// Swan Lake, act IV: back at the lake. The swans mourn; Odette weeps; the
// prince comes begging forgiveness and has it; Rothbart swoops down in
// a storm, the prince fights him off, and love breaks the spell: the sun
// comes up, and everyone is happy (this is the happy-ending version).
const SWAN4 = String.raw`
const ROUTINE = 24;
// Odette mourning, then her lament: up, and bourrées with slow wingbeats.
key(0, M(0.5, -7, 'front', BAS, 'plie', { eyes: 'closed' }));
key(2.4, M(0.5, -7, 'front', BAS, 'plie', { eyes: 'closed' }));
key(3, M(0.5, -7, 'front', SECOND, 'stand', { eyes: 'closed' }));
key(4.8, M(0.42, -7, 'left', SECOND, 'stand', { eyes: 'closed' }));
key(6.4, M(0.5, -7, 'left', BAS, 'stand', { eyes: 'closed' }));
key(7.8, M(0.5, -7, 'left', BAS, 'stand', { eyes: 'closed' }));
// Forgiven: her arabesque to him, and turns.
key(8.2, M(0.5, -7, 'right', ['down', 'out'], 'stand', { eyes: 'happy' }));
key(8.6, M(0.5, -7, 'right', ['down', 'out'], 'derriere'));
key(10, M(0.5, -7, 'right', ['down', 'out'], 'derriere'));
key(10.2, M(0.5, -9, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
key(11.6, M(0.5, -9, 'front', FIFTH, 'passe', { spinning: true, spin: 720 }));
key(11.9, M(0.5, -9, 'front', SECOND, 'plie', { spin: 720 }));
// The storm: she flutters in fear while he fights; then the spell breaks,
// and he lifts her into the sunrise, a double, and arabesque.
key(15.8, M(0.5, -9, 'front', SECOND, 'plie'));
key(16.4, M(0.5, -8, 'right', RAISED.right, 'derriere', { eyes: 'happy' }));
key(17, M(0.5, -8, 'front', FIFTH, 'stand', { air: 6, eyes: 'happy' }));
key(18.2, M(0.5, -8, 'front', FIFTH, 'stand', { air: 6, eyes: 'happy' }));
key(18.6, M(0.5, -8, 'right', RAISED.right, 'derriere', { eyes: 'happy' }));
pirouettesOn(key, 18.8, 1.4, 0.5, -8, 2);
key(20.6, M(0.5, -8, 'right', RAISED.right, 'derriere', { eyes: 'happy' }));
key(21.2, M(0.5, -8, 'right', BAS, 'derriere', { eyes: 'closed' }));
key(24, M(0.5, -8, 'right', BAS, 'derriere', { eyes: 'closed' }));
// The prince: running in, on his knees, forgiven; he fights Rothbart off
// with double tours, and lifts her.
rkey(0, M(1.4, 9, 'left', SECOND, 'stand'));
steps(rkey, 4, 1.4, 0.5, 9, 3, SECOND, 0.45);
rkey(5.8, M(0.5, 9, 'left', FIFTH, 'kneel'));
rkey(8, M(0.5, 9, 'left', FIFTH, 'kneel'));
rkey(8.6, M(0.5, 7, 'left', SECOND, 'plie'));
rkey(10, M(0.5, 7, 'left', ['out', 'high'], 'stand'));
rkey(11.8, M(0.5, 9, 'left', SECOND, 'stand'));
rkey(12.6, M(0.5, 9, 'right', ['out', 'up'], 'stand'));
tourOn(rkey, 13.4, 0.5, 9, 1);
rkey(14.4, M(0.5, 9, 'right', ['out', 'up'], 'plie'));
tourOn(rkey, 14.8, 0.5, 9, 2);
rkey(16, M(0.5, 9, 'left', ['out', 'high'], 'stand', { eyes: 'happy' }));
rkey(16.6, M(0.5, 8, 'left', SECOND, 'plie'));
rkey(17, M(0.5, 8, 'left', FIFTH, 'stand'));
rkey(18.2, M(0.5, 8, 'left', FIFTH, 'stand'));
rkey(18.6, M(0.5, 8, 'left', SECOND, 'stand'));
rkey(20.4, M(0.5, 8, 'left', SECOND, 'stand'));
rkey(20.6, M(0.5, 8, 'left', ['out', 'high'], 'stand', { eyes: 'happy' }));
rkey(21.2, M(0.5, 8, 'left', BAS, 'plie', { eyes: 'closed' }));
rkey(24, M(0.5, 8, 'left', BAS, 'plie', { eyes: 'closed' }));
line(0.3, 1.8, ['swan lake, act four.', 'the lake, before dawn.', 'betrayed...']);
line(5.8, 7.4, ['forgive me, odette!', 'she tricked me!', 'i am so sorry!']);
line(20.6, 22, ['happily ever after.', 'love wins!', 'no more swan, ever.']);
// The swans' phrase, a count each: mourning (arabesques toward Odette,
// the wings lowered and lifted), then glad (jumps).
const MOURN = [['front', BAS, 'plie'], ['front', SECOND, 'stand'], ['side', 0, 'derriere'], ['front', FIFTH, 'stand']];
const GLAD = [['front', SECOND, 'plie'], ['front', FIFTH, 'stand', 3], ['side', 0, 'derriere'], ['front', SECOND, 'stand']];

// Rothbart's swoop in the storm, then a puff as the spell breaks.
function storm(t, u, cx) {
  if (u > 12 && u < 15.8) {
    const k = (u - 12) / 3.8;
    owlAt(t, Math.round(lerp(w + 4, cx - 30, k) + Math.sin(k * 9) * 12), 2 * Math.round(Math.abs(Math.sin(k * 6)) * 2));
    lightning(u, 12.4);
    lightning(u, 13.7);
    lightning(u, 15);
  }
  if (u > 15.8 && u < 16.6) for (let i = 0; i < 6; i++) put(cx - 26 + Math.round(rand(i + Math.floor(t * 10)) * 8), Math.round(rand(i * 3) * 3), '*', '#ffd040');
}
// Dawn: the sky lightening from the top, the sun up out of the lake.
function dawn(u, floor) {
  const k = clamp((u - 16) / 4);
  if (k <= 0) return;
  for (let y = 0; y < floor; y++) {
    const c = mix('#0c1428', mix('#7aa0e0', '#f4b07a', y / floor), k);
    fill(0, y, w, 1, ' ', c, c);
  }
  pixels(w - 16, Math.round(lerp(floor * 2, 2, clamp((u - 17) / 4)) / 2) * 2, '.yyy.\nyyyyy\nyyyyy\n.yyy.', { y: '#ffe070' });
}

function frame(t, dt) {
  const u = mod(t, ROUTINE);
  const n = Math.floor(t / ROUTINE);
  const floor = h - 1;
  const ground = floor * 2 - 1;
  const at = p => Math.round(12 + (w - 24) * p.x + (p.dx || 0));
  dawn(u, floor);
  lake(t, floor, u < 16);
  // The swans at the sides, in unison: mourning, fluttering in the
  // storm, then glad; each faces Odette.
  const places = w >= 110 ? [0.06, 0.2, 0.8, 0.94] : w >= 80 ? [0.08, 0.92] : [];
  for (let i = 0; i < places.length; i++) {
    const side = places[i] < 0.5 ? 'right' : 'left';
    const st = u < 16 ? MOURN[Math.floor(u * 1.25) % 4] : GLAD[Math.floor(u * 2.5) % 4];
    let q = P(places[i], st[0] === 'side' ? side : st[0], st[1] || RAISED[side], st[2], { eyes: u < 16 ? 'closed' : 'happy', air: st[3] || 0 });
    if (u > 12 && u < 16) q = bourree(P(places[i], 'front', BEAT[Math.floor(t * 6 + i) % 4], 'stand'), t);
    dancer(blinking(q, t + i), at(q), ground, ODETTE);
  }
  let o = blinking(track(KEYS, u), t);
  if ((u > 3 && u < 6.2) || (u > 12 && u < 15.8)) {
    o = bourree(o, t);
    o.arms = BEAT[Math.floor(t * (u < 12 ? 2.5 : 6)) % 4];
  }
  const r = blinking(track(RK, u), t + 0.3);
  const dr = dancer(r, at(r), ground, PRINCE);
  const d = dancer(o, at(o), ground, ODETTE);
  storm(t, u, d.x);
  if (u > 16.4 && u < 20) sparkles(t, d, floor, '#ffe8a0');
  const said = saying(u, n);
  if (said && u < 1.8) say(said, Math.round(w / 2), 0);
  else if (said && ((u > 5.8 && u < 8) || (u > 12.6 && u < 15.6))) speak(said, dr);
  else if (said) speak(said, d);
}
`

// The Nutcracker, act I: Christmas Eve at the Stahlbaums'. Clara dances;
// Drosselmeyer gives her a nutcracker; midnight strikes, the tree grows,
// the mice come with their king; she throws her slipper; the nutcracker
// becomes a prince, and they go through the snow toward the sweets.
const NUT1 = String.raw`
const ROUTINE = 24;
const CLARA = { tutu: '#e87090', frill: '#ffd0dc', crown: '.p.p.\n.ppp.', crownColors: { p: '#ff5a8a' } };
const DROSS = { bare: true, breeches: '#2a2a3a', shoes: '#101010', crown: '.kkk.\nkkkkk', crownColors: { k: '#16161c' } };
const NPRINCE = { bare: true, breeches: '#c02828', shoes: '#101010', crown: '.y.y.\nyyyyy', crownColors: { y: '#ffd84a' } };
// The party: Clara waltzes, is given the nutcracker, and turns with it.
balances(0.4, 0.4, 4, SECOND, 0.6, { eyes: 'happy' });
key(3, P(0.4, 'right', SECOND, 'stand'));
key(3.6, P(0.4, 'right', SECOND, 'stand'));
key(4.4, P(0.4, 'right', FIFTH, 'stand', { eyes: 'happy' }));
key(4.8, P(0.4, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
key(6, P(0.4, 'front', FIFTH, 'passe', { spinning: true, spin: 720 }));
key(6.3, P(0.4, 'front', BAS, 'stand', { spin: 720 }));
// Asleep by the tree; midnight; she wakes to it growing, and bourrées
// back in wonder.
key(6.8, P(0.4, 'front', BAS, 'kneel', { eyes: 'closed' }));
key(8.2, P(0.4, 'front', BAS, 'kneel', { eyes: 'closed' }));
key(8.6, P(0.4, 'front', FIFTH, 'stand', { eyes: 'happy' }));
key(9.8, P(0.32, 'right', FIFTH, 'stand'));
// The mice: she shrinks back from them, then rallies, little jumps at
// them, and throws her slipper.
key(10.4, P(0.32, 'right', FIFTH, 'stand'));
key(11.6, P(0.28, 'right', FIFTH, 'stand'));
for (let j = 0; j < 3; j++) {
  key(11.9 + j * 0.6, P(0.3 + j * 0.03, 'right', SECOND, 'plie'));
  key(12.2 + j * 0.6, P(0.315 + j * 0.03, 'right', FIFTH, 'passe', { air: 3 }));
}
key(13.7, P(0.39, 'right', SECOND, 'plie'));
key(14.2, P(0.4, 'right', ['out', 'up'], 'stand'));
key(15.4, P(0.4, 'right', ['out', 'up'], 'stand'));
key(16.2, P(0.4, 'right', FIFTH, 'stand', { eyes: 'happy' }));
// The snow pas de deux: arabesque, a supported double, a lift, a waltz,
// and away through the snow.
key(16.6, M(0.45, -8, 'right', ['down', 'out'], 'derriere'));
key(17.4, M(0.45, -8, 'right', ['down', 'out'], 'derriere'));
pirouettesOn(key, 17.6, 1.2, 0.45, -8, 2);
key(19.1, M(0.45, -8, 'front', FIFTH, 'stand', { air: 6, eyes: 'happy' }));
key(19.9, M(0.45, -8, 'front', FIFTH, 'stand', { air: 6, eyes: 'happy' }));
key(20.3, M(0.45, -8, 'right', SECOND, 'stand'));
balances(20.5, 0.45, 2, SECOND, 0.6, { dx: -8, eyes: 'happy' });
key(21.8, M(0.45, -8, 'right', SECOND, 'stand'));
key(24, M(1.3, -8, 'right', SECOND, 'stand'));
// Drosselmeyer steps in with the gift, and out.
rkey(0, M(-0.4, -20, 'right', BAS, 'stand'));
steps(rkey, 2, -0.4, 0.4, -20, 3, BAS, 0.45);
rkey(3.6, M(0.4, -20, 'right', ['out', 'high'], 'stand'));
rkey(4.6, M(0.4, -20, 'right', ['out', 'high'], 'stand'));
rkey(5, M(0.4, -20, 'left', BAS, 'stand'));
steps(rkey, 5.1, 0.4, -0.4, -20, 3, BAS, 0.45);
// The prince, in the snow, partnering her.
ckey(16.4, M(0.45, 8, 'left', SECOND, 'stand'));
ckey(17.4, M(0.45, 8, 'left', SECOND, 'plie'));
ckey(17.6, M(0.45, 8, 'left', SECOND, 'stand'));
ckey(18.8, M(0.45, 8, 'left', SECOND, 'plie'));
ckey(19.1, M(0.45, 8, 'left', FIFTH, 'stand'));
ckey(19.9, M(0.45, 8, 'left', FIFTH, 'stand'));
ckey(20.3, M(0.45, 8, 'left', SECOND, 'stand'));
for (let i = 0; i < 2; i++) {
  ckey(20.5 + i * 0.6, M(0.45, 8, i % 2 ? 'left' : 'right', SECOND, 'plie'));
  ckey(20.8 + i * 0.6, M(0.45, 8, i % 2 ? 'left' : 'right', SECOND, 'stand'));
}
steps(ckey, 21.8, 0.45, 1.3, 8, 4, SECOND, 0.5);
line(0.3, 2, ['the nutcracker, act one.', 'christmas eve!', 'the stahlbaum party.']);
line(10.4, 11.6, ['mice!!', 'eek! the mouse king!', 'shoo! shoo!']);
line(16.6, 17.6, ['a prince!', 'my nutcracker?!', 'you are real!']);

const NUTCRACKER = 'kkk\nkkk\nsss\nrrr\nrrr\nk.k';
const TOY = { k: '#16161c', s: '#f0c8a0', r: '#c02828' };
// The parlour (darker after midnight), the grandfather clock and the tree,
// which grows at midnight; then the snow.
function parlour(t, u, floor) {
  const dark = u > 6.4 ? 0.55 : 0;
  for (let x = 0; x < w; x++) {
    const c = mix(mod(x, 6) < 3 ? '#5a2026' : '#4a1a20', '#08080e', dark);
    fill(x, 0, 1, floor, ' ', c, c);
  }
  fill(3, 1, 3, floor - 1, ' ', '#4a2a16', '#4a2a16');
  put(4, 2, u > 6.2 && u < 7.8 ? '│' : '╱', '#f0e8d0', '#c8b890');
  put(4, 5, Math.floor(t * 2) % 2 ? '╲' : '╱', '#d8b050', '#4a2a16');
  const grow = clamp((u - 8) / 2);
  const tall = Math.round(lerp(3, floor - 1, grow));
  const x0 = w - 12;
  for (let i = 0; i < tall; i++) {
    const y = floor - 1 - tall + i;
    const half = Math.min(2 + Math.round(grow * 4), Math.floor(i * 0.8) + 1);
    for (let x = -half; x <= half; x++) put(x0 + x, y, (x * 7 + i * 3) % 5 === 0 ? '•' : '▲', (x * 7 + i * 3) % 5 === 0 ? ['#ff5a5a', '#ffd84a', '#5ad0ff'][mod(x + i + Math.floor(t * 3), 3)] : '#2e7a40');
  }
  put(x0, floor - 1, '█', '#6a4428');
  put(x0, floor - 1 - tall, '★', '#ffd84a');
}
function snow(t, floor) {
  for (let y = 0; y < floor; y++) {
    const c = mix('#1a2a52', '#4a6a9a', y / floor);
    fill(0, y, w, 1, ' ', c, c);
  }
  for (let i = 0; i < Math.floor(w / 3); i++) {
    put(Math.round(mod(rand(i) * w + Math.sin(t + i) * 2, w)), Math.floor(mod(rand(i * 5) * floor + t * (1 + rand(i * 7)), floor)), i % 3 ? '·' : '*', '#f0f6ff');
  }
}
// The mice and their king, coming at the nutcracker, fleeing at the
// slipper; the king goes in a puff.
function mice(t, u, tx, floor) {
  if (u < 10.2 || u > 16.4) return;
  const k = clamp((u - 10.2) / 2);
  const flee = clamp((u - 15.4) / 1);
  for (let i = 0; i < 5; i++) {
    const x = Math.round(lerp(w + 4 + i * 6, tx + 8 + i * 5, k) + Math.sin(t * 8 + i) * 2 + flee * (w + 20));
    pixels(x, floor * 2 - 2, Math.floor(t * 8 + i) % 2 ? '.gg.\nggggp' : '.gg.\ngggg.p', { g: '#9a9aa8', p: '#e8a0b0' });
  }
  if (u < 15.4) pixels(Math.round(lerp(w + 30, tx + 18, k)), floor * 2 - 6, '..y..\n.yyy.\n.ggg.\nggggg\nggggg\ng...g', { y: '#ffd84a', g: '#7a7a88' });
  else for (let i = 0; i < 6; i++) put(tx + 18 + Math.round(rand(i + Math.floor(t * 10)) * 6) - 3, floor - 2 + Math.round(rand(i * 3) * 2) - 1, '*', '#ffd84a');
}

function frame(t, dt) {
  const u = mod(t, ROUTINE);
  const n = Math.floor(t / ROUTINE);
  const floor = h - 1;
  const ground = floor * 2 - 1;
  const at = p => Math.round(12 + (w - 24) * p.x + (p.dx || 0));
  if (u < 16.4) parlour(t, u, floor);
  else snow(t, floor);
  boards(floor, at(P(0.4, 'front', BAS, 'stand')), u < 16.4 ? '#a07848' : '#c8d8f0', u < 16.4 ? '#7a5a34' : '#a8b8d8', '#ffe8c0');
  let cl = blinking(track(KEYS, u), t);
  if ((u > 8.8 && u < 9.8) || (u > 10.4 && u < 11.6) || u > 21.8) cl = bourree(cl, t);
  const dr = blinking(track(RK, u), t + 0.4);
  const pr = blinking(track(CK, u), t + 0.7);
  const tx = at(P(0.4, 'front', BAS, 'stand')) + 13;
  dancer(dr, at(dr), ground, DROSS);
  if (u > 3.8 && u < 16.4) {
    const hop = (u > 4.8 && u < 6.2) || (u > 10.6 && u < 15.4) ? Math.floor(t * 4) % 2 * 2 : 0;
    pixels(tx - 1, ground - 5 - hop, NUTCRACKER, TOY);
  }
  if (u > 15.6 && u < 16.4) fill(0, 0, w, h, ' ', '#fff4e0', '#fff4e0');
  if (u >= 16.4) dancer(pr, at(pr), ground, NPRINCE);
  const d = dancer(cl, at(cl), ground, CLARA);
  mice(t, u, tx, floor);
  // The slipper, thrown at the mouse king.
  if (u > 14.8 && u < 15.4) {
    const k = (u - 14.8) / 0.6;
    pixels(Math.round(lerp(d.x + 4, tx + 18, k)), Math.round(lerp(d.top, ground - 8, k) - Math.sin(Math.PI * k) * 6), 'pp', { p: '#ff7aa0' });
  }
  if (u > 18 && u < 21) sparkles(t, d, floor, '#e8f4ff');
  const said = saying(u, n);
  if (said && u < 2.2) say(said, Math.round(w / 2), 0);
  else if (said) speak(said, d);
}
`

// Don Quixote, act III: Kitri and Basilio's wedding, the grand pas de
// deux, in a square in Barcelona at sunset, her fan in her raised hand.
// The entrée (she leaps in, he jumps in); the adagio (a supported double,
// his one-armed lift, and her famous balance once he lets go); his
// variation (tours, a manège of jumps, beats); hers (hops on pointe with
// the fan); the coda (his tours, her fouettés while the windmill on the
// hill spins to keep up); a last lift, the bows, and off.
const DONQ = String.raw`
const ROUTINE = 26;
const LOOK = { tutu: '#d42a2a', frill: '#ffcc40', shoes: '#f0c0c8', crown: 'rr....\nrr....', crownColors: { r: '#ff3a5a' } };
const BASILIO = { bare: true, breeches: '#1a1a22', shoes: '#16120e' };
const OLE = ['up', 'out'];
// The entrée.
key(0, P(-0.3, 'right', SECOND, 'stand'));
leaps(0.1, -0.3, 0.32, 3);
key(2.4, P(0.32, 'right', RAISED.right, 'derriere', { eyes: 'happy' }));
key(3.4, P(0.32, 'right', RAISED.right, 'derriere', { eyes: 'happy' }));
rkey(0, M(1.3, 0, 'left', FIFTH, 'stand'));
steps(rkey, 0.2, 1.3, 0.68, 0, 4, FIFTH, 0.5);
rkey(2.4, M(0.68, 0, 'left', OLE, 'stand', { eyes: 'happy' }));
rkey(3.4, M(0.68, 0, 'left', OLE, 'stand', { eyes: 'happy' }));
// The adagio: a supported double, up into his one-armed lift, down into
// arabesque; he steps away and she balances, and balances.
key(3.8, M(0.5, -8, 'front', SECOND, 'plie'));
pirouettesOn(key, 3.9, 1.3, 0.5, -8, 2);
rkey(3.8, M(0.5, 8, 'left', SECOND, 'stand'));
rkey(5.2, M(0.5, 8, 'left', SECOND, 'plie'));
key(5.6, M(0.5, -8, 'front', FIFTH, 'stand', { air: 6, eyes: 'happy', spin: 720 }));
key(6.6, M(0.5, -8, 'front', FIFTH, 'stand', { air: 6, eyes: 'happy' }));
rkey(5.6, M(0.5, 8, 'left', ['high', 'down'], 'stand'));
rkey(6.6, M(0.5, 8, 'left', ['high', 'down'], 'stand'));
key(7, M(0.5, -8, 'right', RAISED.right, 'derriere'));
key(7.4, M(0.5, -8, 'right', FIFTH, 'derriere'));
key(8.4, M(0.5, -8, 'right', FIFTH, 'derriere'));
key(8.8, M(0.5, -8, 'right', SECOND, 'derriere', { eyes: 'happy' }));
rkey(7, M(0.5, 8, 'left', SECOND, 'plie'));
steps(rkey, 7.2, 0.5, 0.66, 8, 1, SECOND, 0.4);
rkey(7.8, M(0.66, 8, 'left', OLE, 'stand', { eyes: 'happy' }));
rkey(8.8, M(0.66, 8, 'left', OLE, 'stand', { eyes: 'happy' }));
// To the side, swaying with the fan while he dances.
key(9.2, P(0.2, 'right', RAISED.right, 'stand'));
balances(9.4, 0.2, 5, RAISED.right, 0.7);
// His variation: double tours, a manège of jumps, beats, and down on one
// knee.
tourOn(rkey, 9.2, 0.66, 0, 2);
steps(rkey, 10.1, 0.66, 0.84, 0, 2, FIFTH, 0.5);
for (let i = 0; i < 2; i++) {
  rkey(11.3 + i * 0.5, M(0.84, 0, 'front', BAS, 'plie'));
  rkey(11.55 + i * 0.5, M(0.84, 0, 'front', BAS, 'stand', { air: 4 }));
}
rkey(12.3, M(0.84, 0, 'front', SECOND, 'plie'));
rkey(12.6, M(0.84, 0, 'left', OLE, 'kneel', { eyes: 'happy' }));
rkey(13.4, M(0.84, 0, 'left', OLE, 'kneel', { eyes: 'happy' }));
rkey(13.8, M(0.84, 0, 'left', SECOND, 'stand'));
// Her variation: hops on pointe in arabesque on the diagonal, the fan
// fluttering, and a flick of it.
for (let i = 0; i < 6; i++) {
  key(12.8 + i * 0.45, P(0.2 + i * 0.05, 'right', RAISED.right, 'derriere'));
  key(13.02 + i * 0.45, P(0.225 + i * 0.05, 'right', RAISED.right, 'derriere', { air: 2 }));
}
key(15.6, P(0.5, 'front', FIFTH, 'stand'));
key(16, P(0.5, 'right', RAISED.right, 'derriere', { eyes: 'happy' }));
key(16.6, P(0.5, 'right', RAISED.right, 'derriere', { eyes: 'happy' }));
// The coda: his double tours, then her fouettés, while he cheers.
tourOn(rkey, 16.6, 0.84, 0, 2);
tourOn(rkey, 17.5, 0.84, 0, 2);
rkey(18.6, M(0.84, 0, 'left', OLE, 'stand', { eyes: 'happy' }));
rkey(21.6, M(0.84, 0, 'left', OLE, 'stand', { eyes: 'happy' }));
key(18.4, P(0.5, 'front', SECOND, 'plie'));
key(18.6, P(0.5, 'front', SECOND, 'passe', { spinning: true, spin: 0 }));
key(21.6, P(0.5, 'front', SECOND, 'passe', { spinning: true, spin: 3960 }));
key(21.9, P(0.5, 'front', SECOND, 'plie', { spin: 3960 }));
// Into his arms and up, one last time; the bows, and off.
steps(rkey, 21.7, 0.84, 0.5, 8, 1, SECOND, 0.5);
rkey(22.4, M(0.5, 8, 'left', ['high', 'down'], 'stand'));
rkey(23.4, M(0.5, 8, 'left', ['high', 'down'], 'stand'));
key(22.4, M(0.5, -8, 'right', RAISED.right, 'derriere', { air: 6, eyes: 'happy' }));
key(23.4, M(0.5, -8, 'right', RAISED.right, 'derriere', { air: 6, eyes: 'happy' }));
key(23.8, M(0.5, -8, 'right', SECOND, 'derriere'));
key(24.2, M(0.5, -8, 'right', BAS, 'derriere', { eyes: 'closed' }));
key(24.8, M(0.5, -8, 'right', BAS, 'derriere', { eyes: 'closed' }));
rkey(23.8, M(0.5, 8, 'left', SECOND, 'stand'));
rkey(24.2, M(0.5, 8, 'left', BAS, 'plie', { eyes: 'closed' }));
rkey(24.8, M(0.5, 8, 'left', BAS, 'plie', { eyes: 'closed' }));
leaps(25, 0.5, 0.05, 1);
key(26, P(-0.3, 'left', SECOND, 'stand'));
steps(rkey, 25, 0.5, 1.3, 8, 2, SECOND, 0.5);
line(0.4, 1.6, ['ole!', 'make way, barcelona!', 'kitri is here!']);
line(7.6, 8.8, ['...still holding.', 'who needs a partner?', 'no hands!']);
line(22.5, 23.4, ['OLE!', 'viva barcelona!', 'viva los novios!']);
// Terracotta tiles, warm where Clawd dances; bunting along the top.
function square(floor, cx) {
  for (let x = 0; x < w; x++) {
    const pool = clamp(1 - Math.abs(x - cx) / 14);
    put(x, floor, '▀', mix(x % 4 < 2 ? '#b85a34' : '#a04a2a', '#ffd8a0', pool * 0.4), mix('#7a3a20', '#ffd8a0', pool * 0.2));
  }
  const flags = ['#e02838', '#ffcc40', '#e8e0d0'];
  for (let x = 1; x < w - (w >= 80 ? 18 : 0); x += 3) put(x, 0, '▼', flags[(x - 1) / 3 % 3]);
}
// Don Quixote's windmill on the right: a whitewashed tower widening to the
// ground, a dark cap, a door, and four lattice sails turning; faster in
// the fouettés.
let sail = 0;
function windmill(u, dt, floor) {
  sail += dt * (u > 18.6 && u < 21.6 ? 5 : 0.7);
  const x0 = w - 9;
  for (let y = 3; y < floor; y++) {
    const half = y < 5 ? 2 : 3;
    for (let x = -half; x <= half; x++) put(x0 + x, y, '█', x === half ? '#b0a080' : '#e0d4b4');
  }
  for (let x = -2; x <= 2; x++) put(x0 + x, 2, '▄', '#5a3a28');
  put(x0, floor - 1, '█', '#4a2e1c');
  put(x0, 4, '▪', '#4a2e1c');
  // Each sail a spar out from the hub, its lattice of cloth beside it; a
  // cell twice as tall as wide.
  for (let k = 0; k < 4; k++) {
    const a = sail + k * Math.PI / 2;
    for (let r = 1; r <= 7; r++) {
      const col = x0 + Math.round(Math.cos(a) * r);
      const row = 2 + Math.round(Math.sin(a) * r / 2);
      if (row >= 0 && row < floor) put(col, row, r > 2 ? '▓' : '█', r > 2 ? '#f0e4c4' : '#6a4a30');
    }
  }
  put(x0, 2, '●', '#3a2418');
}
// The fan over whichever hand is raised, opening and closing.
function fan(t, p, d) {
  const side = p.arms[1] === 'up' ? 1 : p.arms[0] === 'up' ? -1 : 0;
  if (!side || p.spinning) return;
  const open = Math.floor(t * 6) % 2 === 0;
  pixels(d.x + (side > 0 ? 2 : -6), d.top - 4, open ? 'rrrr\n.yy.' : '.rr.\n.yy.', { r: '#e02838', y: '#ffcc40' });
}

function frame(t, dt) {
  const u = mod(t, ROUTINE);
  const n = Math.floor(t / ROUTINE);
  const floor = h - 1;
  const ground = floor * 2 - 1;
  // The stage stops short of the windmill, where there is one.
  const hasMill = w >= 80;
  const R = hasMill ? w - 18 : w;
  const at = p => Math.round(12 + (R - 24) * p.x + (p.dx || 0));
  let k = blinking(track(KEYS, u), t);
  if (u > 18.6 && u < 21.6) k.arms = mod(k.spin, 360) < 180 ? FIFTH : SECOND;
  if (u > 3.4 && u < 3.8) k = bourree(k, t);
  const b = beating(blinking(track(RK, u), t + 0.4), t);
  const kcx = at(k);
  square(floor, kcx);
  if (hasMill) windmill(u, dt, floor);
  const db = dancer(b, at(b), ground, BASILIO);
  const d = dancer(k, kcx, ground, LOOK);
  fan(t, k, d);
  if ((u > 18.6 && u < 21.6) || k.air > 3.5) sparkles(t, d, floor, '#ffcc40');
  if (u > 22.4 && u < 23.4) sparkles(t, d, floor, '#ff5a6a');
  const said = saying(u, n);
  if (!said) return;
  speak(said, d);
}
`

// Giselle, act II: midnight in the forest by Giselle's grave, mist on the
// ground, the Wilis drifting in the dark. She rises out of the grave and
// wakes, whirls at Myrtha's command, hops in arabesque; Albrecht walks in
// with lilies, and they dance (she floats up in his arms, a supported
// double); the Wilis make him beat entrechats while she dances beside him
// to keep him going, until he falls and she leads them off; dawn breaks,
// one last lift, and she bourrées back to her grave and sinks into it.
const GISELLE = String.raw`
const ROUTINE = 24;
const LOOK = { tutu: '#e8eef8', frill: '#ffffff', crown: '.g.g.\nwgwgw', crownColors: { w: '#ffffff', g: '#7ab08a' } };
const ALBRECHT = { bare: true, breeches: '#2a2a40', shoes: '#16120e' };
// Up out of the ground, under the mist, and the arms opening.
key(0, M(0.12, 6, 'front', BAS, 'plie', { eyes: 'closed', air: -12 }));
key(1.4, M(0.12, 6, 'front', BAS, 'plie', { eyes: 'closed' }));
key(1.8, M(0.12, 6, 'front', SECOND, 'stand', { eyes: 'closed' }));
key(2.3, M(0.12, 6, 'front', FIFTH, 'stand'));
// Myrtha's command: whirling across in passé.
key(2.5, M(0.12, 6, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
key(4.1, M(0.28, 0, 'front', FIFTH, 'passe', { spinning: true, spin: 1800 }));
key(4.3, M(0.28, 0, 'right', SECOND, 'plie', { spin: 1800 }));
// Hops in arabesque, barely touching the ground.
for (let i = 0; i < 5; i++) {
  key(4.6 + i * 0.6, P(0.28 + i * 0.02, 'right', RAISED.right, 'derriere'));
  key(4.9 + i * 0.6, P(0.29 + i * 0.02, 'right', RAISED.right, 'derriere', { air: 2 }));
}
key(7.6, P(0.36, 'right', RAISED.right, 'derriere'));
key(8.6, P(0.36, 'right', FIFTH, 'derriere'));
// Albrecht, walking slowly in with his lilies.
rkey(0, M(1.3, 8, 'left', ['out', 'down'], 'stand'));
for (let i = 0; i < 6; i++) rkey(6 + i * 0.45, M(1.3 - 0.8 * (i + 1) / 6, 8, 'left', ['out', 'down'], i % 2 ? 'stand' : 'plie'));
// The pas de deux: she floats up in his arms, down into arabesque, and a
// supported double.
key(9.2, M(0.5, -8, 'right', SECOND, 'stand'));
key(9.6, M(0.5, -8, 'right', RAISED.right, 'derriere', { air: 6 }));
key(10.8, M(0.5, -8, 'right', RAISED.right, 'derriere', { air: 6 }));
key(11.1, M(0.5, -8, 'right', RAISED.right, 'derriere'));
pirouettesOn(key, 11.3, 1.1, 0.5, -8, 2);
rkey(9.2, M(0.5, 8, 'left', SECOND, 'plie'));
rkey(9.6, M(0.5, 8, 'left', FIFTH, 'stand'));
rkey(10.8, M(0.5, 8, 'left', FIFTH, 'stand'));
rkey(11.2, M(0.5, 8, 'left', SECOND, 'stand'));
rkey(12.4, M(0.5, 8, 'left', SECOND, 'stand'));
// Made to dance by the Wilis: entrechats, over and over; beside him she
// dances arabesques, one side and the other, to keep him going.
for (let i = 0; i < 6; i++) {
  rkey(12.6 + i * 0.5, M(0.5, 10, 'front', BAS, 'plie'));
  rkey(12.85 + i * 0.5, M(0.5, 10, 'front', BAS, 'stand', { air: 4 }));
}
phrase(key, 12.6, 0.5, 0.5, -10, [
  ['right', RAISED.right, 'derriere'], ['front', FIFTH, 'stand'], ['left', RAISED.left, 'derriere'],
  ['front', FIFTH, 'stand'], ['right', RAISED.right, 'derriere'], ['front', SECOND, 'plie'],
]);
rkey(15.6, M(0.5, 10, 'front', SECOND, 'plie', { eyes: 'closed' }));
rkey(16, M(0.5, 10, 'left', BAS, 'kneel', { eyes: 'closed' }));
rkey(17.6, M(0.5, 10, 'left', BAS, 'kneel', { eyes: 'closed' }));
leaps(15.8, 0.4, 0.15, 2);
// Dawn: back to him, one last lift, and away to the grave, waving.
key(17.4, P(0.15, 'right', FIFTH, 'stand', { eyes: 'happy' }));
key(18.4, M(0.5, -8, 'right', SECOND, 'stand', { eyes: 'happy' }));
key(18.8, M(0.5, -8, 'front', FIFTH, 'stand', { air: 6, eyes: 'happy' }));
key(19.4, M(0.5, -8, 'front', FIFTH, 'stand', { air: 6, eyes: 'happy' }));
key(19.8, M(0.5, -8, 'left', RAISED.left, 'stand', { eyes: 'happy' }));
key(21.6, M(0.12, 6, 'left', RAISED.left, 'stand', { eyes: 'happy' }));
key(22.2, M(0.12, 6, 'front', BAS, 'plie', { eyes: 'closed' }));
key(23.4, M(0.12, 6, 'front', BAS, 'plie', { eyes: 'closed', air: -12 }));
rkey(18, M(0.5, 8, 'left', SECOND, 'stand', { eyes: 'happy' }));
rkey(18.6, M(0.5, 8, 'left', SECOND, 'plie'));
rkey(18.8, M(0.5, 8, 'left', FIFTH, 'stand'));
rkey(19.4, M(0.5, 8, 'left', FIFTH, 'stand'));
rkey(19.8, M(0.5, 8, 'left', ['out', 'high'], 'stand'));
rkey(21.6, M(0.5, 8, 'left', ['out', 'high'], 'stand'));
rkey(22.2, M(0.5, 8, 'left', ['out', 'high'], 'kneel'));
line(0.3, 2.3, ['giselle, act two.', 'midnight. the wilis rise.', 'oh! i am a ghost now.']);
line(6.6, 8.2, ['giselle...?', 'lilies, for you...', 'is that you?']);
line(20.2, 21.8, ['see you tomorrow night!', 'same time next week?', 'bye, albrecht!']);
const HIS = [[6.4, 8.6]];

// The grave: a stone cross on the left.
function grave(gx, floor) {
  pixels(gx - 1, floor * 2 - 6, '.s.\nsss\n.s.\n.s.\n.s.\n.s.', { s: '#8a9aa0' });
}
// Mist rolling over the grass; thinner as dawn comes.
function mist(t, floor, fade) {
  for (let x = 0; x < w; x++) {
    const m = (0.5 + 0.25 * Math.sin(x * 0.35 + t * 0.7) + 0.25 * Math.sin(x * 0.11 - t * 0.4)) * fade;
    put(x, floor, '▀', mix('#1a2a24', '#9ab0c4', m * 0.7), mix('#101a16', '#7a90a4', m * 0.6));
  }
}
// The Wilis: veiled shapes drifting at the back, gone by dawn.
function wilis(t, d, fade) {
  if (fade <= 0) return;
  for (let i = 0; i < 5; i++) {
    const col = Math.round(mod(i * w / 5 + t * 3 * (i % 2 ? 1 : -1), w));
    const py = 2 * Math.round(1 + Math.sin(t * 0.8 + i * 2));
    if (Math.abs(col - d.x) < 14) continue;
    pixels(col - 1, py, '.w.\nwww', { w: mix('#2a3a44', mix('#8a9ab0', '#e8f0ff', 0.5 + 0.5 * Math.sin(t * 2 + i)), fade) });
  }
}
// The night sky paling to dawn, the moon fading.
function sky(u, floor) {
  const k = clamp((u - 17) / 2.5);
  if (k < 1) pixels(w - 12, 2, '..mm\n.m..\n.m..\n..mm', { m: mix('#f0ecc8', '#c8b0c0', k) });
  if (k <= 0) return;
  for (let y = 0; y < floor; y++) {
    const c = mix('#0c1418', mix('#8aa0c8', '#f4b0a0', y / floor), k * 0.8);
    fill(0, y, w, 1, ' ', c, c);
  }
}

function frame(t, dt) {
  const u = mod(t, ROUTINE);
  const n = Math.floor(t / ROUTINE);
  const floor = h - 1;
  const ground = floor * 2 - 1;
  const at = p => Math.round(12 + (w - 24) * p.x + (p.dx || 0));
  const gx = Math.round(12 + (w - 24) * 0.12) - 6;
  const dawn = clamp((u - 17) / 2.5);
  sky(u, floor);
  let g = blinking(track(KEYS, u), t);
  // Bourrées, to him and back to the grave.
  if ((u > 8.6 && u < 9.2) || (u > 17.6 && u < 18.4) || (u > 19.8 && u < 21.6)) g = bourree(g, t);
  const a = beating(blinking(track(RK, u), t + 0.4), t);
  const gcx = at(g);
  const acx = at(a);
  wilis(t, { x: (gcx + acx) / 2 }, (u > 4 ? 1 : u / 4) * (1 - dawn));
  grave(gx, floor);
  mist(t, floor, 1 - dawn * 0.6);
  const da = dancer(a, acx, ground, ALBRECHT);
  // His lilies: in his hand, then dropped where the Wilis catch him.
  if (u > 5 && u < 12.6) put(da.x - 7, da.row + 1, '*', '#ffffff');
  if (u >= 12.6) for (const i of [17, 18]) put(Math.round(12 + (w - 24) * 0.5) + i, floor - 1, '*', '#ffffff');
  const d = dancer(g, gcx, ground, LOOK);
  // Rising and sinking, she is under the ground: the grass drawn over her.
  if (u < 1.4 || u > 22.2) mist(t, floor, 1 - dawn * 0.6);
  if (u > 2.6 && u < 4.1) sparkles(t, d, floor, '#c0d0ff');
  const said = saying(u, n);
  if (!said) return;
  if (u < 2.3) say(said, Math.round(w / 2), 0);
  else if (HIS.some(r => u >= r[0] && u < r[1])) speak(said, da);
  else speak(said, d);
}
`

// La Fille mal gardée: a farmyard at dawn. First the chicken dance: the
// Cockerel struts in and crows, the Hens follow him flapping, peck in
// unison, hop in canon while he turns in the air, and he leads them off.
// Then Lise leaps in, turns, hops in arabesque with her pink ribbon and
// ties it for Colas; they dance with it between them (she turns in it,
// jumps on it like reins, they skip); she whirls round the yard in piqué
// turns, until Widow Simone's clogs are heard and Colas runs for it.
const FILLE = String.raw`
const ROUTINE = 27;
const LISE = { tutu: '#f4b8c8', frill: '#ffffff', crown: '.p.p.\nppppp', crownColors: { p: '#ff7aa0' } };
const COLAS = { bare: true, breeches: '#6a5a3a', shoes: '#3a2a1a' };
// The Hens in white with red combs and orange feet; the Cockerel in red.
const HEN = { tutu: '#f4f0e4', frill: '#d8b888', shoes: '#f0a020', crown: '.rr.\n.rr.', crownColors: { r: '#e02020' } };
const COCK = { bare: true, breeches: '#c03018', shoes: '#f0a020', crown: '.r.r.\nrrrrr', crownColors: { r: '#e02020' } };
// The Hens, a track each, a beat apart in the canon, the one at the front
// of the line first (so none catches up with the next); placed in a line
// at draw time.
const HK = [[], [], [], []];
for (let i = 0; i < 4; i++) {
  const add = (t, p) => HK[i].push([t, p]);
  const c = (3 - i) * 0.15;
  add(0, M(-0.4, 0, 'right', SECOND, 'stand'));
  add(0.6 + c, M(-0.4, 0, 'right', SECOND, 'stand'));
  add(2.6, M(0.38, 0, 'right', SECOND, 'stand'));
  // Pecking in canon: a pas de chat, and a peck (an arabesque, tipped
  // forward, the wings back), twice.
  phrase(add, 2.7 + c, 0.33, 0.38, 0, [
    ['front', SECOND, 'plie'], ['front', BAS, 'passe', 0, { air: 3 }], ['front', SECOND, 'plie'], ['right', SECOND, 'derriere'],
  ]);
  for (let j = 0; j < 2; j++) {
    add(4.3 + j * 0.6 + c, M(0.38, 0, 'front', SECOND, 'plie'));
    add(4.6 + j * 0.6 + c, M(0.38, 0, 'front', FIFTH, 'stand', { air: 4 }));
  }
  add(5.6 + c, M(0.38, 0, 'front', SECOND, 'plie'));
  add(6 + c, M(0.38, 0, 'right', SECOND, 'stand'));
  add(7.8 + c, M(1.5, 0, 'right', SECOND, 'stand'));
}
// The Cockerel: a strut in, a crow (a jump), looking about while the Hens
// peck, tours, another crow, and a strut off.
ckey(0, M(1.4, 0, 'left', SECOND, 'stand'));
for (let j = 0; j < 4; j++) ckey(0.4 + j * 0.4, M(1.4 - (j + 1) * 0.13, 0, 'left', j % 2 ? SECOND : BAS, j % 2 ? 'stand' : 'plie'));
ckey(1.8, M(0.88, 0, 'front', SECOND, 'plie'));
ckey(2.1, M(0.88, 0, 'front', FIFTH, 'stand', { air: 4 }));
ckey(2.5, M(0.88, 0, 'front', SECOND, 'plie'));
for (let j = 0; j < 4; j++) ckey(2.8 + j * 0.35, M(0.88, 0, j % 2 ? 'right' : 'left', j % 2 ? FIFTH : SECOND, j % 2 ? 'stand' : 'plie'));
tourOn(ckey, 4.4, 0.88, 0, 2);
ckey(5.4, M(0.88, 0, 'front', FIFTH, 'stand', { eyes: 'closed', spin: 720 }));
ckey(5.8, M(0.88, 0, 'front', FIFTH, 'stand', { eyes: 'closed' }));
steps(ckey, 6, 0.88, 1.5, 0, 4, SECOND, 0.3);
// Lise: in on grand jetés, a double pirouette, hops in arabesque.
key(0, P(-0.4, 'right', SECOND, 'stand'));
key(7, P(-0.4, 'right', SECOND, 'stand'));
leaps(7, -0.4, 0.35, 3);
pirouettes(9.4, 1.2, 0.35, 2);
for (let j = 0; j < 3; j++) {
  key(10.8 + j * 0.5, P(0.35 + j * 0.03, 'right', RAISED.right, 'derriere'));
  key(11.05 + j * 0.5, P(0.365 + j * 0.03, 'right', RAISED.right, 'derriere', { air: 3 }));
}
// Colas runs in, and takes the ribbon.
rkey(0, M(1.4, 13, 'left', SECOND, 'stand'));
steps(rkey, 10.6, 1.4, 0.5, 13, 3, SECOND, 0.5);
rkey(12.4, M(0.5, 13, 'left', ['out', 'down'], 'stand'));
rkey(14, M(0.5, 13, 'left', ['out', 'high'], 'plie'));
// The ribbon: she turns in it; holding it like reins, she hops in
// arabesque and drives him back across the yard; they skip, hand in hand.
const REINS = ['down', 'out'];
key(12.4, M(0.5, -13, 'right', REINS, 'stand'));
key(12.6, M(0.5, -13, 'front', SECOND, 'plie'));
key(12.8, M(0.5, -13, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
key(14, M(0.5, -13, 'front', FIFTH, 'passe', { spinning: true, spin: 1080 }));
key(14.2, M(0.5, -13, 'right', REINS, 'plie', { spin: 1080 }));
for (let j = 0; j < 3; j++) {
  key(14.6 + j * 0.5, M(0.5 + j * 0.05, -13, 'right', REINS, 'derriere'));
  key(14.85 + j * 0.5, M(0.525 + j * 0.05, -13, 'right', REINS, 'derriere', { air: 3 }));
  rkey(14.6 + j * 0.5, M(0.5 + j * 0.05, 13, 'left', ['out', 'high'], 'plie'));
  rkey(14.85 + j * 0.5, M(0.525 + j * 0.05, 13, 'left', ['out', 'high'], 'stand'));
}
for (let i = 0; i < 6; i++) {
  const x = 0.62 - 0.17 * i / 5;
  const more = i % 2 ? { eyes: 'happy', air: 2 } : { eyes: 'happy' };
  key(16.2 + i * 0.4, M(x, -13, 'front', REINS, i % 2 ? 'stand' : 'plie', more));
  rkey(16.2 + i * 0.4, M(x, 13, 'front', ['out', 'down'], i % 2 ? 'stand' : 'plie', more));
}
leaps(19, 0.4, 0.15, 2);
// A manège of piqué turns back across the yard, entrechats, and she hears
// her mother.
key(20.6, P(0.15, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
key(22.2, P(0.4, 'front', FIFTH, 'passe', { spinning: true, spin: 1440 }));
key(22.4, P(0.4, 'front', SECOND, 'plie', { spin: 1440 }));
entrechats(22.6, 0.4, 2);
key(24, P(0.4, 'left', BAS, 'stand', { eyes: 'closed' }));
balances(24.2, 0.4, 2, RAISED.right, 0.6);
leaps(25.6, 0.4, -0.4, 2);
// Colas: double tours, and off at the sound of clogs.
steps(rkey, 18.7, 0.45, 0.6, 13, 2, SECOND, 0.4);
tourOn(rkey, 19.6, 0.6, 13, 2);
rkey(20.6, M(0.6, 13, 'left', FIFTH, 'stand', { air: 4 }));
rkey(21, M(0.6, 13, 'left', SECOND, 'plie'));
tourOn(rkey, 21.2, 0.6, 13, 2);
rkey(22.4, M(0.6, 13, 'left', SECOND, 'stand', { eyes: 'happy' }));
rkey(23, M(0.6, 13, 'left', SECOND, 'stand', { eyes: 'closed' }));
steps(rkey, 23.4, 0.6, 1.4, 13, 4, SECOND, 0.3);
line(1.8, 2.6, ['cock-a-doodle-doo!', 'cock-a-doodle-DOO!', 'doodle-doo!']);
line(23, 24.4, ['LISE! the butter!!', 'clack clack clack!', 'mother is coming!']);
line(25.7, 26.8, ['tee hee.', 'she never knows.', 'la la la.']);
// Who says each line, if not Lise: the Cockerel, the Widow (offstage).
const BY = [[0.3, 2.6, 'cock'], [23, 24.4, 'widow']];

// The farmhouse on the left, a fence along the back.
function farm(floor) {
  for (let x = 0; x < w; x++) put(x, floor, '▀', x % 5 === 0 ? '#c8a050' : '#b08a40', '#7a5a28');
  for (let x = 13; x < w; x++) put(x, floor - 2, x % 5 === 0 ? '┼' : '─', '#b89060');
  if (w < 60) return;
  fill(2, 2, 10, floor - 2, ' ', '#8a2a20', '#8a2a20');
  fill(1, 1, 12, 1, ' ', '#5a1a14', '#5a1a14');
  fill(6, floor - 3, 2, 3, ' ', '#4a1810', '#4a1810');
}
// The farm's own hens, pecking about on the right once the dance is over.
function hens(t, floor) {
  for (let i = 0; i < 3; i++) {
    const x = Math.round(w * 0.62 + i * 9 + Math.sin(t * 0.5 + i * 2) * 4);
    const down = Math.floor(t * 2 + i * 0.7) % 2;
    pixels(x, floor * 2 - 4, down ? '....\n.r..\nwwwo\nwww.' : '.r..\nwwwo\nwww.\n.o..', { w: '#f4f0e4', r: '#e02020', o: '#f0a020' });
  }
}
// The ribbon from Lise's hand to Colas's, in whole cells, sagging.
function ribbon(l, r) {
  const a = l.x + 7;
  const b = r.x - 8;
  if (b <= a) return;
  for (let x = a; x <= b; x++) {
    const sag = Math.round(Math.sin(Math.PI * (x - a) / Math.max(1, b - a))) * 2;
    pixel(x, l.top + 2 + sag, '#ff7aa0');
    pixel(x, l.top + 3 + sag, '#ff7aa0');
  }
}
// Wings flapping: the arms down and out, quickly.
function flapping(p, t) {
  p.arms = Math.floor(t * 6) % 2 ? SECOND : BAS;
  return p;
}

function frame(t, dt) {
  const u = mod(t, ROUTINE);
  const n = Math.floor(t / ROUTINE);
  const floor = h - 1;
  const ground = floor * 2 - 1;
  const at = p => Math.round(12 + (w - 24) * p.x + (p.dx || 0));
  farm(floor);
  if (u > 7.6) hens(t, floor);
  // The chicken dance: as many Hens as the strip has room for, 20 columns
  // apart so their tutus don't run together.
  const count = w >= 130 ? 4 : w >= 100 ? 3 : w >= 76 ? 2 : 0;
  for (let i = 0; i < count && u < 8.4; i++) {
    let q = blinking(track(HK[i], u), t + i);
    if (u < 2.6 || u > 6) q = flapping(bourree(q, t + i * 0.1), t + i * 0.15);
      dancer(q, at(q) + Math.round((i - (count - 1) / 2) * 20), ground, HEN);
  }
  let k = blinking(track(CK, u), t + 0.7);
  if (u < 1.6 || u > 6) k = flapping(k, t);
  const dk = u < 7.4 ? dancer(k, at(k), ground, COCK) : undefined;
  let l = beating(blinking(track(KEYS, u), t), t);
  if (u > 12.05 && u < 12.4) l = bourree(l, t);
  const c = blinking(track(RK, u), t + 0.3);
  const dc = dancer(c, at(c), ground, COLAS);
  const d = dancer(l, at(l), ground, LISE);
  if (u > 12.4 && u < 18.8 && !l.spinning) ribbon(d, dc);
  if ((u > 12.8 && u < 14) || (u > 20.6 && u < 22.2)) sparkles(t, d, floor, '#ffc8e0');
  // Widow Simone's clogs, heard from the farmhouse.
  if (u > 22.8 && u < 24.6) put(2 + Math.floor(t * 8) % 3, floor - 1, Math.floor(t * 8) % 2 ? '!' : '*', '#ffe070');
  const said = saying(u, n);
  if (!said) return;
  const by = BY.find(b => u >= b[0] && u < b[1]);
  const who = by ? by[2] : 'lise';
  if (who === 'cock' && dk) speak(said, dk);
  else if (who === 'widow') say(said, 16, 0);
  else speak(said, d);
}
`

// Manon (Kenneth MacMillan), act I: the inn yard at Amiens. The coach
// brings Manon; Des Grieux, a student, looks up from his book, dances for
// her and kneels with his heart; their first pas de deux, lifts and all;
// he tries to write to his father and she won't let him; and the coach
// comes back to take them both to Paris.
const MANON = String.raw`
const ROUTINE = 23;
const LOOK = { tutu: '#c8d8f0', frill: '#f4f0ff', shoes: '#f4e0e8' };
const DG = { bare: true, breeches: '#6a5a4a', shoes: '#16120e' };
// Off the coach, an arabesque for the yard.
key(0, M(0.78, 0, 'left', BAS, 'stand'));
key(2.2, M(0.78, 0, 'left', BAS, 'stand'));
key(2.8, M(0.64, 0, 'left', SECOND, 'stand'));
key(3.1, M(0.64, 0, 'left', RAISED.left, 'derriere', { eyes: 'happy' }));
key(3.8, M(0.64, 0, 'left', RAISED.left, 'derriere', { eyes: 'happy' }));
// While he dances for her, she sways, coy, and answers in arabesque.
balances(4, 0.64, 5, ['down', 'out'], 0.75, { eyes: 'happy' });
key(7.8, M(0.64, 0, 'left', RAISED.left, 'derriere', { eyes: 'happy' }));
key(8.2, M(0.64, 0, 'left', RAISED.left, 'derriere'));
// The meeting pas de deux: she turns into his arms, is swept up in
// arabesque, and they waltz.
key(8.4, M(0.6, 0, 'front', SECOND, 'plie'));
key(8.6, M(0.6, 0, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
key(9.4, M(0.5, 8, 'front', FIFTH, 'passe', { spinning: true, spin: 720 }));
key(9.6, M(0.5, 8, 'left', ['out', 'down'], 'stand', { spin: 720 }));
key(10, M(0.5, 8, 'left', RAISED.left, 'derriere', { air: 6 }));
key(11.2, M(0.5, 8, 'left', RAISED.left, 'derriere', { air: 6 }));
key(11.6, M(0.5, 8, 'left', SECOND, 'stand'));
balances(11.9, 0.5, 2, SECOND, 0.7, { dx: 8, eyes: 'happy' });
// The letter: while he writes, she teases, little jumps and an
// arabesque, and creeps up on him.
key(13.4, M(0.62, 0, 'left', SECOND, 'stand'));
for (let i = 0; i < 2; i++) {
  key(13.7 + i * 0.5, M(0.62, 0, 'front', SECOND, 'plie'));
  key(13.95 + i * 0.5, M(0.62, 0, 'front', FIFTH, 'passe', { air: 3 }));
}
key(14.7, M(0.62, 0, 'left', RAISED.left, 'derriere'));
key(15, M(0.56, 4, 'left', FIFTH, 'stand', { eyes: 'happy' }));
key(15.4, M(0.5, 4, 'left', FIFTH, 'stand', { eyes: 'happy' }));
// Dizzy in love: pirouettes, a lift, and off to the coach.
pirouettesOn(key, 16.6, 1.6, 0.5, 8, 3);
key(18.4, M(0.5, 8, 'left', FIFTH, 'stand', { air: 6, eyes: 'happy' }));
key(19.2, M(0.5, 8, 'left', FIFTH, 'stand', { air: 6, eyes: 'happy' }));
key(19.6, M(0.5, 8, 'right', SECOND, 'stand'));
key(20.8, M(0.8, 0, 'right', SECOND, 'stand'));
// Des Grieux: reading; he looks up, and his solo: a double tour, a
// reach, a double pirouette, and down on one knee, his heart in his hand.
rkey(0, M(0.2, 0, 'right', BAS, 'kneel', { eyes: 'closed' }));
rkey(3.4, M(0.2, 0, 'right', BAS, 'kneel', { eyes: 'happy' }));
rkey(4, M(0.2, 0, 'right', SECOND, 'stand'));
tourOn(rkey, 4.4, 0.24, 0, 2);
rkey(5.4, M(0.28, 0, 'right', ['out', 'high'], 'plie'));
rkey(5.8, M(0.3, 0, 'right', ['out', 'high'], 'stand'));
pirouettesOn(rkey, 6.1, 1.2, 0.32, 0, 2);
rkey(7.6, M(0.36, 0, 'right', ['down', 'out'], 'kneel'));
rkey(8.4, M(0.36, 0, 'right', ['down', 'out'], 'kneel'));
rkey(8.8, M(0.5, -8, 'right', ['down', 'out'], 'stand'));
rkey(9.8, M(0.5, -8, 'right', FIFTH, 'plie'));
rkey(11.4, M(0.5, -8, 'right', FIFTH, 'plie'));
rkey(11.8, M(0.5, -8, 'right', SECOND, 'stand'));
for (let i = 0; i < 2; i++) {
  rkey(11.9 + i * 0.7, M(0.5, -8, i % 2 ? 'left' : 'right', SECOND, 'plie'));
  rkey(12.25 + i * 0.7, M(0.5, -8, i % 2 ? 'left' : 'right', SECOND, 'stand'));
}
// Writing to his father, kneeling; Manon won't have it.
rkey(13.6, M(0.3, 0, 'right', BAS, 'kneel'));
rkey(15.2, M(0.3, 0, 'right', BAS, 'kneel'));
rkey(15.5, M(0.3, 0, 'right', SECOND, 'stand', { eyes: 'happy' }));
tourOn(rkey, 15.8, 0.3, 0, 2);
rkey(16.8, M(0.4, -8, 'right', ['down', 'out'], 'stand'));
steps(rkey, 17.2, 0.4, 0.5, -8, 2, ['down', 'out'], 0.4);
rkey(18.4, M(0.5, -8, 'right', FIFTH, 'plie'));
rkey(19.2, M(0.5, -8, 'right', FIFTH, 'plie'));
rkey(19.6, M(0.5, -8, 'right', SECOND, 'stand'));
steps(rkey, 19.9, 0.5, 0.8, -6, 3, SECOND, 0.3);
line(0.2, 2.2, ['manon, act one.', 'amiens. the inn yard.', 'the coach from arras!']);
line(13.9, 15.2, ['dear father...', 'writing home...', 'how do you spell...']);
line(21.4, 22.8, ['off to paris!', 'happily ever... for now.', 'giddy-up!']);

// The inn yard: cobbles, the inn's sign hanging on the left.
function yard(floor, cx) {
  for (let x = 0; x < w; x++) {
    const pool = clamp(1 - Math.abs(x - cx) / 16);
    put(x, floor, '▀', mix((x + Math.floor(x / 3)) % 2 ? '#6a6460' : '#5a5450', '#ffe0b0', pool * 0.3), '#3a3430');
  }
  if (w < 60) return;
  put(4, 0, '┃', '#6a4428');
  text(1, 1, '[ inn ]', '#d8b060');
}
// The coach, at stage fraction x: a box with a window, two wheels and a
// horse leading; it hides whoever stands where it is.
function coach(t, x, floor, faces) {
  const cx = Math.round(12 + (w - 24) * x);
  fill(cx - 7, floor - 4, 14, 3, ' ', '#3a2418', '#3a2418');
  fill(cx - 3, floor - 3, 6, 1, ' ', '#e8c870', '#e8c870');
  fill(cx - 8, floor - 5, 16, 1, ' ', '#1a1210', '#1a1210');
  const spin = Math.floor(t * 8) % 2;
  put(cx - 5, floor - 1, spin ? '●' : '◉', '#1a1210');
  put(cx + 4, floor - 1, spin ? '◉' : '●', '#1a1210');
  pixels(cx + faces * 10 - 2, floor * 2 - 8, faces < 0 ? 'hh...\nhhhhh\n.hhhh\n.h..h' : '...hh\nhhhhh\nhhhh.\nh..h.', { h: '#8a5a30' });
}
function coachAt(u) {
  if (u < 2) return [lerp(1.4, 0.78, ease(u / 2)), -1];
  if (u < 2.8) return [0.78, -1];
  if (u < 4.4) return [lerp(0.78, 1.5, ease((u - 2.8) / 1.6)), 1];
  if (u < 19.2) return undefined;
  if (u < 20.8) return [lerp(1.5, 0.8, ease((u - 19.2) / 1.6)), -1];
  if (u < 21.2) return [0.8, 1];
  return [lerp(0.8, 1.5, ease((u - 21.2) / 1.8)), 1];
}

function frame(t, dt) {
  const u = mod(t, ROUTINE);
  const n = Math.floor(t / ROUTINE);
  const floor = h - 1;
  const ground = floor * 2 - 1;
  const at = p => Math.round(12 + (w - 24) * p.x + (p.dx || 0));
  let m = blinking(track(KEYS, u), t);
  if ((u > 2.2 && u < 2.8) || (u > 15 && u < 15.4) || (u > 19.6 && u < 20.8)) m = bourree(m, t);
  const r = blinking(track(RK, u), t + 0.3);
  yard(floor, at(m));
  const isAboard = u < 2.2 || u > 21;
  const dr = isAboard && u > 21 ? { x: at(r), row: 0 } : dancer(r, at(r), ground, DG);
  const d = isAboard ? { x: Math.round(w / 2), row: 0 } : dancer(m, at(m), ground, LOOK);
  // His book while he reads, his heart for her, then quill and paper.
  if (u < 3.6) put(dr.x + 6, floor - 2, '▬', '#c8b890');
  if (u > 7.6 && u < 8.4) put(dr.x + 7, Math.max(0, dr.row), '♥', '#ff4a6a');
  if (u > 13.8 && u < 15.2) {
    put(dr.x + 6, floor - 2, '/', '#f0f0f0');
    put(dr.x + 7, floor - 1, '▬', '#f4f0e0');
  }
  const c = coachAt(u);
  if (c) coach(t, c[0], floor, c[1]);
  if (u > 9.8 && u < 11.4) sparkles(t, d, floor, '#ffe0f0');
  const said = saying(u, n);
  if (!said) return;
  if (u < 2.2 || u > 21.2) say(said, Math.round(w / 2), 0);
  // The letter, said over his shoulder, clear of her.
  else if (u > 13.9 && u < 15.2) say(said, dr.x + 4, 0);
  else speak(said, d);
}
`

export type Piece = { name: string; concept: string; routine: number; scene: Record<string, unknown> }

// The scene code without its comment lines: they stay here for reading but
// would count toward toons' 20,000 characters.
export const bare = (code: string) => code.replace(/^[ \t]*\/\/.*\n/gm, '')

const piece = (name: string, concept: string, routine: number, background: Record<string, unknown>, particles: unknown[], code: string): Piece => ({
  name,
  concept,
  routine,
  scene: { concept, background, actors: [], particles, code: bare(DANCER + COMMON + code) },
})

const NOTES = { glyphs: '♪♫♪·', count: 6, x: 'rand(k)*w', y: 'mod(rand(k+3)*h - t*(0.5+rand(k+5)*0.5), h)', color: '#be96d2' }

// Backdrops: toons' particle swarms, drawn as text behind the sets and the
// dancers, so they show in any terminal (toons' own backdrop effects are
// kept faint by its renderer). Each is a list of swarms; a swarm's
// expressions read the piece's clock t, so `during` keeps one off the strip
// outside its moment in the routine.
const during = (routine: number, a: number, b: number) => ` - 99*(1-between(mod(t,${routine}),${a},${b}))`
// Stars twinkling in the top rows of a night sky.
const stars = (color: string, rows = 4, hide = '') => ({ glyphs: '··+', count: 18, x: 'floor(rand(k)*w)', y: `floor(rand(k+3)*${rows}) - 99*step(0.85, tri(t*0.3+rand(k+9)))${hide}`, color })
// Rain driving down on a slant, for a storm.
const rain = (routine: number, a: number, b: number) => ({ glyphs: '/', count: 60, x: 'mod(rand(k)*(w+12) - t*10, w+12) - 6', y: `mod(rand(k+5)*(h+2) + t*(14+rand(k+2)*6), h+2) - 1${during(routine, a, b)}`, color: '#7f8fb8' })
// Fireflies (or will-o'-the-wisps) drifting and blinking.
const fireflies = (color: string, hide = '') => ({ glyphs: '*', count: 12, x: 'mod(rand(k)*w + sin(t*0.6+k*2)*4, w)', y: `1 + rand(k+3)*(h-4) + sin(t*0.9+k)*0.8 - 99*step(0.6, tri(t*0.35+rand(k+9)))${hide}`, color })
// A burst of fireworks every 1.4 seconds somewhere along the sky; `phase`
// staggers a second colour.
const fireworks = (routine: number, a: number, b: number, color: string, phase: number) => {
  const c = `floor((t+${phase})/1.4)`
  const r = `fract((t+${phase})/1.4)`
  return { glyphs: '*·', count: 14, x: `10 + rand(${c})*(w-20) + cos(k*6.283/n)*${r}*11`, y: `2 + rand(${c}+5)*1.5 + sin(k*6.283/n)*${r}*3 - 99*step(0.85, ${r})${during(routine, a, b)}`, color }
}
// Confetti falling from the top over a bow.
const confetti = (routine: number, a: number, b: number, color: string, seed: number) => ({ glyphs: '*·,', count: 16, x: `rand(k+${seed})*w + sin(t*3+k)`, y: `(mod(t,${routine})-${a})*(2+rand(k+${seed}+4)*2) - 1 - rand(k+${seed}+1)*4${during(routine, a, b)}`, color })
// Embers rising on the warm air.
const EMBERS = { glyphs: '·', count: 10, x: 'rand(k)*w + sin(t*1.3+k)*1.5', y: 'h - 1 - mod(rand(k+3)*h + t*(1+rand(k+4)), h)', color: '#ff9a40' }
// Birds crossing the morning sky.
const BIRDS = { glyphs: 'v', count: 4, x: 'mod(rand(k)*w + t*(5+rand(k+1)*3), w+10) - 5', y: '1 + rand(k+2)*2', color: '#c8ccd8' }

// The pieces, in the order they play.
export const PIECES: Piece[] = [
  piece('gala', 'Clawd in a pink tutu dances a gala on a little stage', 20, { effect: 'aurora', palette: ['#2a1030', '#4a1a40', '#7a2a50'], speed: 0.4, intensity: 0 }, [NOTES, confetti(20, 16.6, 19.4, '#ffd890', 0), confetti(20, 16.6, 19.4, '#ff9ac0', 40)], GALA),
  // Swan Lake's four acts, in order.
  piece('swan lake i', 'Prince Siegfried\'s birthday in the palace garden at dusk', 22, { effect: 'aurora', palette: ['#2a1a30', '#3a2040', '#4a2a50'], speed: 0.2, intensity: 0 }, [], DUETS + SWAN_COMMON + SWAN1),
  piece('swan lake ii', 'Clawd as the swan queen by the lake at midnight', 22, { effect: 'starfield', palette: ['#203050', '#405a90', '#c0d0ff'], speed: 0.3, intensity: 0 }, [stars('#c0d0ff')], DUETS + SWAN_COMMON + SWANS),
  piece('swan lake iii', 'Odile, the black swan, at the palace ball', 24, { effect: 'pulse', palette: ['#2a1018', '#3a1a26', '#4a2030'], speed: 0.2, intensity: 0 }, [], DUETS + SWAN_COMMON + SWAN3),
  piece('swan lake iv', 'The lake before dawn: forgiveness, a storm, the spell broken', 24, { effect: 'starfield', palette: ['#203050', '#405a90', '#c0d0ff'], speed: 0.3, intensity: 0 }, [stars('#c0d0ff', 4, during(24, 0, 11.8)), rain(24, 11.8, 16)], DUETS + SWAN_COMMON + SWAN4),
  // The Nutcracker's two acts, in order.
  piece('nutcracker i', 'Christmas Eve: the nutcracker, the mice, and the land of snow', 24, { effect: 'pulse', palette: ['#1a0e12', '#22121a', '#2a1620'], speed: 0.2, intensity: 0 }, [], DUETS + NUT1),
  piece('nutcracker ii', 'Clawd as the Sugar Plum Fairy in the Kingdom of Sweets', 20, { effect: 'pulse', palette: ['#20142a', '#2e1a3a', '#3a2048'], speed: 0.3, intensity: 0 }, [{ glyphs: '*·•', count: 18, x: 'mod(rand(k)*w + sin(t*0.8+k)*2, w)', y: 'mod(rand(k+3)*h + t*(0.6+rand(k+5)*0.6), h)', color: '#e8f0ff' }], SUGAR),
  piece('firebird', 'Clawd as the Firebird in the enchanted garden', 22, { effect: 'fire', palette: ['#1a0a0c', '#3a1210', '#5a1c10'], speed: 0.4, intensity: 0 }, [EMBERS], FIRE),
  // Mayerling's three acts, in order, so they play one after another.
  piece('mayerling i', 'Crown Prince Rudolf and Princess Stephanie at their wedding ball', 22, { effect: 'aurora', palette: ['#2a1418', '#3a1c20', '#4a2428'], speed: 0.2, intensity: 0 }, [], DUETS + BALL),
  piece('mayerling ii', 'Mitzi Caspar dances with the Hungarian officers in her tavern', 22, { effect: 'pulse', palette: ['#140c08', '#1c120c', '#241810'], speed: 0.3, intensity: 0 }, [], DUETS + TAVERN),
  piece('mayerling iii', 'Mary Vetsera and Crown Prince Rudolf at the hunting lodge', 24, { effect: 'pulse', palette: ['#0a120c', '#0e1a10', '#122014'], speed: 0.2, intensity: 0 }, [], DUETS + MAYER),
  // Wayne McGregor, a triple bill, in order.
  piece('chroma', 'Wayne McGregor: a sharp duet in a white room', 22, { effect: 'pulse', palette: ['#e4e2dc', '#e4e2dc', '#e4e2dc'], speed: 0.1, intensity: 0 }, [], DUETS + CHROMA),
  piece('infra', 'Wayne McGregor: under an LED screen of walking figures', 24, { effect: 'pulse', palette: ['#08090c', '#0c0d10', '#101216'], speed: 0.2, intensity: 0 }, [], DUETS + INFRA),
  piece('untitled 2023', 'Wayne McGregor: a white canvas cut with green', 22, { effect: 'pulse', palette: ['#eeede8', '#eeede8', '#eeede8'], speed: 0.1, intensity: 0 }, [], DUETS + UNTITLED),
  piece('don quixote', 'Kitri and Basilio dance their wedding pas de deux in Barcelona', 26, { effect: 'aurora', palette: ['#3a1a14', '#5a2a18', '#7a3a1c'], speed: 0.3, intensity: 0 }, [fireworks(26, 21.8, 25.6, '#ffd040', 0), fireworks(26, 21.8, 25.6, '#ff6a8a', 0.7)], DUETS + DONQ),
  piece('giselle', 'Giselle among the Wilis in the moonlit forest', 24, { effect: 'starfield', palette: ['#101c24', '#2a3c50', '#c0d0e0'], speed: 0.2, intensity: 0 }, [fireflies('#a8e0c0', during(24, 0, 17))], DUETS + GISELLE),
  piece('la fille mal gardee', 'The chicken dance, then Lise and Colas with a ribbon in the farmyard', 27, { effect: 'aurora', palette: ['#3a4a6a', '#5a6a8a', '#8a90a8'], speed: 0.2, intensity: 0 }, [BIRDS], DUETS + FILLE),
  piece('manon', 'Manon meets Des Grieux in the inn yard at Amiens', 23, { effect: 'pulse', palette: ['#1a1614', '#221c18', '#2a221c'], speed: 0.2, intensity: 0 }, [], DUETS + MANON),
  piece('class', 'Clawd takes ballet class at the barre', 20, { effect: 'pulse', palette: ['#1e1e2a', '#24243a', '#2a2a40'], speed: 0.2, intensity: 0 }, [], CLASS),
]

// What a piece is doing at t seconds, for the preview's spinner line.
export const moveAt = (piece: Piece, t: number) => `${piece.name} · ${Math.floor(((t % piece.routine) + piece.routine) % piece.routine)}s`
