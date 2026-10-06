// Prints the routine's frames as JSON, for scripts/gif.py to draw, rendered
// by toons' renderer the way the plugin draws them:
//
//   node --experimental-transform-types scripts/frames.ts [--piece N | --live [--solo | --agents]] [--seconds N] [--fps N] [--cols N] [--raw]
//
// --raw skips the plugin's last pass over the cells (hooks/cells.ts).

import './resolve.ts'

const { PIECES, moveAt } = await import('../hooks/ballet.ts')
const { LIVE_SCENE, demoAt, wire } = await import('../hooks/live.ts')
const { cleanScript, stage } = await import('../hooks/script.ts')
const { solidify } = await import('../hooks/cells.ts')

const args = process.argv.slice(2)
const opt = (name: string, fallback: number) => {
  const i = args.indexOf(`--${name}`)

  return i >= 0 ? Number(args[i + 1] ?? fallback) : fallback
}
const piece = PIECES[opt('piece', 0)]!
// --live: the live dancer, through a made-up session (hooks/live.ts).
const isLive = args.includes('--live')
let now = 0
const seconds = opt('seconds', isLive ? 60 : piece.routine)
const fps = opt('fps', 20)
const cols = opt('cols', 90)
const rows = 9
// The band fades in over its first moments, as under the spinner.
const GROW_MS = 700
const clean = cleanScript(isLive ? LIVE_SCENE : piece.scene)
if (!clean) process.exit(1)
// --solo leaves the corps out of the made-up session; --agents keeps four
// on throughout (subagents at work), each dancing its own agent's calls.
const isSolo = args.includes('--solo')
const isAgents = args.includes('--agents')
const momentAt = (t: number) => {
  const m = demoAt(t)
  const k = Math.floor(t / 0.7)
  if (isSolo) return { ...m, corps: 0, crewN: 0 }
  if (isAgents) return { ...m, corps: 4, guest: '', crewN: k, crewWho: k % 4 }

  return m
}
const script = isLive ? wire(clean, () => momentAt(now)) : clean
const frames: string[] = []
const moves: string[] = []
for (let n = 0; n < seconds * fps; n++) {
  const since = (n * 1000) / fps
  now = since / 1000
  // Drawn at full height, its top rows empty until the band has risen.
  const cells = stage({ cols, rows, t: since / 1000, script, since, reveal: Math.min(1, since / (GROW_MS * 1.6)) })
  frames.push(args.includes('--raw') ? cells : solidify(cells))
  moves.push(isLive ? `live · ${momentAt(now).move || momentAt(now).act}` : moveAt(piece, since / 1000))
}
console.log(JSON.stringify({ cols, rows, fps, frames, moves, error: script.code?.error }))
