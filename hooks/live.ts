// The live dancer: one Clawd in the studio, its dancing made of what
// Claude does, as claude-toons' scenes follow the work (toons'
// hooks/library.ts). No model is asked. Between tool calls Clawd holds
// still, focused, in a pose for the moment (thinking, a test running,
// writing the reply); each tool call or shell command fires one quick move
// of its own (grep a twirl, cat a pas de chat, an edit a beaten jump), with
// a label over its head saying what set it off, and calls in quick
// succession chain their moves together. News (a new task, a tool that
// failed, tests that passed) cuts in at once. A stagehand brings git's
// ribbon, which trails Clawd's moves for a while after; a messenger runs
// the web's letters in; an MCP server sends a partner, and subagents a
// corps that dances Clawd's moves in canon.
//
// The plugin passes the moment in each frame as the scene's globals
// (`liveAct`, `liveMove`, ...: `globalsOf`); played without them, as in
// the scripts, Clawd stands ready.

import { bare, COMMON } from './ballet'
import { DANCER } from './dance'
import { parseProgram } from './lang'
import type { Script } from './script'

// What Claude is at, for the pose Clawd holds between moves.
export const ACTS = ['idle', 'thinking', 'reading', 'searching', 'editing', 'running', 'testing', 'building', 'git', 'web', 'mcp', 'agents', 'writing'] as const
export type Act = (typeof ACTS)[number]
export const NEWS = ['task', 'fail', 'pass'] as const
export type News = (typeof NEWS)[number]
// The moves a tool call fires (`MOVES` in the scene, which check-frames
// holds to this list).
export const MOVES = ['read', 'cat', 'head', 'tail', 'wc', 'diff', 'grep', 'rg', 'find', 'ls', 'pwd', 'edit', 'write', 'rm', 'mv', 'cp', 'mkdir', 'chmod', 'tar', 'echo', 'sleep', 'kill', 'cd', 'sort', 'open', 'ssh', 'run', 'test', 'build', 'git', 'commit', 'web', 'mcp', 'agent', 'skill'] as const
export type Move = (typeof MOVES)[number]

// Shell commands by their first word: the move, and the kind of work.
const COMMANDS: Record<string, [Move, Act]> = {
  cat: ['cat', 'reading'],
  head: ['head', 'reading'],
  tail: ['tail', 'reading'],
  wc: ['wc', 'reading'],
  diff: ['diff', 'reading'],
  less: ['read', 'reading'],
  more: ['read', 'reading'],
  bat: ['read', 'reading'],
  sed: ['read', 'reading'],
  awk: ['read', 'reading'],
  jq: ['read', 'reading'],
  grep: ['grep', 'searching'],
  rg: ['rg', 'searching'],
  ag: ['rg', 'searching'],
  find: ['find', 'searching'],
  fd: ['find', 'searching'],
  locate: ['find', 'searching'],
  which: ['find', 'searching'],
  ls: ['ls', 'searching'],
  tree: ['ls', 'searching'],
  pwd: ['pwd', 'searching'],
  rm: ['rm', 'editing'],
  rmdir: ['rm', 'editing'],
  mv: ['mv', 'editing'],
  cp: ['cp', 'editing'],
  mkdir: ['mkdir', 'editing'],
  touch: ['mkdir', 'editing'],
  chmod: ['chmod', 'editing'],
  chown: ['chmod', 'editing'],
  sudo: ['chmod', 'running'],
  tar: ['tar', 'editing'],
  zip: ['tar', 'editing'],
  unzip: ['tar', 'editing'],
  gzip: ['tar', 'editing'],
  echo: ['echo', 'running'],
  printf: ['echo', 'running'],
  sleep: ['sleep', 'running'],
  wait: ['sleep', 'running'],
  kill: ['kill', 'running'],
  pkill: ['kill', 'running'],
  killall: ['kill', 'running'],
  cd: ['cd', 'running'],
  sort: ['sort', 'running'],
  uniq: ['sort', 'running'],
  open: ['open', 'running'],
  curl: ['web', 'web'],
  wget: ['web', 'web'],
  ssh: ['ssh', 'web'],
  scp: ['ssh', 'web'],
  rsync: ['ssh', 'web'],
}

