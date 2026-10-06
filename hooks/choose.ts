// What `/ballet <words>` picks, and what Tab completes them to. Forgiving:
// a typo or two ("mmayerling", "glaa"), a start ("may"), a word of the name
// ("lake"), and an act by numeral or number ("mayerling 3", "swan lake act ii").

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix']

// A piece's name as its ballet and its act: "swan lake ii" is Swan Lake's
// second act; "untitled 2023" is a ballet of one act (act 0).
export function split(name: string): { ballet: string; act: number } {
  const words = name.split(' ')
  const act = ROMAN.indexOf(words[words.length - 1]!) + 1

  return act > 0 && words.length > 1 ? { ballet: words.slice(0, -1).join(' '), act } : { ballet: name, act: 0 }
}

const normal = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// "swan lake iii" as "Swan Lake III", for replies.
export const title = (name: string) => name.replace(/\b[a-z]+\b/g, w => (ROMAN.includes(w) ? w.toUpperCase() : w[0]!.toUpperCase() + w.slice(1)))

// Edits from a to b, two letters swapped counting as one ("glaa", "gala").
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1)
    }
  }

  return d[a.length]![b.length]!
}

// How far the words typed are from a name, or from its start (a start with
// a typo still counts); Infinity past the typos allowed for that length.
function near(typed: string, name: string): number {
  const d = Math.min(distance(typed, name), distance(typed, name.slice(0, typed.length)))
  const allowed = typed.length <= 2 ? 0 : typed.length <= 5 ? 1 : 2

  return d <= allowed ? d : Infinity
}

// How well the words typed name a ballet: its whole name first, then any one
// of its words ("lake"), a shade worse so a whole-name match wins a tie.
const score = (typed: string, ballet: string) => Math.min(near(typed, ballet), ...ballet.split(' ').map(w => near(typed, w) + 0.5))

export type Choice = { index: number } | { error: string }

// The piece `/ballet <arg>` names, out of `names` (the pieces in order).
export function choose(names: readonly string[], arg: string): Choice {
  const typed = normal(arg)
  const exact = names.indexOf(typed)
  if (exact >= 0) return { index: exact }
  const words = typed.split(' ').filter(w => w && w !== 'act')
  // A trailing act, as a number or (after the ballet's name) a numeral.
  const last = words[words.length - 1] ?? ''
  const act = /^[1-9]$/.test(last) ? Number(last) : words.length > 1 ? ROMAN.indexOf(last) + 1 : 0
  const stem = (act > 0 ? words.slice(0, -1) : words).join(' ')
  const pieces = names.map(split)
  let best = ''
  let bestAt = Infinity
  for (const ballet of new Set(pieces.map(p => p.ballet))) {
    const d = stem ? score(stem, ballet) : Infinity
    if (d < bestAt) [best, bestAt] = [ballet, d]
  }
  if (bestAt === Infinity) return { error: `No piece called "${arg.trim()}". Try ${summary(names)}.` }
  const acts = pieces.flatMap((p, index) => (p.ballet === best ? [{ ...p, index }] : []))
  if (act === 0) return { index: acts[0]!.index }
  const found = acts.find(p => p.act === act)
  if (found) return { index: found.index }

  return { error: acts.length > 1 ? `${title(best)} has acts ${acts.map(p => ROMAN[p.act - 1]!.toUpperCase()).join(', ')}.` : `${title(best)} is a single act.` }
}

// The modes: the live dancer, or the pieces in turn.
export const MODES = ['live', 'standard'] as const

// Words for the modes: their names, and standard's old one, still taken.
const MODE_WORDS: [string, (typeof MODES)[number]][] = [['live', 'live'], ['standard', 'standard'], ['repertoire', 'standard']]

// The mode the words name, typos and all ("standrd", "liev"), if any.
export function modeOf(arg: string): (typeof MODES)[number] | undefined {
  const typed = normal(arg)
  let best: (typeof MODES)[number] | undefined
  let bestAt = Infinity
  for (const [word, mode] of MODE_WORDS) {
    const d = typed ? near(typed, word) : Infinity
    if (d < bestAt) [best, bestAt] = [mode, d]
  }

  return best
}

// Words that open the programme (the pane of pieces and settings).
export const PROGRAMME = ['programme', 'program', 'settings']

// Whether the words name the programme, typos and all ("progamme",
// "setings"); a start counts only from four letters, so "p" is no word.
export function isProgramme(arg: string): boolean {
  const typed = normal(arg)

  return typed.length >= 4 && PROGRAMME.some(word => near(typed, word) < Infinity)
}

// The piece after the one at `index`: in turn, the next in the programme;
// shuffled, its ballet's next act still, else the first act of another
// ballet at random (`random` in [0, 1)).
export function following(names: readonly string[], index: number, isShuffled: boolean, random = Math.random): number {
  const next = (index + 1) % names.length
  if (!isShuffled) return next
  const here = split(names[index] ?? '')
  const after = split(names[next]!)
  if (after.ballet === here.ballet && after.act > here.act) return next
  const starts = names.flatMap((name, i) => {
    const { ballet, act } = split(name)

    return act <= 1 && ballet !== here.ballet ? [i] : []
  })

  return starts[Math.floor(random() * starts.length)] ?? next
}

// What Tab offers for the words typed so far: every name (the modes, the
// programme and on/off too) that starts with them, else the one piece they
// name loosely.
export function completions(names: readonly string[], arg: string): string[] {
  const typed = normal(arg)
  const starting = [...names, ...MODES, 'programme', 'on', 'off'].filter(n => n.startsWith(typed))
  if (starting.length) return starting
  const picked = choose(names, arg)

  return 'index' in picked ? [names[picked.index]!] : []
}

// The names with each ballet's acts folded together: "swan lake i-iv".
export function summary(names: readonly string[]): string {
  const groups: { ballet: string; acts: number[] }[] = []
  for (const { ballet, act } of names.map(split)) {
    const group = groups.find(g => g.ballet === ballet)
    if (group) group.acts.push(act)
    else groups.push({ ballet, acts: [act] })
  }

  return groups.map(g => (g.acts.length > 1 ? `${g.ballet} ${ROMAN[g.acts[0]! - 1]}-${ROMAN[g.acts[g.acts.length - 1]! - 1]}` : g.ballet)).join(', ')
}
