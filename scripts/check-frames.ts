// Plays every piece's scene code frame by frame, at several widths, and
// checks every pose the dancer is asked to draw:
//
//   node --experimental-transform-types scripts/check-frames.ts
//
// - every arm, leg and view name exists;
// - legs drawn for a three-quarter view (pointed behind, a leap's stride)
//   only in a three-quarter view, where they point the way Clawd faces;
// - a leap's stride only in the air, and feet on the floor otherwise;
// - every dancer's keyframes in time order (track() reads them in order,
//   so one added out of order puts a dancer in the wrong place).

import './resolve.ts'

const { PIECES } = await import('../hooks/ballet.ts')
const { parseProgram } = await import('../hooks/lang.ts')

const ARMS = new Set(['out', 'up', 'down', 'high'])
const LEGS = new Set(['stand', 'plie', 'passe', 'derriere', 'jete', 'kneel'])
const VIEWS = new Set(['front', 'right', 'left', 'back'])
const QUARTER_LEGS = new Set(['derriere', 'jete'])
const problems = new Map<string, number>()
const note = (text: string) => problems.set(text, (problems.get(text) ?? 0) + 1)
let frames = 0

for (const piece of PIECES) {
  // toons reads only the first 20,000 characters of a scene's code.
  const length = (piece.scene.code as string).length
  if (length > 20_000) note(`${piece.name}: ${length} characters of scene code, over toons' 20,000`)
  // The tracks as the scene built them: each time no earlier than the last.
  const tracks = parseProgram(`${piece.scene.code}\nfunction __tracks() { return [KEYS, typeof RK === 'undefined' ? [] : RK, typeof CK === 'undefined' ? [] : CK, typeof OK === 'undefined' ? [] : OK].concat(typeof HK === 'undefined' ? [] : HK); }`)
  const none = () => {}
  tracks.start({ put: none, text: none, pixel: none, pixels: none, say: none, sprite: none, fill: none, mix: () => 0, w: 100, h: 9, t: 0, dt: 0 }, 1_000_000)
  const built = tracks.call('__tracks', [], { w: 100, h: 9, t: 0, dt: 0 }, 1_000_000) as [number, unknown][][]
  built.forEach((keys, k) => {
    for (let i = 1; i < keys.length; i++) if (keys[i]![0] < keys[i - 1]![0]) note(`${piece.name}: ${['KEYS', 'RK', 'CK', 'OK'][k] ?? `HK[${k - 4}]`} keyframe at ${keys[i]![0]}s after one at ${keys[i - 1]![0]}s`)
  })
  for (const cols of [20, 72, 120, 220]) {
    // Each pose the dancer draws is reported before it is drawn.
    const code = (piece.scene.code as string).replace('function dancer(p, cx, ground, look) {', 'function dancer(p, cx, ground, look) {\n  __probe(p, look);')
    const program = parseProgram(code)
    let at = 0
    const probe = (p: Record<string, unknown>, look: Record<string, unknown>) => {
      const where = `${piece.name} @${cols} cols, ${at.toFixed(2)}s`
      const view = p.spinning ? 'front' : String(p.view)
      const arms = p.arms as string[]
      if (!VIEWS.has(view)) note(`${where}: no view ${view}`)
      for (const a of arms) if (!ARMS.has(a)) note(`${piece.name}: no arm ${a}`)
      if (!LEGS.has(String(p.legs))) note(`${piece.name}: no legs ${p.legs}`)
      if (QUARTER_LEGS.has(String(p.legs)) && !p.spinning && (view === 'front' || view === 'back')) note(`${piece.name}: legs ${p.legs} in a ${view} view`)
      if (p.legs === 'jete' && Number(p.air) < 1.5) note(`${piece.name}: a leap's stride on the floor`)
      // In breeches the legs hang under the body: none behind, no stride.
      if (look?.bare && QUARTER_LEGS.has(String(p.legs))) note(`${piece.name}: legs ${p.legs} on a dancer in breeches`)
    }
    const noop = () => {}
    const api = { put: noop, text: noop, pixel: noop, pixels: noop, say: noop, sprite: noop, fill: noop, mix: () => 0, __probe: probe }
    program.start({ ...api, w: cols, h: 9, t: 0, dt: 0 }, 1_000_000)
    for (let ms = 0; ms < piece.routine * 1000 * 2; ms += 25) {
      at = (ms / 1000) % piece.routine
      program.call('frame', [ms / 1000, 0.025], { w: cols, h: 9, t: ms / 1000, dt: 0.025 }, 150_000)
      frames++
    }
  }
}
if (problems.size) {
  for (const [text, n] of problems) console.log(`${text} (${n} frames)`)
  process.exit(1)
}
console.log(`${frames} frames of ${PIECES.length} pieces at 4 widths: every pose drawn is one the dancer has, in a view it fits`)
