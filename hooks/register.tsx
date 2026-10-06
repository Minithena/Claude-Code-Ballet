import type { EngineInterface, Register } from 'claude-code'

import { PIECES } from './ballet'
import { solidify } from './cells'
import { choose, completions, MODES, modeOf, summary, title } from './choose'
import { actOf, LIVE_SCENE, mcpOf, wire, type Act, type Moment, type Move, type News } from './live'
import { cleanScript, stage, type Script } from './script'
import type { BalletLoad } from '../types'

const COMMAND = 'ballet'
// The Raster's key, which each blitted frame names.
const KEY = 'ballet'
const ROWS = 9
// How long the band takes to rise to its full height when the spinner shows,
// as in claude-toons.
const GROW_MS = 700
// This load's mark on the session (types/index.d.ts). A hot reload starts
// the module afresh, and the old one's animation loop can outlive it: both
// would paint the band, a frame each, two stages flickering in turn.
const LOAD = { plugin: 'ballet-clawd', key: 'load' } as const

// The pieces in turn (standard), or the live dancer, whose steps follow
// what Claude does (hooks/live.ts).
type Mode = 'standard' | 'live'

// What Claude is doing, for the live dancer, as the hooks below see it.
type Watch = {
  act: Act
  // The shell command's own steps, if it has some.
  // The last tool call's move and the label shown over Clawd for it.
  move: Move | ''
  label: string
  news: News | ''
  newsN: number
  // Main-loop tool calls so far: each one is a cue for the dancer.
  toolN: number
  // Tools running on the main loop, and the Agent calls among them.
  tools: number
  agentCalls: number
  // When each subagent last called a tool: a background agent's call
  // returns at once, so its own tools show it still at work.
  agentsSeen: Map<string, number>
  // The MCP server partnering Clawd, until a few moments after the last of
  // the MCP calls running (they can overlap) is done.
  guest: string
  guestUntil: number
  mcpCalls: number
  // The subagents' tool calls: how many, whose was the last (by the order
  // the subagents started) and its move, for that dancer of the corps.
  crewN: number
  crewWho: number
  crewMove: Move | ''
}

type Stage = {
  // The mark this load wrote on the session, once session.start has run.
  load?: BalletLoad
  isShown: boolean
  isAnimating: boolean
  mode: Mode
  // The band being drawn on while Claude works (its request), when the turn's
  // dancing began (the band grows in there), the strip's size and the height
  // drawn so far.
  spinner?: string
  shownAt: number
  cols: number
  drawnRows: number
  // The piece playing, a fresh copy of its scene and when it began, and the
  // one dissolving out (toons' renderer crossfades them cell by cell).
  piece: number
  scene?: Script
  sceneAt: number
  previous?: Script
  previousAt: number
  // The piece the next turn starts with.
  next: number
  // The live dancer's scene, kept from turn to turn so Clawd dances on, and
  // when it began; what it is told; and the time of the frame being drawn.
  live?: Script
  liveAt: number
  watch: Watch
  now: number
  // What was showing when the band last went (the scene, its clock and the
  // band's), so a blink of it (a subagent's message landing) picks up where
  // it was rather than growing in again.
  paused?: { scene: Script; sceneAt: number; shownAt: number; previous?: Script; previousAt: number; mode: Mode; at: number }
  // The hint row shown while the box holds `/ballet ...`, and what Tab is
  // stepping through: the matches and the one it last put in.
  hint?: string
  tab?: { list: string[]; at: number }
}

// A piece shown only a moment (a quick turn, or the instant the band counts
// as working while /ballet runs) plays again next time instead of being
// skipped.
const SEEN_MS = 3000
// How long the partner stays on after an MCP call, and how long a subagent
// counts as at work after its last tool call.
const GUEST_MS = 2500
// How long the band may be gone mid-turn (a subagent's message landing
// redraws the screen) and still pick up where it was.
const BLINK_MS = 4000
const AGENT_MS = 20_000

