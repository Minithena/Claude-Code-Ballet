// Plays the routine in a terminal with toons' renderer, as the plugin draws
// it above the prompt, to judge it by eye without Claude Code:
//
//   node --experimental-transform-types scripts/play.ts [--piece N] [--seconds N]
//
// Ctrl-C stops.

import './resolve.ts'

const { PIECES, moveAt } = await import('../hooks/ballet.ts')
const { CLEAR } = await import('../hooks/effects.ts')
const { cleanScript, stage } = await import('../hooks/script.ts')
const { solidify, decode } = await import('../hooks/cells.ts')

const args = process.argv.slice(2)
const opt = (name: string, fallback: number) => {
  const i = args.indexOf(`--${name}`)

  return i >= 0 ? Number(args[i + 1] ?? fallback) : fallback
}
const seconds = opt('seconds', Infinity)
const piece = PIECES[opt('piece', 0)]!
const ROWS = 9
const GROW_MS = 700
// Follows the window's size, so resizing it (terminal.sh does, once it's
// running) never wraps the lines or leaves an old frame scrolled below.
const width = () => Math.max(20, Math.min(220, (process.stdout.columns ?? 100) - 2))
const size = () => `${process.stdout.columns}x${process.stdout.rows}`
let cols = width()
let drawnAt = size()
const script = cleanScript(piece.scene)
if (!script) process.exit(1)
const color = (c: number, isBack: boolean) => (c === CLEAR ? `\x1b[${isBack ? 49 : 39}m` : `\x1b[${isBack ? 48 : 38};2;${(c >> 16) & 255};${(c >> 8) & 255};${c & 255}m`)
const draw = (words: Uint32Array) => {
  const lines: string[] = []
  for (let row = 0; row < ROWS; row++) {
    let line = ''
    for (let col = 0; col < cols; col++) {
      const at = (row * cols + col) * 3
      line += color(words[at + 1]!, false) + color(words[at + 2]!, true) + String.fromCodePoint(words[at] || 0x20)
    }
    lines.push(`${line}\x1b[0m`)
  }

  return lines.join('\n')
}

process.stdout.write('\x1b[?25l\x1b[2J')
const stop = () => {
  process.stdout.write('\x1b[?25h\n')
  process.exit(0)
}
process.on('SIGINT', stop)
const began = Date.now()
setInterval(() => {
  const since = Date.now() - began
  if (since > seconds * 1000) stop()
  if (size() !== drawnAt) {
    drawnAt = size()
    cols = width()
    process.stdout.write('\x1b[2J')
  }
  const cells = solidify(stage({ cols, rows: ROWS, t: since / 1000, script, since, reveal: Math.min(1, since / (GROW_MS * 1.6)) }))
  process.stdout.write(`\x1b[H\x1b[2K\x1b[38;2;217;119;87m✻\x1b[0m Pirouetting… \x1b[2m(${moveAt(piece, since / 1000)})\x1b[0m\n${draw(decode(cells))}`)
  if (script.code?.error) {
    process.stdout.write(`\n\x1b[31m${script.code.error}\x1b[0m\n`)
    stop()
  }
}, 50)
