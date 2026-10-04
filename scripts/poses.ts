// Draws every pose the dancer has (each arm both sides, each leg drawing,
// each eye state in each view), labelled, with the plugin's own renderer, and
// holds them on screen, to judge them in a real terminal:
//
//   node --experimental-transform-types scripts/poses.ts [--seconds N]

import './resolve.ts'

const { DANCER } = await import('../hooks/dance.ts')
const { CLEAR } = await import('../hooks/effects.ts')
const { cleanScript, stage } = await import('../hooks/script.ts')
const { solidify, decode } = await import('../hooks/cells.ts')

const args = process.argv.slice(2)
const i = args.indexOf('--seconds')
const seconds = i >= 0 ? Number(args[i + 1] ?? 60) : 60
const PER_ROW = 4
const WIDE = 27
// [label, pose]: every arm on each side, every leg drawing, every eye state
// in every view.
const POSES = [
  ['out out', "P(0,'front',['out','out'],'stand')"],
  ['high high', "P(0,'front',['high','high'],'stand')"],
  ['up up', "P(0,'front',['up','up'],'stand')"],
  ['down down', "P(0,'front',['down','down'],'stand')"],
  ['high out', "P(0,'front',['high','out'],'stand')"],
  ['out high', "P(0,'front',['out','high'],'stand')"],
  ['3/4 R sticker', "P(0,'right',['out','up'],'derriere')"],
  ['3/4 L sticker', "P(0,'left',['up','out'],'derriere')"],
  ['3/4 R high', "P(0,'right',['high','high'],'stand')"],
  ['back high', "P(0,'back',['high','high'],'passe')"],
  ['plie', "P(0,'front',['out','out'],'plie')"],
  ['passe', "P(0,'front',['high','high'],'passe')"],
  ['jete R', "P(0,'right',['out','up'],'jete')"],
  ['jete L', "P(0,'left',['up','out'],'jete')"],
  ['derriere front', "P(0,'right',['down','down'],'derriere')"],
  ['eyes closed', "P(0,'front',['out','out'],'stand',{eyes:'closed'})"],
  ['eyes happy', "P(0,'front',['out','out'],'stand',{eyes:'happy'})"],
  ['3/4 closed', "P(0,'right',['out','out'],'stand',{eyes:'closed'})"],
  ['3/4 happy', "P(0,'right',['out','out'],'stand',{eyes:'happy'})"],
]
const ROWS = 9
const cols = PER_ROW * WIDE
const color = (c: number, isBack: boolean) => (c === CLEAR ? `\x1b[${isBack ? 49 : 39}m` : `\x1b[${isBack ? 48 : 38};2;${(c >> 16) & 255};${(c >> 8) & 255};${c & 255}m`)
let out = '\x1b[2J\x1b[H'
for (let start = 0; start < POSES.length; start += PER_ROW) {
  const group = POSES.slice(start, start + PER_ROW)
  const code = `${DANCER}
const POSES = [${group.map(([, p]) => p).join(', ')}];
function frame(t, dt) { POSES.forEach((p, i) => dancer(p, 13 + i * ${WIDE}, 2 * h - 1, {})); }`
  const script = cleanScript({ background: { effect: 'pulse', palette: ['#1d1f28', '#1e202a'], speed: 0.1, intensity: 0 }, actors: [], particles: [], code })!
  const words = decode(solidify(stage({ cols, rows: ROWS, t: 1, script, since: 1000, reveal: 1 })))
  out += group.map(([label]) => `\x1b[2m${label.padEnd(WIDE)}\x1b[0m`).join('') + '\n'
  for (let row = 1; row < ROWS; row++) {
    let line = ''
    for (let col = 0; col < cols; col++) {
      const at = (row * cols + col) * 3
      line += color(words[at + 1]!, false) + color(words[at + 2]!, true) + String.fromCodePoint(words[at] || 0x20)
    }
    out += `${line}\x1b[0m\n`
  }
  if (script.code?.error) out += `\x1b[31m${script.code.error}\x1b[0m\n`
}
process.stdout.write(`${out}\x1b[?25l`)
setTimeout(() => {
  process.stdout.write('\x1b[?25h')
  process.exit(0)
}, seconds * 1000)