// When a turn's dancing ends: the next turn picks up after the piece that
// was playing, if it played long enough to be seen. The live dancer just
// pauses.
function finish($: EngineInterface, s: Stage, at: number) {
  if (!s.scene) return
  s.paused = { scene: s.scene, sceneAt: s.sceneAt, shownAt: s.shownAt, previous: s.previous, previousAt: s.previousAt, mode: s.mode, at }
  if (s.mode === 'live') {
    s.scene = undefined

    return
  }
  s.next = at - s.sceneAt > SEEN_MS ? (s.piece + 1) % PIECES.length : s.piece
  s.scene = undefined
  void $.store.set('next', s.next).catch(() => {})
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

const rowsAt = (s: Stage, at: number) => {
  const grown = clamp01((at - s.shownAt) / GROW_MS)

  return Math.max(1, Math.ceil(ROWS * (1 - Math.pow(1 - grown, 3))))
}

// Starts a piece: a fresh scene, so its clock and its speech start over.
function begin(s: Stage, index: number, at: number) {
  s.piece = ((index % PIECES.length) + PIECES.length) % PIECES.length
  s.scene = cleanScript(PIECES[s.piece]!.scene)
  s.sceneAt = at
}

// What the live dancer is told at a moment.
function momentOf(s: Stage): Moment {
  const w = s.watch
  let recent = 0
  for (const [id, at] of w.agentsSeen) {
    if (s.now - at < AGENT_MS) recent++
    else w.agentsSeen.delete(id)
  }

  return { act: w.act, move: w.move, label: w.label, toolN: w.toolN, busy: w.tools > 0, news: w.news, newsN: w.newsN, corps: Math.min(4, Math.max(w.agentCalls, recent)), guest: s.now < w.guestUntil ? w.guest : '', crewN: w.crewN, crewWho: w.crewWho, crewMove: w.crewMove }
}

// Starts the live dancer's turn: the scene it danced last turn, or a new
// one the first time (or if its code broke).
function beginLive(s: Stage, at: number) {
  if (!s.live || s.live.code?.error) {
    const script = cleanScript(LIVE_SCENE)
    if (!script) return
    s.live = wire(script, () => momentOf(s))
    s.liveAt = at
  }
  s.scene = s.live
  s.sceneAt = s.liveAt
}

function frameAt(s: Stage, at: number, rows: number) {
  s.now = at
  // A piece plays through once, then dissolves into the next.
  if (s.mode === 'standard' && s.scene && at - s.sceneAt > PIECES[s.piece]!.routine * 1000) {
    s.previous = s.scene
    s.previousAt = s.sceneAt
    begin(s, s.piece + 1, at)
  }
  if (s.mode === 'live' && s.scene?.code?.error) beginLive(s, at)
  if (!s.scene) return undefined

  return solidify(
    stage({
      cols: s.cols,
      rows,
      t: (at - s.shownAt) / 1000,
      script: s.scene,
      previous: s.previous,
      since: at - s.sceneAt,
      previousSince: at - s.previousAt,
      reveal: clamp01((at - s.shownAt) / (GROW_MS * 1.6)),
    }),
  )
}

// Paints the dance at about 20 frames a second while the spinner shows, each
// frame once the last one landed.
function animate($: EngineInterface, s: Stage) {
  if (s.isAnimating) return
  s.isAnimating = true
  void (async () => {
    while (s.spinner && s.isShown && s.scene) {
      if (await isSuperseded($, s)) break
      const at = await $.clock.now()
      // While it grows, each new height is a redraw; frames keep painting at
      // the height drawn until it lands.
      if (rowsAt(s, at) !== s.drawnRows) $.ui.invalidate('ui.render')
      const cells = frameAt(s, at, s.drawnRows)
      if (cells) await $.ui.blit({ requestId: s.spinner, key: KEY, cells, columns: s.cols, rows: s.drawnRows }).catch(() => {})
      await $.clock.sleep(50)
    }
    s.isAnimating = false
  })().catch(() => {
    // The module unloaded mid-wait (a reload): the next load starts afresh.
    s.isAnimating = false
  })
}

// Whether a later load of the plugin has taken the session over: its mark
// stands in place of this load's.
async function isSuperseded($: EngineInterface, s: Stage) {
  if (!s.load) return false
  const { value } = await $.state.get(LOAD).catch(() => ({ value: undefined }))

  return value !== undefined && value !== s.load
}

async function toggle($: EngineInterface, s: Stage, show: boolean) {
  s.isShown = show
  await $.store.set('isShown', show).catch(() => {})
  $.ui.invalidate('ui.render')
}

// Switches mode; the next frame starts the new one's dancing.
async function switchTo($: EngineInterface, s: Stage, mode: Mode) {
  s.mode = mode
  s.scene = undefined
  s.paused = undefined
  s.previous = undefined
  await $.store.set('mode', mode).catch(() => {})
  if (!s.isShown) await toggle($, s, true)
  else $.ui.invalidate('ui.render')
}

// What the live dancer is told: the work, and news.
function tell(w: Watch, act: Act) {
  w.act = act
}

function announce(w: Watch, news: News) {
  w.news = news
  w.newsN++
}

// `/ballet <words>` picks a piece by its name, loosely (hooks/choose.ts): a
// ballet alone starts at its first act, and its acts play on in order.
const NAMES = PIECES.map(p => p.name)

// The box holding `/ballet <words>`, the words in group 1.
const DRAFT = /^\/ballet (.*)$/s

// What the hint row above the prompt says for a draft of `/ballet <words>`.
function hintFor(arg: string): string {
  if (!arg.trim()) return `${summary(NAMES)}, live, standard, on, off`
  const fits = completions(NAMES, arg)

  return fits.length ? `${fits.join(' · ')}   (tab completes)` : 'no piece by that name'
}

// Redraws the hint row when the box's text changes what it says.
function showHint($: EngineInterface, s: Stage, text: string) {
  const typed = DRAFT.exec(text)
  const hint = typed ? hintFor(typed[1]!) : text === '/ballet' ? hintFor('') : undefined
  if (hint === s.hint) return
  s.hint = hint
  $.ui.invalidate('ui.render')
}

export const register: Register = on => {
  const s: Stage = {
    isShown: true,
    isAnimating: false,
    mode: 'standard',
    shownAt: 0,
    cols: 60,
    drawnRows: 1,
    piece: -1,
    sceneAt: 0,
    previousAt: 0,
    next: 0,
    liveAt: 0,
    watch: { act: 'idle', move: '', label: '', news: '', newsN: 0, toolN: 0, tools: 0, agentCalls: 0, agentsSeen: new Map(), guest: '', guestUntil: 0, mcpCalls: 0, crewN: 0, crewWho: 0, crewMove: '' },
    now: 0,
  }

  // session.start fires again for each reload: the new load marks the
  // session, and the loop of the load before stops.
  on('session.start', async ($, e, next_) => {
    const load = `${await $.clock.now().catch(() => 0)}-${Math.random()}`
    await $.state.set(LOAD, load).then(
      () => (s.load = load),
      () => {},
    )
    s.isShown = (await $.store.get('isShown')) !== false
    const saved = await $.store.get('next').catch(() => undefined)
    if (typeof saved === 'number') s.next = saved
    if ((await $.store.get('mode').catch(() => undefined)) === 'live') s.mode = 'live'
    await $.command.register({
      name: COMMAND,
      description: `Show or hide Clawd dancing ballet above the prompt, pick the piece (${summary(NAMES)}), or dance live to what Claude does`,
      argumentHint: '[on|off|live|standard|<ballet> [act]]',
      immediate: true,
    })

    return next_(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    showHint($, s, '')
    s.tab = undefined
    const arg = e.args.trim().toLowerCase()
    if (!arg || arg === 'on' || arg === 'off') {
      await toggle($, s, arg === 'on' ? true : arg === 'off' ? false : !s.isShown)

      return { text: s.isShown ? `Ballet on: Clawd dances ${s.mode === 'live' ? 'live, to what Claude does' : 'the ballets in turn'} while Claude works.` : 'Ballet off. /ballet brings Clawd back.' }
    }
    // A piece by its name first; else words near a mode switch to it,
    // typos and all ("standrd").
    const picked = choose(NAMES, arg)
    const mode = MODES.find(m => m === arg) ?? (arg === 'repertoire' || 'error' in picked ? modeOf(arg) : undefined)
    if (mode === 'live') {
      await switchTo($, s, 'live')

      return { text: 'Live: Clawd dances on while Claude works, its steps following what Claude does. /ballet standard for the ballets in turn.' }
    }
    if (mode === 'standard') {
      const saved = await $.store.get('next').catch(() => undefined)
      if (typeof saved === 'number') s.next = saved
      await switchTo($, s, 'standard')

      return { text: `Standard: the ballets in turn. Next up, ${title(PIECES[s.next]!.name)}.` }
    }
    // Words that name no piece say so, and leave the ballet as it was.
    if ('error' in picked) return { text: picked.error }
    s.next = picked.index
    await $.store.set('next', s.next).catch(() => {})
    await switchTo($, s, 'standard')

    return { text: `Next up: ${title(PIECES[picked.index]!.name)}.` }
  })

  // Tab (or the right arrow at the end) completes `/ballet <words>` to the
  // piece they start; Tab again steps to the next match. Every edit updates
  // the hint row.
  on('prompt.edit', async ($, e, next_) => {
    const k = e.key
    const isTab = !!k && !k.ctrl && !k.meta && !k.shift && (k.key === 'tab' || k.key === 'right')
    const typed = DRAFT.exec(e.text)
    if (isTab && typed && e.cursor === e.text.length) {
      const arg = typed[1]!.trim().toLowerCase()
      if (!s.tab || arg !== s.tab.list[s.tab.at]) {
        const list = completions(NAMES, arg)
        s.tab = { list, at: list.indexOf(arg) }
      }
      if (s.tab.list.length) {
        s.tab.at = (s.tab.at + 1) % s.tab.list.length
        const text = `/ballet ${s.tab.list[s.tab.at]}`
        showHint($, s, text)

        return { text, cursor: text.length }
      }
    }
    const box = await next_(e)
    showHint($, s, box.text)

    return box
  })

  // A new task: the live dancer begins it with a preparation.
  on('prompt.submit', async ($, e, next_) => {
    showHint($, s, '')
    s.tab = undefined
    tell(s.watch, 'thinking')
    announce(s.watch, 'task')

    return next_(e)
  })

  // Every tool call on the main loop tells the live dancer what Claude is
  // doing, and how it went; a subagent's calls show it still at work. The
  // call itself goes on untouched.
  on('tool.call', async ($, e, next_) => {
    const w = s.watch
    const at = await $.clock.now().catch(() => s.now)
    if (e.agentId) {
      w.agentsSeen.set(e.agentId, at)
      w.crewWho = [...w.agentsSeen.keys()].indexOf(e.agentId)
      w.crewMove = actOf(e.tool, e as unknown as Record<string, unknown>).move
      w.crewN++

      return next_(e)
    }
    const { act, move, label } = actOf(e.tool, e as unknown as Record<string, unknown>)
    const mcp = mcpOf(e.tool)
    const isAgent = act === 'agents'
    tell(w, act)
    w.move = move
    w.label = label
    w.toolN++
    w.tools++
    if (isAgent) w.agentCalls++
    if (mcp) {
      w.guest = mcp.server
      w.guestUntil = Infinity
      w.mcpCalls++
    }
    try {
      const result = await next_(e)
      if (('deny' in result && result.deny) || result.isError) announce(w, 'fail')
      else if (act === 'testing' || act === 'building') announce(w, 'pass')

      return result
    } finally {
      w.tools--
      if (isAgent) w.agentCalls--
      if (mcp && --w.mcpCalls === 0) w.guestUntil = (await $.clock.now().catch(() => at)) + GUEST_MS
    }
  })

  // The spinner says when Claude turns to thinking or to writing its reply;
  // the engine draws it as ever.
  on('ui.render', { component: 'Spinner' }, ($, e, next_) => {
    const w = s.watch
    if (w.tools === 0 && e.props.mode === 'thinking' && w.act !== 'thinking') tell(w, 'thinking')
    if (w.tools === 0 && e.props.mode === 'responding' && w.act !== 'writing') tell(w, 'writing')

    return next_(e)
  })

  on('turn.complete', async ($, e, next_) => {
    s.spinner = undefined
    tell(s.watch, 'idle')
    finish($, s, await $.clock.now())
    // A turn that ended is over: the next starts afresh.
    s.paused = undefined
    $.ui.invalidate('ui.render')

    return next_(e)
  })

  // The stage sits in the band directly above the prompt, flush against it,
  // while Claude works; the spinner line above stays the engine's.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next_) => {
    if (e.surface !== 'terminal' || !s.isShown || !e.props.isWorking || e.props.hasSurvey) {
      s.spinner = undefined
      if (s.scene) finish($, s, await $.clock.now())
      // Idle with `/ballet ...` in the box: what it can complete to.
      if (s.hint && e.surface === 'terminal' && !e.props.hasSurvey) {
        const { Text } = $.ui.resolve(e)

        return (
          <Text key="ballet-hint" dimColor wrap="truncate-end">
            {`/ballet ${s.hint}`}
          </Text>
        )
      }

      return next_(e)
    }
    const { Raster } = $.ui.resolve(e)
    const now = await $.clock.now()
    // A new turn grows the band in and starts the next piece from its top,
    // or the live dancer where it left off.
    if (!s.scene) {
      // The store has the last word: a reload starts this module afresh.
      s.mode = (await $.store.get('mode').catch(() => undefined)) === 'live' ? 'live' : 'standard'
      const paused = s.paused
      s.paused = undefined
      s.shownAt = now
      s.previous = undefined
      if (paused && paused.mode === s.mode && now - paused.at < BLINK_MS) {
        // Back after a blink, mid-turn: as it was.
        s.scene = paused.scene
        s.sceneAt = paused.sceneAt
        s.shownAt = paused.shownAt
        s.previous = paused.previous
        s.previousAt = paused.previousAt
        s.now = now
      } else if (s.mode === 'live') {
        s.now = now
        beginLive(s, now)
      } else {
        const saved = await $.store.get('next').catch(() => undefined)
        if (typeof saved === 'number') s.next = saved
        begin(s, s.next, now)
      }
    }
    s.spinner = e.requestId
    s.cols = Math.max(20, Math.min(220, e.props.bodyColumns))
    s.drawnRows = Math.min(rowsAt(s, now), Math.max(1, e.props.maxRows))
    const cells = frameAt(s, now, s.drawnRows)
    if (!cells) return next_(e)
    animate($, s)

    return <Raster key={KEY} columns={s.cols} rows={s.drawnRows} cells={cells} />
  })
}
