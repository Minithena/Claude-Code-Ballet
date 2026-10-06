// Prints the routine's frames as JSON, for scripts/gif.py to draw, rendered
// by toons' renderer the way the plugin draws them:
//
//   node --experimental-transform-types scripts/frames.ts [--piece N | --live [--story | --agents]] [--seconds N] [--fps N] [--cols N] [--raw]
//
// --raw skips the plugin's last pass over the cells (hooks/cells.ts).

import './resolve.ts'

const { PIECES, moveAt } = await import('../hooks/ballet.ts')
const { LIVE_SCENE, STORY, STORY_REPLY, demoAt, storyAt, wire } = await import('../hooks/live.ts')
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
// --story plays a session told as real tool calls (git status, read
// README.md, npm test) in place of the made-up one; --agents keeps four
// of the corps on throughout (subagents at work), each dancing its own
// agent's calls.
const isStory = args.includes('--story')
const isAgents = args.includes('--agents')
// The story starts mid-request: the scene runs a few seconds first, so
// Clawd is on and the band up when the GIF begins, and the spinner's clock
// reads as if Claude has been at it a while.
const PRE = isStory ? 3 : 0
const CLOCK = isStory ? 108 : 0
const momentAt = (t: number) => {
  if (isStory) return storyAt(t - PRE)
  const m = demoAt(t)
  const k = Math.floor(t / 0.7)
  if (isAgents) return { ...m, corps: 4, guest: '', crewN: k, crewWho: k % 4 }

  return m
}
const script = isLive ? wire(clean, () => momentAt(now)) : clean
const frames: string[] = []
const moves: string[] = []
for (let n = 0; n < (PRE + seconds) * fps; n++) {
  const since = (n * 1000) / fps
  now = since / 1000
  // Drawn at full height, its top rows empty until the band has risen.
  const cells = stage({ cols, rows, t: since / 1000, script, since, reveal: PRE ? 1 : Math.min(1, since / (GROW_MS * 1.6)) })
  if (n < PRE * fps) continue
  frames.push(args.includes('--raw') ? cells : solidify(cells))
  moves.push(isLive ? `live · ${momentAt(now).move || momentAt(now).act}` : moveAt(piece, since / 1000))
}
// --story also gives the Claude Code session around the stage, for gif.py
// to draw above it as claude-toons' demo shows: the prompt, each of the
// story's calls as Claude Code lists them and what came of each, a word
// from Claude now and then, and the reply. [seconds in, style, text,
// seconds gone (or never)]
type Line = [number, string, string, number?]
const log: Line[] = []
if (isStory) {
  // What came of each call, in the story's order; a test that fails says so.
  const ODILE = 'ballets/swan-lake/odile.ts'
  const RESULTS: [string, string?][] = [
    [`${ODILE}:14:  for (let turn = 1; turn < 32; turn++) fouette()`, '… +2 lines (ctrl+o to expand)'],
    ['Read 64 lines'],
    ['Found 1 file'],
    ['Read 18 lines'],
    ['Received 48.2KB (200 OK)'],
    [`Updated ${ODILE} with 1 addition and 1 removal`],
    ['Error: expected 32 fouettés, got 33'],
    [`Updated ${ODILE} with 1 addition and 1 removal`],
    ['24 passed'],
    ['Wrote 12 lines to test/odile-stops.test.ts'],
    ['25 passed'],
    ['On branch main', `modified: ${ODILE}`],
    [`diff --git a/${ODILE} b/${ODILE}`, '… +8 lines (ctrl+o to expand)'],
    ['[main 3e1f0a2] Give Odile her 32nd fouette'],
    ['b7e2c41..3e1f0a2  main -> main'],
    ['(No content)'],
  ]
  const SAYS: Record<number, string[]> = {
    5: ['Wikipedia agrees: 32. Her turns count from 1 to below 32.'],
    7: ['Now she turns 33. Siegfried is getting dizzy.'],
    9: ["And a test that she stops at 32, so it can't happen again."],
  }
  const say = (t: number, lines: string[]) => {
    log.push([t, 'blank', ''])
    lines.forEach((text, i) => log.push([t, i ? 'more' : 'text', text]))
  }
  // What was on screen before the GIF starts.
  log.push(
    [0, 'text', "Done: the tutu's pink is pinker."], [0, 'blank', ''],
    [0, 'prompt', 'Odile only turns 31 fouettés in act III and the audience is counting.'],
    [0, 'blank', ''], [0, 'call', 'Search(pattern: "Odile")'], [0, 'result', 'Found 4 files'],
    [0, 'blank', ''], [0, 'call', 'Read(ballets/swan-lake/act3.ts)'], [0, 'result', 'Read 418 lines'],
    [0, 'blank', ''], [0, 'text', 'The black swan coda calls into odile.ts. Counting her turns.'],
  )
  // A word from Claude comes once the call before it is done.
  let free = 0
  STORY.forEach(([at, tool, input, runs], k) => {
    if (SAYS[k]) say(Math.max(at - 0.8, free + 0.1), SAYS[k]!)
    const path = String(input.file_path ?? '').replace('/repo/', '')
    const call =
      tool === 'Bash' ? `Bash(${input.command})`
      : input.pattern ? `Search(pattern: "${input.pattern}")`
      : tool === 'Edit' ? `Update(${path})`
      : tool === 'WebFetch' ? `Fetch(${input.url})`
      : `${tool}(${path})`
    const [result, more] = RESULTS[k]!
    const isFail = result.startsWith('Error')
    const done = at + Math.max(runs, 0.4)
    free = done
    log.push([at, 'blank', ''], [at, 'call-run', call, done], [done, isFail ? 'call-fail' : 'call', call])
    log.push([at, 'result', 'Running…', done], [done, isFail ? 'result-fail' : 'result', result])
    if (more) log.push([done, 'result-more', more])
  })
  say(STORY_REPLY + 1.4, ['Fixed: Odile turns all 32 fouettés now, after one go at 33, and a test', "keeps her there. It's pushed, and the PR is open. Brava!"])
}
console.log(JSON.stringify({ cols, rows, fps, frames, moves, log, clock: CLOCK, error: script.code?.error }))