// Printable ASCII only, short enough for a label.
const plain = (text: string, max: number) => {
  const flat = text.replace(/\s+/g, ' ').replace(/[^\x20-\x7e]/g, '').trim()

  return flat.length > max ? `${flat.slice(0, max - 3)}...` : flat
}
const base = (path: unknown) => (typeof path === 'string' ? path.slice(path.lastIndexOf('/') + 1) : '')
const host = (url: unknown) => (typeof url === 'string' ? (/^\w+:\/\/([^/?#]+)/.exec(url)?.[1] ?? url) : '')

// MCP tools are `mcp__<server>__<tool>`; the server's name as words.
export function mcpOf(tool: string): { server: string; name: string } | undefined {
  const m = /^mcp__(.+?)__(.+)$/.exec(tool)
  if (!m) return undefined

  return { server: plain(m[1]!.replace(/_/g, ' '), 30), name: plain(m[2]!.replace(/_/g, ' '), 30) }
}

// A shell command: the command it starts with, past a `cd ... &&` and any
// `VAR=value`s (never shown: they can hold keys), if it has a move of its
// own; git by its own words (a commit message or a file named for tests is
// no test run); else tests or a build, read from anywhere in it, as toons
// reads them. Labelled by its first word or two.
function bashOf(command: string): { act: Act; move: Move; label: string } {
  const words = command.trim()
  const after = /^cd\s+(?:"[^"]*"|'[^']*'|\S+)\s*(?:&&|;)\s*(.*)$/s.exec(words)
  const rest = (after ? after[1]! : words).replace(/^(?:[A-Za-z_]\w*=(?:"[^"]*"|'[^']*'|\S*)\s+)+/, '')
  const first = (/^(\S+)/.exec(rest)?.[1] ?? '').replace(/^.*\//, '')
  const second = /^\S+\s+([a-z][\w-]*)/.exec(rest)?.[1] ?? ''
  const label = plain(/^(git|gh|npm|npx|pnpm|yarn|bun|cargo|go|make|docker|node|python3?)$/.test(first) && second ? `${first} ${second}` : first, 20)
  const known = COMMANDS[first]
  if (known) return { act: known[1], move: known[0], label }
  if (first === 'git' || first === 'gh') return { act: 'git', move: /^(git (commit|push|merge|tag|rebase)|gh pr create)\b/.test(rest) ? 'commit' : 'git', label }
  if (/\b(test|tests|jest|vitest|pytest|mocha|spec|rspec|check|go test|cargo test)\b/.test(command)) return { act: 'testing', move: 'test', label }
  if (/\b(build|tsc|make|cargo (build|check)|compile|webpack|vite|bundle|install|npm ci|yarn|pnpm|pip|poetry|gradle|mvn|xcodebuild)\b/.test(command)) return { act: 'building', move: 'build', label }
  if (/\b(git (commit|push|merge|tag|rebase)|gh pr create)\b/.test(command)) return { act: 'git', move: 'commit', label }
  if (/\b(git|gh)\b/.test(command)) return { act: 'git', move: 'git', label }

  return { act: 'running', move: 'run', label }
}

// What a tool call is: the kind of work, the move it fires, and its label.
export function actOf(tool: string, input: Record<string, unknown>): { act: Act; move: Move; label: string } {
  const is = (act: Act, move: Move, label: string) => ({ act, move, label: plain(label, 24) })
  const file = base(input.file_path ?? input.notebook_path)
  const mcp = mcpOf(tool)
  if (mcp) return is('mcp', 'mcp', mcp.server)
  if (tool === 'Read' || tool === 'NotebookRead') return is('reading', 'read', `read ${file}`)
  if (tool === 'Grep') return is('searching', 'grep', 'grep')
  if (tool === 'Glob') return is('searching', 'find', 'glob')
  if (tool === 'LS') return is('searching', 'ls', 'ls')
  if (tool === 'ToolSearch') return is('searching', 'grep', 'tool search')
  if (tool === 'Edit' || tool === 'MultiEdit' || tool === 'NotebookEdit') return is('editing', 'edit', `edit ${file}`)
  if (tool === 'Write') return is('editing', 'write', `write ${file}`)
  if (tool === 'WebFetch') return is('web', 'web', `fetch ${host(input.url)}`)
  if (tool === 'WebSearch') return is('web', 'web', 'web search')
  if (tool === 'Agent' || tool === 'Task' || tool === 'Workflow') return is('agents', 'agent', tool === 'Workflow' ? 'workflow' : 'agent')
  if (tool === 'Skill') return is('thinking', 'skill', `skill ${String(input.skill ?? '')}`)
  if (tool === 'Bash') return bashOf(typeof input.command === 'string' ? input.command : '')

  return is('running', 'run', tool)
}

// What the scene is told each frame.
export type Moment = {
  act: Act
  // The last tool call's move and label, and a count of the calls, so each
  // one fires its move once (and the same move twice fires twice).
  move: Move | ''
  label: string
  toolN: number
  // Whether a tool is running now (Clawd holds the move's pose for it).
  busy: boolean
  // The latest news and a count that changes with each.
  news: News | ''
  newsN: number
  // Subagents at work (the corps), and the MCP server partnering Clawd.
  corps: number
  guest: string
  // A count of the subagents' tool calls, which of them made the last one
  // (by the order they started), and its move: that dancer of the corps
  // dances it.
  crewN: number
  crewWho: number
  crewMove: Move | ''
}

export const globalsOf = (m: Moment) => ({
  liveAct: m.act,
  liveMove: m.move,
  liveLabel: m.label,
  liveToolN: m.toolN,
  liveBusy: m.busy,
  liveNews: m.news,
  liveNewsN: m.newsN,
  liveCorps: m.corps,
  liveGuest: m.guest,
  liveCrewN: m.crewN,
  liveCrewWho: m.crewWho,
  liveCrewMove: m.crewMove,
})

// The live scene's code, after the dancer and the shared steps. A queue of
// moves (QUEUE, the last two cues kept, news first) plays out back to
// back; when it is empty Clawd holds a pose for the moment (hold), which
// the next cue cuts at once unless Clawd is turning or in the air. The
// stagehand (SK) and the partner (PK) have tracks of their own, scheduled
// with Clawd's move. The corps joins only once Clawd is in the middle, and
// while it is on, Clawd's moves stay in place, so nobody lands on anybody.
const LIVE = String.raw`
function live() {
  return {
    act: typeof liveAct === 'undefined' ? 'idle' : liveAct,
    move: typeof liveMove === 'undefined' ? '' : liveMove,
    label: typeof liveLabel === 'undefined' ? '' : liveLabel,
    toolN: typeof liveToolN === 'undefined' ? 0 : liveToolN,
    busy: typeof liveBusy === 'undefined' ? false : liveBusy,
    news: typeof liveNews === 'undefined' ? '' : liveNews,
    newsN: typeof liveNewsN === 'undefined' ? 0 : liveNewsN,
    corps: typeof liveCorps === 'undefined' ? 0 : liveCorps,
    guest: typeof liveGuest === 'undefined' ? '' : liveGuest,
    crewN: typeof liveCrewN === 'undefined' ? 0 : liveCrewN,
    crewWho: typeof liveCrewWho === 'undefined' ? 0 : liveCrewWho,
    crewMove: typeof liveCrewMove === 'undefined' ? '' : liveCrewMove,
  };
}
// Clawd in the studio, in class colours, as in Class.
const LOOK = { tutu: '#c8c0e8', frill: '#ece8fa' };
const CORPS = { tutu: '#e6ecfa', frill: '#ffffff' };
// The stagehand: in stagehand's black, a shade light enough to show
// against the studio at night, with a cap.
const STAGEHAND = { bare: true, breeches: '#4a4a5c', shoes: '#2a2a32', crown: '.kkkk.\nkkkkkk', crownColors: { k: '#6a6a82' } };
// Each MCP server sends a partner in its own colour.
const PARTNERS = ['#3a4a7a', '#7a3a4a', '#3a6a4a', '#6a5a2a', '#5a3a7a', '#2a6a6a'];
const LETTER = { art: 'wwwwww\nwggggw\nwwwwww\nwgggww', colors: { w: '#f4f0e4', g: '#9a9080' } };
const RIBBON = '#ff7aa0';
const SK = [];
const sadd = (t, p) => SK.push([t, p]);
const PK = [];
const padd = (t, p) => PK.push([t, p]);
// Poses placed from a fraction of the stage plus dx columns, for partners.
const M = (x, dx, view, arms, legs, more) => P(x, view, arms, legs, Object.assign({ dx: dx }, more || {}));
// Windows of time: bourrée steps, sparkles, labels, and little signs (FX:
// from, to, kind, and a side for some).
const GLIDES = [];
const GLOWS = [];
const TAGS = [];
const FX = [];
const PROPS = [];
const QUEUE = [];
// Where the ribbon has been: the hand's last few cells.
const TRAIL = [];
const during = (list, t) => list.some(g => t >= g[0] && t < g[1]);
const fxAt = t => { for (const f of FX) if (t >= f[0] && t < f[1]) return f; return null; };
const fx = (t0, t1, kind, side) => FX.push([t0, t1, kind, side || 0]);
const prop = (thing, keys) => PROPS.push({ thing: thing, keys: keys });
const facing = (x0, x1) => x1 > x0 ? 'right' : 'left';
const other = view => view === 'right' ? 'left' : 'right';
let n = 0, here = 0.5, until = 1.4, holding = false, seen = -1, seenTool = -1, seenCrew = -1, ribbonUntil = -1;
let partnerOn = false, partnerSide = 1, partnerLook = { bare: true, breeches: PARTNERS[0], shoes: '#16120e' };
let L = 12, R = 60;
const away = (x, d) => x < 0.5 ? clamp(x + d, 0.05, 0.95) : clamp(x - d, 0.05, 0.95);
// On from the wing in a bourrée, to the middle.
key(0, P(-0.25, 'right', SECOND, 'stand'));
key(1.4, P(0.5, 'right', SECOND, 'stand'));
GLIDES.push([0, 1.4]);

// Poses on Clawd's track a beat apart: [view, arms, legs, more].
function seq(t0, x, beat, list) {
  for (let i = 0; i < list.length; i++) key(t0 + i * beat, P(x, list[i][0], list[i][1], list[i][2], list[i][3]));
}
// A walk (air 0) or a run (air 2) on a track, k steps a beat apart.
function walk(add, t0, x0, x1, dx, k, beat, arms, air) {
  const view = facing(x0, x1);
  for (let i = 0; i < k; i++) {
    add(t0 + i * beat, M(x0 + (x1 - x0) * i / k, dx, view, arms, 'plie'));
    add(t0 + (i + 0.5) * beat, M(x0 + (x1 - x0) * (i + 0.5) / k, dx, view, arms, 'stand', { air: air }));
  }
  add(t0 + k * beat, M(x1, dx, view, arms, 'stand'));
}
// Big grand jetés, higher than the pieces' leaps.
function jetes(t0, x0, x1, k) {
  const view = facing(x0, x1);
  for (let i = 0; i < k; i++) {
    const t = t0 + i * 0.85, a = x0 + (x1 - x0) * i / k, b = x0 + (x1 - x0) * (i + 1) / k;
    key(t, P(a, view, BAS, 'plie'));
    key(t + 0.42, P((a + b) / 2, view, RAISED[view], 'jete', { air: 6 }));
    key(t + 0.8, P(b, view, SECOND, 'plie'));
  }
  return t0 + k * 0.85;
}
// A quick turn on the spot: k turns in passé, landing on the spin.
function twirl(t0, x, k, length, arms) {
  key(t0, P(x, 'front', SECOND, 'plie'));
  key(t0 + 0.12, P(x, 'front', arms || FIFTH, 'passe', { spinning: true, spin: 0 }));
  key(t0 + length - 0.15, P(x, 'front', arms || FIFTH, 'passe', { spinning: true, spin: 360 * k }));
  key(t0 + length, P(x, 'front', SECOND, 'plie', { spin: 360 * k }));
}
// A glissade: a low, gliding jump to x1.
function glissade(t0, x, x1, arms) {
  const view = x1 === x ? 'right' : facing(x, x1);
  key(t0, P(x, view, SECOND, 'plie'));
  key(t0 + 0.3, P((x + x1) / 2, view, arms || RAISED[view], 'jete', { air: 3 }));
  key(t0 + 0.6, P(x1, view, SECOND, 'plie'));
  key(t0 + 0.85, P(x1, 'front', SECOND, 'stand'));
}

// The moves a tool call fires, each about a second, ending on the floor.
const MOVES = {
  // Reading a file: up on pointe, the arms opening as a page turns.
  read: (t0, x) => seq(t0, x, 0.25, [['front', BAS, 'plie'], ['front', FIFTH, 'stand', { air: 1 }], ['front', ['high', 'out'], 'stand', { air: 1 }], ['front', SECOND, 'stand']]),
  // cat: a pas de chat, the cat's own step.
  cat: (t0, x, still) => {
    const x1 = still ? x : away(x, 0.06), view = still ? 'right' : facing(x, x1);
    key(t0, P(x, view, SECOND, 'plie'));
    key(t0 + 0.3, P((x + x1) / 2, view, FIFTH, 'passe', { air: 4, eyes: 'happy' }));
    key(t0 + 0.6, P(x1, view, SECOND, 'plie'));
    key(t0 + 0.85, P(x1, 'front', SECOND, 'stand', { eyes: 'happy' }));
  },
  // head: reaching up for the top.
  head: (t0, x) => seq(t0, x, 0.25, [['front', BAS, 'plie'], ['front', FIFTH, 'stand', { air: 2 }], ['front', FIFTH, 'stand', { air: 2 }], ['front', SECOND, 'stand']]),
  // tail: an arabesque flicked out behind, a look back over it.
  tail: (t0, x) => {
    const view = n % 2 ? 'left' : 'right';
    seq(t0, x, 0.3, [['front', SECOND, 'plie'], [view, RAISED[view], 'derriere'], ['back', SECOND, 'stand'], ['front', SECOND, 'stand']]);
  },
  // wc: three quick sautés, counted beside its head.
  wc: (t0, x) => {
    for (let i = 0; i < 3; i++) {
      key(t0 + i * 0.35, P(x, 'front', BAS, 'plie'));
      key(t0 + i * 0.35 + 0.17, P(x, 'front', SECOND, 'stand', { air: 3 }));
    }
    key(t0 + 1.05, P(x, 'front', SECOND, 'plie'));
    fx(t0, t0 + 1.05, 'count');
  },
  // diff: a glance at its reflection in the mirror, and back.
  diff: (t0, x) => seq(t0, x, 0.3, [['back', ['out', 'up'], 'stand'], ['front', ['up', 'out'], 'stand'], ['back', ['up', 'out'], 'stand'], ['front', SECOND, 'stand']]),
  // grep: a quick twirl.
  grep: (t0, x) => twirl(t0, x, 1, 0.75),
  // rg: a double, quicker still.
  rg: (t0, x) => twirl(t0, x, 2, 0.8),
  // find, glob: turning travelled across the studio, and there it is.
  find: (t0, x, still) => {
    const x1 = still ? x : away(x, 0.25);
    key(t0, P(x, 'front', BAS, 'stand', { spinning: true, spin: 0 }));
    key(t0 + 1, P(x1, 'front', BAS, 'stand', { spinning: true, spin: 1080 }));
    key(t0 + 1.15, P(x1, 'front', SECOND, 'plie', { spin: 1080 }));
    key(t0 + 1.4, P(x1, 'front', ['out', 'up'], 'stand', { eyes: 'happy' }));
    fx(t0 + 1.15, t0 + 1.8, 'idea');
  },
  // ls: pointing one way and the other, taking stock.
  ls: (t0, x) => seq(t0, x, 0.28, [['right', RAISED.right, 'stand'], ['left', RAISED.left, 'stand'], ['right', RAISED.right, 'stand'], ['front', SECOND, 'stand']]),
  // pwd: a turn on the spot, looking all round.
  pwd: (t0, x) => seq(t0, x, 0.25, [['right', SECOND, 'stand'], ['back', SECOND, 'stand'], ['left', SECOND, 'stand'], ['front', ['out', 'up'], 'stand']]),
  // An edit: a beaten jump, the legs fluttering.
  edit: (t0, x) => {
    key(t0, P(x, 'front', BAS, 'plie'));
    key(t0 + 0.28, P(x, 'front', SECOND, 'stand', { air: 4 }));
    key(t0 + 0.56, P(x, 'front', BAS, 'plie'));
    key(t0 + 0.8, P(x, 'front', SECOND, 'stand'));
  },
  // A new file written: a grand jeté.
  write: (t0, x, still) => {
    if (still) return MOVES.edit(t0, x);
    const x1 = away(x, 0.22);
    const t = jetes(t0, x, x1, 1);
    key(t + 0.1, P(x1, 'front', SECOND, 'stand'));
  },
  // rm: a kick sending a paper ball into the wings, and the hands dusted.
  rm: (t0, x) => {
    const side = x < 0.5 ? -1 : 1, view = side < 0 ? 'right' : 'left';
    fx(t0, t0 + 0.35, 'ball', side);
    key(t0, P(x, view, SECOND, 'plie'));
    key(t0 + 0.35, P(x, view, FIFTH, 'derriere', { air: 2 }));
    key(t0 + 0.7, P(x, view, SECOND, 'stand'));
    fx(t0 + 0.35, t0 + 1.3, 'toss', side);
    key(t0 + 0.95, P(x, 'front', ['out', 'up'], 'stand', { eyes: 'happy' }));
    key(t0 + 1.2, P(x, 'front', ['up', 'out'], 'stand', { eyes: 'happy' }));
  },
  // mv: a glissade across, the arms carrying something high.
  mv: (t0, x, still) => glissade(t0, x, still ? x : away(x, 0.2), FIFTH),
  // cp: a pose, and the same pose the other way.
  cp: (t0, x) => seq(t0, x, 0.3, [['right', RAISED.right, 'derriere'], ['right', RAISED.right, 'derriere'], ['left', RAISED.left, 'derriere'], ['left', RAISED.left, 'derriere'], ['front', SECOND, 'stand']]),
  // mkdir, touch: down to the floor and springing up, something new there.
  mkdir: (t0, x) => {
    seq(t0, x, 0.3, [['front', BAS, 'plie'], ['front', BAS, 'kneel'], ['front', FIFTH, 'stand', { air: 3, eyes: 'happy' }], ['front', SECOND, 'plie', { eyes: 'happy' }]]);
    fx(t0 + 0.4, t0 + 1.6, 'spark', x < 0.5 ? 1 : -1);
  },
  // chmod, sudo: a quick curtsy to the teacher at the piano.
  chmod: (t0, x) => {
    key(t0, P(x, 'right', SECOND, 'stand'));
    key(t0 + 0.3, P(x, 'right', BAS, 'derriere', { eyes: 'closed' }));
    key(t0 + 0.9, P(x, 'right', BAS, 'derriere', { eyes: 'closed' }));
    key(t0 + 1.2, P(x, 'front', SECOND, 'stand', { eyes: 'happy' }));
  },
  // tar, zip: squashed down small, and out again.
  tar: (t0, x) => seq(t0, x, 0.3, [['front', BAS, 'plie', { eyes: 'closed' }], ['front', BAS, 'kneel', { eyes: 'closed' }], ['front', BAS, 'plie'], ['front', FIFTH, 'stand', { air: 3, eyes: 'happy' }], ['front', SECOND, 'plie']]),
  // echo: singing out, the arms opening, notes rising.
  echo: (t0, x) => {
    seq(t0, x, 0.3, [['front', BAS, 'stand'], ['front', SECOND, 'stand', { eyes: 'happy' }], ['front', ['out', 'high'], 'stand', { eyes: 'happy' }], ['front', SECOND, 'stand', { eyes: 'happy' }]]);
    fx(t0 + 0.2, t0 + 1.8, 'notes');
  },
  // sleep: sitting down (and staying down while it waits).
  sleep: (t0, x) => seq(t0, x, 0.35, [['front', BAS, 'plie'], ['front', BAS, 'kneel', { eyes: 'closed' }]]),
  // kill: the dying swan, quickly, and up again.
  kill: (t0, x) => {
    const view = n % 2 ? 'left' : 'right';
    seq(t0, x, 0.22, [[view, FIFTH, 'plie'], [view, SECOND, 'plie'], [view, BAS, 'plie', { eyes: 'closed' }], [view, SECOND, 'kneel', { eyes: 'closed' }], [view, BAS, 'kneel', { eyes: 'closed' }], ['front', FIFTH, 'stand', { air: 3, eyes: 'happy' }], ['front', SECOND, 'plie']]);
  },
  // cd: a glissade somewhere new.
  cd: (t0, x, still) => glissade(t0, x, still ? x : away(x, 0.25)),
  // sort: two chassés, one way and back.
  sort: (t0, x, still) => {
    const d = still ? 0 : 0.05;
    const a = clamp(x + d, 0.05, 0.95), b = clamp(x - d, 0.05, 0.95);
    key(t0, P(x, 'right', SECOND, 'plie'));
    key(t0 + 0.25, P(a, 'right', SECOND, 'stand', { air: 2 }));
    key(t0 + 0.5, P(a, 'left', SECOND, 'plie'));
    key(t0 + 0.75, P(b, 'left', SECOND, 'stand', { air: 2 }));
    key(t0 + 1, P(x, 'front', BAS, 'stand'));
  },
  // open: a presentation, the arms opening wide.
  open: (t0, x) => seq(t0, x, 0.3, [['front', BAS, 'plie'], ['front', ['down', 'out'], 'stand'], ['front', SECOND, 'stand', { eyes: 'happy' }], ['front', FIFTH, 'stand', { eyes: 'happy' }]]),
  // ssh: leaping off into the wings, and back in from the other side.
  ssh: (t0, x, still) => {
    if (still) return MOVES.cd(t0, x, true);
    const out = x < 0.5 ? -0.3 : 1.3, back = x < 0.5 ? 1.3 : -0.3;
    const t = jetes(t0, x, out, 1);
    key(t, P(back, facing(back, x), SECOND, 'plie'));
    jetes(t + 0.2, back, x, 1);
  },
  // Any other command: a double pirouette.
  run: (t0, x) => twirl(t0, x, 2, 1, SECOND),
  // Tests: a preparation, up into arabesque (held while they run).
  test: (t0, x) => {
    const view = x < 0.5 ? 'right' : 'left';
    key(t0, P(x, 'front', SECOND, 'plie'));
    key(t0 + 0.4, P(x, view, RAISED[view], 'derriere'));
  },
  // A build: a tour en l'air, then up in passé (held while it builds).
  build: (t0, x) => {
    tour(t0, x, 1);
    key(t0 + 1.1, P(x, 'front', FIFTH, 'passe', { spin: 360 }));
  },
  // git: the stagehand runs in with a ribbon on a wand, if Clawd has none,
  // and Clawd twirls with it.
  git: (t0, x) => {
    let t = t0;
    if (t0 > ribbonUntil) {
      const side = x < 0.5 ? 1 : -1, dx = 16 * side, wing = side > 0 ? 1.2 : -0.2, sv = side > 0 ? 'right' : 'left';
      walk(sadd, t0, wing, x, dx, 3, 0.16, ['out', 'up'], 2);
      sadd(t0 + 0.6, M(x, dx, other(sv), BAS, 'plie'));
      walk(sadd, t0 + 0.75, x, wing, dx, 3, 0.16, BAS, 2);
      key(t0 + 0.15, P(x, sv, SECOND, 'stand'));
      key(t0 + 0.55, P(x, sv, RAISED[sv], 'stand', { eyes: 'happy' }));
      t = t0 + 0.7;
    }
    ribbonUntil = t + 12;
    twirl(t, x, 2, 1, RAISED.right);
  },
  // A commit or a push: a révérence, sparkling.
  commit: (t0, x) => {
    const view = n % 2 ? 'left' : 'right';
    key(t0, P(x, view, RAISED[view], 'derriere'));
    reverence(t0 + 0.4, x, view, 0.8);
    key(t0 + 1.5, P(x, 'front', SECOND, 'stand', { eyes: 'happy' }));
    GLOWS.push([t0 + 0.8, t0 + 1.6]);
  },
  // The web: a messenger runs in with a letter, and Clawd jumps for it.
  web: (t0, x) => {
    const side = x < 0.5 ? 1 : -1, dx = 16 * side, wing = side > 0 ? 1.2 : -0.2, sv = side > 0 ? 'right' : 'left';
    walk(sadd, t0, wing, x, dx, 3, 0.16, SECOND, 2);
    sadd(t0 + 0.6, M(x, dx, other(sv), SECOND, 'plie'));
    walk(sadd, t0 + 0.75, x, wing, dx, 3, 0.16, BAS, 2);
    prop(LETTER, [[t0, 'sh'], [t0 + 0.55, 'cl'], [t0 + 0.85, 'up'], [t0 + 1.7, 'none']]);
    key(t0 + 0.15, P(x, sv, SECOND, 'plie'));
    key(t0 + 0.45, P(x, sv, FIFTH, 'stand', { air: 3 }));
    key(t0 + 0.7, P(x, sv, SECOND, 'plie'));
    key(t0 + 0.9, P(x, 'front', FIFTH, 'stand'));
    key(t0 + 1.6, P(x, 'front', FIFTH, 'stand'));
  },
  // An MCP server: its partner walks on (once) and lifts Clawd; partnered
  // already, a supported pirouette.
  mcp: (t0, x, still, s) => {
    let t = t0;
    if (!partnerOn) {
      partnerSide = x < 0.5 ? 1 : -1;
      let hash = 0;
      for (let i = 0; i < s.guest.length; i++) hash = (hash * 31 + s.guest.charCodeAt(i)) % 997;
      partnerLook = { bare: true, breeches: PARTNERS[hash % PARTNERS.length], shoes: '#16120e' };
      walk(padd, t0, partnerSide > 0 ? 1.3 : -0.3, x, 16 * partnerSide, 5, 0.22, SECOND, 2);
      partnerOn = true;
      t = t0 + 1.2;
      key(t0 + 0.2, P(x, partnerSide > 0 ? 'right' : 'left', SECOND, 'stand'));
      key(t, P(x, partnerSide > 0 ? 'right' : 'left', SECOND, 'stand', { eyes: 'happy' }));
    }
    const dx = 16 * partnerSide, pv = partnerSide > 0 ? 'left' : 'right';
    const lifting = partnerSide > 0 ? ['high', 'down'] : ['down', 'high'];
    if (t > t0) {
      padd(t + 0.1, M(x, dx, pv, SECOND, 'plie'));
      key(t + 0.1, P(x, 'front', SECOND, 'plie'));
      key(t + 0.45, P(x, 'front', FIFTH, 'stand', { air: 6, eyes: 'happy' }));
      padd(t + 0.45, M(x, dx, pv, lifting, 'stand'));
      key(t + 1.3, P(x, 'front', FIFTH, 'stand', { air: 6, eyes: 'happy' }));
      padd(t + 1.3, M(x, dx, pv, lifting, 'stand'));
      key(t + 1.7, P(x, 'front', SECOND, 'plie', { eyes: 'happy' }));
      padd(t + 1.7, M(x, dx, pv, SECOND, 'stand'));
    } else {
      padd(t0, M(x, dx, pv, SECOND, 'stand'));
      twirl(t0, x, 2, 1);
      padd(t0 + 1, M(x, dx, pv, SECOND, 'stand'));
    }
  },
  // Subagents sent out: Clawd calls them on, the arms sweeping up.
  agent: (t0, x) => seq(t0, x, 0.3, [['front', BAS, 'plie'], ['front', SECOND, 'stand'], ['front', FIFTH, 'stand', { eyes: 'happy' }], ['front', SECOND, 'stand']]),
  // A skill: a quick balancé, right and left.
  skill: (t0, x) => balances(t0, x, 2, SECOND, 0.5),
};

// News, first in the queue.
const ANSWERS = {
  // A new task: a preparation, glad to begin.
  task: (t0, x) => seq(t0, x, 0.3, [['front', BAS, 'plie'], ['front', SECOND, 'stand'], ['front', FIFTH, 'stand', { eyes: 'happy' }], ['front', FIFTH, 'stand', { eyes: 'happy' }]]),
  // A tool failed: a wobble off balance, and shaken off.
  fail: (t0, x) => {
    key(t0, P(x, 'front', SECOND, 'plie', { eyes: 'closed' }));
    key(t0 + 0.3, P(x - 0.01, 'left', ['high', 'down'], 'plie'));
    key(t0 + 0.6, P(x + 0.01, 'right', ['down', 'high'], 'plie'));
    key(t0 + 0.9, P(x - 0.006, 'left', ['high', 'down'], 'plie'));
    key(t0 + 1.2, P(x, 'front', BAS, 'stand', { eyes: 'closed' }));
    key(t0 + 1.6, P(x, 'front', SECOND, 'stand'));
    line(t0 + 0.3, t0 + 2, ['oops', 'encore!', 'from the top']);
  },
  // Tests or a build passed: a double tour, and sparkles.
  pass: (t0, x) => {
    tour(t0, x, 2);
    key(t0 + 1.2, P(x, 'front', FIFTH, 'stand', { eyes: 'happy', spin: 720 }));
    GLOWS.push([t0, t0 + 1.8]);
    line(t0 + 0.8, t0 + 2, ['bravo!', 'ta-da!', 'brava!']);
  },
};

// The pose Clawd holds between moves: for a tool still running, the
// move's own; otherwise focused and still while thinking, a slow port de
// bras while writing the reply, ready otherwise.
function hold(t0, x, s) {
  const view = x < 0.5 ? 'right' : 'left';
  const o = other(view);
  if (s.busy && s.move === 'test') {
    // Tests: balances, each held a moment: arabesque, passé, the other side.
    seq(t0 + 0.3, x, 0.9, [[view, RAISED[view], 'derriere'], ['front', FIFTH, 'passe'], [o, RAISED[o], 'derriere'], ['front', SECOND, 'stand']]);
  } else if (s.busy && s.move === 'build') seq(t0 + 0.3, x, 0.7, [['front', FIFTH, 'passe'], ['front', FIFTH, 'stand', { air: 1 }], ['front', SECOND, 'plie'], ['front', FIFTH, 'passe']]);
  else if (s.busy && s.move === 'sleep') {
    key(t0 + 2, P(x, 'front', BAS, 'kneel', { eyes: 'closed' }));
    fx(t0, t0 + 2, 'zzz');
  } else if (s.act === 'agents' && s.corps > 0) {
    // Leading the corps: a lively phrase in place for them to take up.
    seq(t0 + 0.2, x, 0.4, [['front', SECOND, 'plie'], ['front', FIFTH, 'stand', { air: 3 }], ['front', SECOND, 'plie'], [view, RAISED[view], 'derriere'], ['front', BAS, 'plie'], ['front', SECOND, 'stand', { air: 3 }], ['front', BAS, 'plie'], [o, RAISED[o], 'derriere'], ['front', SECOND, 'stand']]);
  }
  else if (s.act === 'writing') seq(t0 + 0.3, x, 0.9, [['front', BAS, 'stand'], ['front', SECOND, 'stand'], ['front', FIFTH, 'stand', { eyes: 'happy' }], ['front', SECOND, 'stand']]);
  else if (s.act === 'idle') key(t0 + 2, P(x, 'front', BAS, 'stand'));
  else {
    // Thinking: light tendus and élevés, unhurried, as at the barre.
    const v = n % 2 ? 'left' : 'right';
    seq(t0 + 0.3, x, 0.6, [['front', BAS, 'stand'], ['front', SECOND, 'stand', { air: 1 }], ['front', BAS, 'stand'], [v, ['down', 'out'], 'derriere'], [v, ['down', 'out'], 'stand'], [v, ['down', 'out'], 'derriere'], ['front', BAS, 'stand']]);
  }
}

// The partner off again, a bow, while Clawd waves.
function farewell(t0, x) {
  const dx = 16 * partnerSide, wing = partnerSide > 0 ? 1.3 : -0.3, sv = partnerSide > 0 ? 'right' : 'left';
  padd(t0, M(x, dx, other(sv), BAS, 'plie'));
  walk(padd, t0 + 0.3, x, wing, dx, 5, 0.22, BAS, 0);
  seq(t0, x, 0.3, [[sv, RAISED[sv], 'stand', { eyes: 'happy' }], [sv, SECOND, 'stand', { eyes: 'happy' }], [sv, RAISED[sv], 'stand', { eyes: 'happy' }], ['front', SECOND, 'stand']]);
  partnerOn = false;
}

// The studio, as in Class: the mirror's frames, the barre, the floor, and
// the piano with its metronome where there's room.
function studio(floor) {
  for (let y = 0; y < floor; y++) for (let x = 4; x < w - 4; x += 16) put(x, y, '│', '#3a3a50');
  for (let x = 2; x < w - 2; x++) pixel(x, (floor - 4) * 2 + 1, '#b08860');
  for (let x = 6; x < w - 4; x += 20) {
    put(x, floor - 3, '│', '#806040');
    put(x, floor - 2, '│', '#806040');
  }
  for (let x = 0; x < w; x++) put(x, floor, '▀', '#8a7a68', '#6a5c4c');
}
function piano(t, floor) {
  const x0 = w - 12;
  for (let i = 0; i < 9; i++) {
    put(x0 + i, floor - 3, '█', '#4a2a1a');
    put(x0 + i, floor - 2, '▀', i % 3 === 1 ? '#2a2420' : '#f0ece0', '#4a2a1a');
  }
  put(x0, floor - 1, '│', '#4a2a1a');
  put(x0 + 8, floor - 1, '│', '#4a2a1a');
  put(x0 + 6, floor - 4, '╱│╲│'[Math.floor(t * 4) % 4], '#e0c080');
}

// Where the corps stands: columns from the middle, 22 apart so tutus
// don't merge (further out while a partner is on), as many as fit.
function slots() {
  const out = [];
  const first = partnerOn ? 38 : 22;
  for (let k = 0; k < 2; k++) for (const side of [1, -1]) {
    const off = (first + 22 * k) * side;
    if (Math.abs(off) + 11 <= (R - L) / 2 + 10) out.push(off);
  }
  return out;
}
const crew = [];
// Each corps dancer's own moves, fired by its agent's tool calls: a turn
// for a search, rising for a read, a jump for an edit, a hop otherwise.
const CREW = [[], [], [], []];
const CREW_KIND = { grep: 'turn', rg: 'turn', find: 'turn', ls: 'turn', pwd: 'turn', read: 'rise', cat: 'rise', head: 'rise', tail: 'rise', wc: 'rise', diff: 'rise', edit: 'jump', write: 'jump', rm: 'jump', mkdir: 'jump' };
function crewMove(i, move, t) {
  const track = CREW[i];
  const add = (tt, p) => track.push([tt, p]);
  track.length = 0;
  const kind = CREW_KIND[move] || 'hop';
  const v = i % 2 ? 'left' : 'right';
  if (kind === 'turn') {
    add(t, P(0, 'front', SECOND, 'plie'));
    add(t + 0.1, P(0, 'front', FIFTH, 'passe', { spinning: true, spin: 0 }));
    add(t + 0.6, P(0, 'front', FIFTH, 'passe', { spinning: true, spin: 360 }));
    add(t + 0.75, P(0, 'front', SECOND, 'plie', { spin: 360 }));
  } else if (kind === 'rise') {
    add(t, P(0, 'front', BAS, 'plie'));
    add(t + 0.25, P(0, 'front', FIFTH, 'stand', { air: 2 }));
    add(t + 0.6, P(0, 'front', SECOND, 'stand'));
  } else if (kind === 'jump') {
    add(t, P(0, 'front', BAS, 'plie'));
    add(t + 0.25, P(0, 'front', SECOND, 'stand', { air: 4 }));
    add(t + 0.5, P(0, 'front', BAS, 'plie'));
    add(t + 0.7, P(0, 'front', SECOND, 'stand'));
  } else {
    add(t, P(0, v, SECOND, 'plie'));
    add(t + 0.25, P(0, v, FIFTH, 'passe', { air: 3 }));
    add(t + 0.5, P(0, v, SECOND, 'plie'));
    add(t + 0.7, P(0, 'front', SECOND, 'stand'));
  }
}
// The corps: each bourrées on from its wing to its place, dances Clawd's
// moves a beat behind, and bourrées off when its agent is done.
function company(t, dt, s, ground, solo) {
  const offs = slots();
  const mid = (L + R) / 2;
  const centred = Math.abs(solo.x - 0.5) < 0.08 && !solo.spinning;
  for (let i = 0; i < 4; i++) {
    // Just off stage, on the side of its place.
    const off = (i % 2 ? -1 : 1) * ((R - L) / 2 + 24);
    if (!crew[i]) crew[i] = { at: off, isIn: false };
    const c = crew[i];
    const isWanted = i < offs.length && i < s.corps && (c.isIn || centred);
    const target = isWanted ? offs[i] : off;
    const gap = target - c.at;
    const moving = Math.abs(gap) > 0.5;
    c.at += clamp(gap, -30 * dt, 30 * dt);
    if (!moving) c.isIn = isWanted;
    if (!isWanted && !moving) continue;
    // Its own move while one runs, else Clawd's, a beat behind.
    const own = CREW[i].length && CREW[i][CREW[i].length - 1][0] > t;
    const q = moving ? bourree(P(0, gap > 0 ? 'right' : 'left', SECOND, 'stand'), t + i * 0.1) : beating(blinking(track(own ? CREW[i] : KEYS, own ? t : t - 0.2 * (i + 1)), t + i * 0.7), t);
    dancer(q, Math.round(mid + c.at), ground, CORPS);
  }
}

// Where a prop is: in the stagehand's hands, Clawd's, or held overhead.
function holderAt(who, d, ds) {
  if (who === 'cl') return [d.x - 3, d.top + 4];
  if (who === 'up') return [d.x - 3, d.top - 6];
  if (who === 'sh' && ds) return [ds.x - 3, ds.top + 4];
  return null;
}
function props(t, d, ds) {
  for (const pr of PROPS) {
    let i = -1;
    for (let j = 0; j < pr.keys.length; j++) if (pr.keys[j][0] <= t) i = j;
    if (i < 0) continue;
    const to = holderAt(pr.keys[i][1], d, ds);
    if (!to) continue;
    const from = i > 0 ? holderAt(pr.keys[i - 1][1], d, ds) : null;
    const k = from ? ease(clamp((t - pr.keys[i][0]) / 0.3)) : 1;
    const x = Math.round(from ? lerp(from[0], to[0], k) : to[0]);
    const py = 2 * Math.round((from ? lerp(from[1], to[1], k) : to[1]) / 2);
    pixels(x, py, pr.thing.art, pr.thing.colors);
  }
}
// The hand that holds the wand: the raised one, else the right; as a cell.
const REACH = { up: [3, -3], high: [7, 0], out: [7, 2], down: [6, 5] };
function handOf(p, d) {
  const lifted = a => a === 'up' || a === 'high';
  const side = lifted(p.arms[1]) || !lifted(p.arms[0]) ? 1 : -1;
  const reach = REACH[p.arms[side > 0 ? 1 : 0]] || REACH.out;
  return [d.x + (side > 0 ? reach[0] : -reach[0] - 1), Math.floor((d.top + reach[1]) / 2)];
}
// The ribbon: a band half a cell thick from the wand (the person found a
// whole cell too chunky and a box-drawing line too thin): circling Clawd
// as it turns, streaming back along the hand's path as it moves,
// fluttering out in an S, away from Clawd, when it's still. Lower half
// blocks along, half-width blocks up and down and on a slant (on the side
// of the cell before, so the band joins up and seems to twist): the lower
// half is what every terminal draws solid (solidify draws everything so),
// and a half-width block is whole-height.
const STROKE = (dx, dy) => dy === 0 ? '▄' : dx === 0 ? '▐' : dx > 0 ? '▌' : '▐';
// A path's corners joined up into a line of neighbouring cells.
function densify(path, cap) {
  const cells = [path[0]];
  for (let i = 1; i < path.length && cells.length < cap; i++) {
    const a = cells[cells.length - 1], b = path[i];
    const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    for (let k = 1; k <= steps && cells.length < cap; k++) cells.push([Math.round(lerp(a[0], b[0], k / steps)), Math.round(lerp(a[1], b[1], k / steps))]);
  }
  return cells;
}
function ribbon(t, p, d) {
  const hand = handOf(p, d);
  TRAIL.push([hand[0], hand[1], t]);
  while (TRAIL.length && TRAIL[0][2] < t - 0.6) TRAIL.splice(0, 1);
  const path = [[hand[0], hand[1]]];
  let isRound = false;
  if (p.spinning) {
    isRound = true;
    const a = (p.spin || 0) * Math.PI / 180;
    for (let j = 1; j < 12; j++) {
      const b = a - j * 0.38;
      path.push([d.x + Math.round(Math.sin(b) * 13), d.row + 2 - Math.round(Math.cos(b) * 2.4)]);
    }
  } else {
    const first = TRAIL[0];
    if (first && Math.abs(first[0] - hand[0]) + Math.abs(first[1] - hand[1]) > 2) for (let i = TRAIL.length - 2; i >= 0; i--) path.push([TRAIL[i][0], TRAIL[i][1]]);
    // Out to the side of the hand, or away from a partner.
    const side = partnerOn ? -partnerSide : hand[0] >= d.x ? 1 : -1;
    const from = path[path.length - 1];
    for (let j = 1; j <= 4; j++) path.push([from[0] + side * j * 3, hand[1] + Math.round(Math.sin(t * 3 - j * 1.1) * 0.9)]);
  }
  const cells = densify(path, isRound ? 30 : 20);
  for (let i = 1; i < cells.length; i++) {
    const a = cells[i - 1], b = cells[i];
    if (b[1] < 0 || b[1] >= h - 1) continue;
    put(b[0], b[1], STROKE(b[0] - a[0], b[1] - a[1]), mix(RIBBON, '#8a3a5a', i / cells.length));
  }
}
// Where the dancer will stand this frame, as dancer() places it, for the
// ribbon drawn behind everyone before the dancers are.
function placeOf(p, cx, ground) {
  let top = Math.round(ground - (p.legs === 'kneel' ? 5 : 9) - (p.air || 0));
  if (mod(top, 2) === 1) top -= 1;
  return { x: cx, row: Math.floor(top / 2), top: top };
}
// Little signs: thought bubbles rising while thinking, an idea, a count,
// notes, z's, a paper ball kicked away, a spark, a spin's whirl.
function signs(t, s, p, d, ground) {
  const f = fxAt(t);
  const sign = f ? f[2] : '';
  const k = f ? clamp((t - f[0]) / (f[1] - f[0])) : 0;
  const head = Math.max(0, d.row - 1);
  if (holding && s.act === 'thinking') {
    for (let i = 0; i < 3; i++) {
      const a = fract(t * 0.45 + i / 3);
      const row = Math.round(head - a * (head + 0.4));
      if (row >= 0) put(d.x + 6 + Math.round(a * 4), row, a < 0.33 ? '·' : a < 0.66 ? 'o' : 'O', '#a8a0c8');
    }
  }
  if (sign === 'idea') put(d.x, Math.max(0, d.row - 2), '!', '#ffe070');
  if (sign === 'count') put(d.x + 8, head, String(Math.min(3, Math.floor(k * 3) + 1)), '#e8e0b0');
  if (sign === 'notes') for (let i = 0; i < 3; i++) {
    const a = fract(t * 0.8 + i / 3);
    put(d.x + 5 + i * 3, Math.round(head - a * head), '♪♫♪'[i], mix('#be96d2', '#2a2a40', a));
  }
  if (sign === 'zzz') for (let i = 0; i < 3; i++) {
    const a = fract(t * 0.5 + i / 3);
    put(d.x + 6 + Math.round(a * 5), Math.round(d.row + 1 - a * (d.row + 1)), a < 0.5 ? 'z' : 'Z', '#a8b0d0');
  }
  if (sign === 'ball') pixels(d.x + f[3] * 12, ground - 1, 'ww', { w: '#e8e4d8' });
  if (sign === 'toss') pixels(Math.round(d.x + f[3] * (12 + k * w)), 2 * Math.round((ground - 1 - Math.sin(Math.PI * k) * 10) / 2), 'ww\nww', { w: '#e8e4d8' });
  if (sign === 'spark') put(d.x + f[3] * 13, Math.floor(ground / 2), '✦✧'[Math.floor(t * 6) % 2], '#ffe8a0');
  // A whirl round a quick turn.
  if (p.spinning) {
    const c = Math.floor(t * 8) % 2 ? '#b0a090' : '#706458';
    put(d.x - 11, d.row + 2, '(', c);
    put(d.x + 10, d.row + 2, ')', c);
  }
}
// What Claude is at while Clawd holds a pose, for the label.
function stateOf(s) {
  if (s.busy && s.move === 'test') return 'tests running';
  if (s.busy && s.move === 'build') return 'building';
  if (s.busy) return 'running';
  if (s.act === 'writing') return 'writing the reply';
  if (s.act === 'agents' && s.corps > 0) return 'agents at work';
  if (s.act === 'idle') return '';
  return 'thinking';
}
// The label, always in one place at the top left: a bright chip naming
// what set off the move in hand (the newest), else a dim one saying what
// Claude is at.
function tag(t, s) {
  let g = null;
  for (const one of TAGS) if (t >= one[0] && t < one[1]) g = one;
  const label = g ? g[2] : stateOf(s);
  if (!label || w < 24) return;
  const chip = ' ' + label.slice(0, w - 4) + ' ';
  if (g) text(1, 0, chip, '#1e1e2a', '#f0d890');
  else text(1, 0, chip, '#b8b0c8', '#34344a');
}

function frame(t, dt) {
  const s = live();
  const floor = h - 1;
  const ground = floor * 2 - 1;
  const hasPiano = w >= 60;
  L = 12;
  R = hasPiano ? w - 26 : w - 12;
  // Each tool call queues its move; news goes first. Only the last two
  // moves wait, so a burst of calls never leaves Clawd behind.
  if (s.toolN !== seenTool) {
    if (seenTool >= 0 && s.move) QUEUE.push({ move: s.move, label: s.label });
    while (QUEUE.length > 2) QUEUE.splice(0, 1);
    seenTool = s.toolN;
  }
  if (s.newsN !== seen) {
    if (seen >= 0 && ANSWERS[s.news]) QUEUE.unshift({ news: s.news });
    seen = s.newsN;
  }
  if (s.crewN !== seenCrew) {
    if (seenCrew >= 0 && s.crewMove && s.crewWho >= 0 && s.crewWho < 4) crewMove(s.crewWho, s.crewMove, t);
    seenCrew = s.crewN;
  }
  // A held pose gives way at once (and to news, whatever is dancing),
  // unless Clawd is turning or in the air.
  const visiting = (SK.length && SK[SK.length - 1][0] > t) || (PK.length && PK[PK.length - 1][0] > t);
  const leaving = holding && partnerOn && !s.guest;
  if (((QUEUE.length && (holding || QUEUE[0].news)) || leaving) && !visiting && t < until) {
    const now = track(KEYS, t);
    if (!now.spinning && now.air < 0.5 && now.x > 0 && now.x < 1) {
      while (KEYS.length > 1 && KEYS[KEYS.length - 1][0] > t) KEYS.pop();
      key(t, now);
      for (const g of GLIDES) g[1] = Math.min(g[1], t);
      for (const f of FX) if (f[2] === 'zzz') f[1] = Math.min(f[1], t);
      until = t;
      here = now.x;
    }
  }
  const still = Math.min(slots().length, s.corps) > 0;
  if (t >= until && !visiting) {
    n++;
    holding = false;
    const next = QUEUE.length ? QUEUE[0] : null;
    // Off in the wings (an ssh), Clawd leaps back on before anything else.
    if (here < 0.03 || here > 0.97) jetes(t, here, clamp(here, 0.15, 0.85), 1);
    else if (partnerOn && !s.guest) farewell(t, here);
    else if (still && Math.abs(here - 0.5) > 0.04) jetes(t, here, 0.5, 1);
    else if (next) {
      QUEUE.splice(0, 1);
      if (next.news) {
        ANSWERS[next.news](t, here);
        TAGS.push([t, t + 1.2, { task: 'new task', fail: 'failed', pass: 'passed' }[next.news]]);
      } else {
        (MOVES[next.move] || MOVES.run)(t, here, still, s);
        TAGS.push([t, t + 1.2, next.label]);
      }
    } else {
      holding = true;
      hold(t, here, s);
    }
    const end = KEYS[KEYS.length - 1];
    until = end[0];
    here = end[1].x;
    // A move's label shows for as long as the move.
    const last = TAGS[TAGS.length - 1];
    if (last && last[0] === t) last[1] = Math.max(until, t + 1.2);
  }
  // Only the last few seconds are kept: the corps' canon reads them.
  for (const list of [KEYS, SK, PK]) while (list.length > 2 && list[1][0] < t - 4) list.splice(0, 1);
  for (const list of [GLIDES, GLOWS, TAGS, LINES, FX]) while (list.length && list[0][1] < t - 4) list.splice(0, 1);
  while (PROPS.length && PROPS[0].keys[PROPS[0].keys.length - 1][0] < t - 4) PROPS.splice(0, 1);
  const at = p => Math.round(L + (R - L) * p.x + (p.dx || 0));
  let p = beating(blinking(track(KEYS, t), t), t);
  if (during(GLIDES, t)) p = bourree(p, t);
  studio(floor);
  if (hasPiano) piano(t, floor);
  // The ribbon behind every dancer; the wand, in Clawd's hand, in front.
  const hasRibbon = t < ribbonUntil;
  if (hasRibbon) ribbon(t, p, placeOf(p, at(p), ground));
  else TRAIL.length = 0;
  company(t, dt, s, ground, p);
  let ds;
  if (SK.length) {
    const q = blinking(track(SK, t), t + 0.5);
    if (q.x > -0.2 && q.x < 1.2) ds = dancer(q, at(q), ground, STAGEHAND);
  }
  if (PK.length) {
    const q = blinking(track(PK, t), t + 0.3);
    if (q.x > -0.2 && q.x < 1.2) dancer(q, at(q), ground, partnerLook);
  }
  const d = dancer(p, at(p), ground, LOOK);
  if (hasRibbon) {
    const hand = handOf(p, d);
    put(hand[0], Math.max(0, hand[1] - 1), '╿', '#e8d8b0');
  }
  props(t, d, ds);
  signs(t, s, p, d, ground);
  if (during(GLOWS, t) || p.air > 3.5) sparkles(t, d, floor, '#e8e0ff');
  tag(t, s);
  const said = saying(t, n);
  if (said) speak(said, d);
}
`

export const LIVE_CODE = bare(DANCER + COMMON + LIVE)

export const LIVE_SCENE: Record<string, unknown> = {
  concept: 'Clawd in the studio, each of its moves fired by something Claude does',
  background: { effect: 'pulse', palette: ['#1e1e2a', '#24243a', '#2a2a40'], speed: 0.2, intensity: 0 },
  actors: [],
  particles: [],
  code: LIVE_CODE,
}

// The live scene with the moment passed in. toons' loader reads only the
// first 20,000 characters of a scene's code (a guard for scenes a model
// wrote); the live scene is the plugin's own and longer, so it is parsed
// whole here. Its program runs with the renderer's own globals (t, dt, w,
// h) and the moment's added on every call, so the renderer stays toons'.
// `extra` is code added after it: definitions there replace the scene's own
// (the settings' `function tag() {}` and `function say() {}`).
export function wire(script: Script, moment: () => Moment, extra = ''): Script {
  if (!script.code) return script
  const program = parseProgram(LIVE_CODE + extra)
  script.code.error = undefined
  script.code.program = {
    start: (globals, budget, ms) => program.start({ ...globals, ...globalsOf(moment()) }, budget, ms),
    call: (name, args, globals, budget, ms) => program.call(name, args, { ...globals, ...globalsOf(moment()) }, budget, ms),
  }

  return script
}

// The kind of work each move belongs to, for the scripts' made-up session.
const ACT_OF: Partial<Record<Move, Act>> = { read: 'reading', cat: 'reading', head: 'reading', tail: 'reading', wc: 'reading', diff: 'reading', grep: 'searching', rg: 'searching', find: 'searching', ls: 'searching', pwd: 'searching', edit: 'editing', write: 'editing', rm: 'editing', mv: 'editing', cp: 'editing', mkdir: 'editing', chmod: 'editing', tar: 'editing', test: 'testing', build: 'building', git: 'git', commit: 'git', web: 'web', ssh: 'web', mcp: 'mcp', agent: 'agents' }

// A made-up session for the scripts (play.ts --live, frames.ts --live,
// check-frames): a tool call every 1.5 seconds, every move in turn, some
// still running a while (tests, builds, sleep), a pause to think every so
// often, news now and then, a guest and a corps coming and going.
// A made-up session told as real tool calls, for the README's live GIF
// (frames.ts --story), already under way when it starts: Odile turns 31
// fouettés of her 32, and the fix overshoots to 33 before it lands. Each
// call is read by actOf as live mode reads one, close enough to chain
// (the person found it idle with pauses between), thinking only for a
// story beat; git (and its ribbon) only comes in at the end, to commit. [seconds in, tool, input,
// seconds it runs]
export const STORY: [number, string, Record<string, unknown>, number][] = [
  [0.6, 'Bash', { command: 'rg -n fouette ballets/' }, 0],
  [1.5, 'Read', { file_path: '/repo/ballets/swan-lake/odile.ts' }, 0],
  [2.4, 'Glob', { pattern: 'test/**/fouette*' }, 0],
  [3.3, 'Read', { file_path: '/repo/test/fouettes.test.ts' }, 0],
  [4.2, 'WebFetch', { url: 'https://en.wikipedia.org/wiki/Fouetté' }, 0],
  [6.6, 'Edit', { file_path: '/repo/ballets/swan-lake/odile.ts' }, 0],
  [7.5, 'Bash', { command: 'npm test' }, 1.8],
  [10.8, 'Edit', { file_path: '/repo/ballets/swan-lake/odile.ts' }, 0],
  [11.7, 'Bash', { command: 'npm test' }, 1.8],
  [14.1, 'Write', { file_path: '/repo/test/odile-stops.test.ts' }, 0],
  [15, 'Bash', { command: 'npm test' }, 1.6],
  [17.2, 'Bash', { command: 'git status' }, 0],
  [18.1, 'Bash', { command: 'git diff' }, 0],
  [19, 'Bash', { command: 'git commit -am "Give Odile her 32nd fouette"' }, 0],
  [19.9, 'Bash', { command: 'git push' }, 0],
  [20.8, 'Bash', { command: 'open https://github.com/you/ballet/pull/32' }, 0],
]
// What came of it: the first test run failing, the second passing (the
// task was set before the GIF starts).
const STORY_NEWS: [number, News][] = [[9.3, 'fail'], [13.5, 'pass']]
// When Claude turns to writing the reply.
export const STORY_REPLY = 22.4

export function storyAt(t: number): Moment {
  let n = -1
  for (let k = 0; k < STORY.length; k++) if (STORY[k]![0] <= t) n = k
  const call = STORY[n]
  const cue = call ? actOf(call[1], call[2]) : undefined
  const isBusy = !!call && t < call[0] + call[3]
  // A call's act holds a moment, or while it runs; then Claude thinks.
  const isOn = !!call && t < call[0] + Math.max(1.2, call[3])
  let news = -1
  for (let k = 0; k < STORY_NEWS.length; k++) if (STORY_NEWS[k]![0] <= t) news = k

  return {
    act: t >= STORY_REPLY ? 'writing' : isOn && cue ? cue.act : 'thinking',
    move: cue?.move ?? '',
    label: cue?.label ?? '',
    toolN: n + 1,
    busy: isBusy,
    news: news >= 0 ? STORY_NEWS[news]![1] : '',
    newsN: news + 1,
    corps: 0,
    guest: '',
    crewN: 0,
    crewWho: 0,
    crewMove: '',
  }
}

export function demoAt(t: number): Moment {
  const i = Math.floor(t / 1.5)
  const pause = i % 9 === 8
  const at = (j: number) => MOVES[(((j - Math.floor(j / 9)) % MOVES.length) + MOVES.length) % MOVES.length]!
  const move = at(i)
  const recent = (m: Move) => [0, 1, 2, 3].some(k => at(i - k) === m)
  const news = i % 11 === 5 ? 'fail' : i % 11 === 10 ? 'pass' : i % 29 === 0 ? 'task' : ''

  return {
    act: pause ? 'thinking' : (ACT_OF[move] ?? 'running'),
    move: pause ? '' : move,
    label: pause ? '' : `demo ${move}`,
    toolN: pause ? i - 1 : i,
    busy: !pause && ['test', 'build', 'sleep'].includes(move) && t % 1.5 < 1.2,
    news,
    newsN: news ? i : 0,
    corps: recent('agent') ? 2 : 0,
    guest: at(i) === 'mcp' || at(i - 1) === 'mcp' ? 'demo server' : '',
    crewN: recent('agent') ? Math.floor(t / 0.7) : 0,
    crewWho: Math.floor(t / 0.7) % 2,
    crewMove: MOVES[Math.floor(t / 0.7) % MOVES.length]!,
  }
}
