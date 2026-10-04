import type { EngineInterface, Register } from 'claude-code'

import { PIECES } from './ballet'
import { solidify } from './cells'
import { cleanScript, stage, type Script } from './script'

const COMMAND = 'ballet'
// The Raster's key, which each blitted frame names.
const KEY = 'ballet'
const ROWS = 9
// How long the band takes to rise to its full height when the spinner shows,
// as in claude-toons.
const GROW_MS = 700

type Stage = {
  isShown: boolean
  isAnimating: boolean
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
}

// A piece shown only a moment (a quick turn, or the instant the band counts
// as working while /ballet runs) plays again next time instead of being
// skipped.
const SEEN_MS = 3000

// When a turn's dancing ends: the next turn picks up after the piece that
// was playing, if it played long enough to be seen.
function finish($: EngineInterface, s: Stage, at: number) {
  if (!s.scene) return
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

function frameAt(s: Stage, at: number, rows: number) {
  // A piece plays through once, then dissolves into the next.
  if (s.scene && at - s.sceneAt > PIECES[s.piece]!.routine * 1000) {
    s.previous = s.scene
    s.previousAt = s.sceneAt
    begin(s, s.piece + 1, at)
  }
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

async function toggle($: EngineInterface, s: Stage, show: boolean) {
  s.isShown = show
  await $.store.set('isShown', show).catch(() => {})
  $.ui.invalidate('ui.render')
}

// A piece's first word picks it; Mayerling's acts share one, so it picks
// the first act, and they play on in order.
const NAMES = PIECES.map(p => p.name.split(' ')[0]!)
const CHOICES = [...new Set(NAMES)]

export const register: Register = on => {
  const s: Stage = { isShown: true, isAnimating: false, shownAt: 0, cols: 60, drawnRows: 1, piece: -1, sceneAt: 0, previousAt: 0, next: 0 }

  on('session.start', async ($, e, next_) => {
    s.isShown = (await $.store.get('isShown')) !== false
    const saved = await $.store.get('next').catch(() => undefined)
    if (typeof saved === 'number') s.next = saved
    await $.command.register({
      name: COMMAND,
      description: `Show or hide Clawd dancing ballet above the prompt, or pick the piece (${CHOICES.join(', ')})`,
      argumentHint: `[on|off|${CHOICES.join('|')}]`,
      immediate: true,
    })

    return next_(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    const picked = NAMES.findIndex(n => arg && n.startsWith(arg))
    if (picked >= 0) {
      s.next = picked
      s.scene = undefined
      await $.store.set('next', s.next).catch(() => {})
      if (!s.isShown) await toggle($, s, true)

      return { text: `Next up: ${PIECES[picked]!.name}.` }
    }
    await toggle($, s, arg === 'on' ? true : arg === 'off' ? false : !s.isShown)

    return { text: s.isShown ? 'Ballet on: Clawd dances while Claude works.' : 'Ballet off. /ballet brings Clawd back.' }
  })

  on('turn.complete', async ($, e, next_) => {
    s.spinner = undefined
    finish($, s, await $.clock.now())
    $.ui.invalidate('ui.render')

    return next_(e)
  })

  // The stage sits in the band directly above the prompt, flush against it,
  // while Claude works; the spinner line above stays the engine's.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next_) => {
    if (e.surface !== 'terminal' || !s.isShown || !e.props.isWorking || e.props.hasSurvey) {
      s.spinner = undefined
      if (s.scene) finish($, s, await $.clock.now())

      return next_(e)
    }
    const { Raster } = $.ui.resolve(e)
    const now = await $.clock.now()
    // A new turn grows the band in and starts the next piece from its top.
    if (!s.scene) {
      // The store has the last word: a reload starts this module afresh.
      const saved = await $.store.get('next').catch(() => undefined)
      if (typeof saved === 'number') s.next = saved
      s.shownAt = now
      s.previous = undefined
      begin(s, s.next, now)
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
