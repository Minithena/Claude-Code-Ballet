import { test, expect, mock, type TestBody } from 'claude-code/testing'

import { PIECES } from './ballet'
import { decode } from './cells'
import { completions, following, modeOf, split } from './choose'
import { actOf } from './live'

const band = (isWorking: boolean) => ({
  plugin: 'ballet-clawd',
  surface: 'terminal' as const,
  component: 'AbovePrompt' as const,
  props: { hasSurvey: false, isWorking, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 19 }, view: {} },
})

test('while Claude works, the stage sits in the band above the prompt', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  const ui = await $.ui.mount(band(true))
  expect(await ui.find({ key: 'ballet' })).toBeDefined()
  await ui.unmount()
})

test('idle, the band is left to the engine', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  // The engine draws nothing of its own in the band.
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })
  const ui = await $.ui.mount(band(false))
  expect(await ui.find({ key: 'ballet' })).toBeUndefined()
  await ui.unmount()
})

test('a piece shown only a moment plays again; one seen moves on', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  // /ballet picked piece 4.
  // The plugin's store, kept here to read what the band saves.
  const store: Record<string, unknown> = { next: 4 }
  on('store.get', (_$, e) => ({ value: store[e.key] }))
  on('store.set', (_$, e) => {
    store[e.key] = e.value

    return { value: undefined }
  })
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })
  // A blip: the band counts as working for an instant.
  let ui = await $.ui.mount(band(true))
  await clock.advance(100)
  await ui.unmount()
  ui = await $.ui.mount(band(false))
  await ui.unmount()
  await clock.settle()
  expect(store.next).toBe(4)
  // A real turn: the act plays, then the turn ends.
  ui = await $.ui.mount(band(true))
  await clock.advance(5000)
  await ui.unmount()
  ui = await $.ui.mount(band(false))
  await ui.unmount()
  await clock.settle()
  expect(store.next).toBe(5)
})

// /ballet as the person types it at the prompt.
const TYPED = { command: 'ballet', origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 100 } }

// The plugin's store, kept in the test so what /ballet saves can be read.
function storeOn(on: Parameters<TestBody>[1], store: Record<string, unknown>) {
  on('store.get', (_$, e) => ({ value: store[e.key] }))
  on('store.set', (_$, e) => {
    store[e.key] = e.value

    return { value: undefined }
  })
}

test('/ballet picks a piece loosely, acts included', async ($, on) => {
  const store: Record<string, unknown> = {}
  storeOn(on, store)
  const run = async (args: string) => (await $.command.run({ ...TYPED, args })).text
  expect(await run('mmayerling')).toBe('Next up: Mayerling I.')
  expect(store.next).toBe(8)
  expect(await run('mayerlinf act 3')).toBe('Next up: Mayerling III.')
  expect(await run('swan lake 4')).toBe('Next up: Swan Lake IV.')
  expect(await run('nut 2')).toBe('Next up: Nutcracker II.')
  expect(await run('glaa')).toBe('Next up: Gala.')
  expect(store.next).toBe(0)
  expect(await run('don q')).toBe('Next up: Don Quixote.')
  expect(await run('fille')).toBe('Next up: La Fille Mal Gardee.')
  expect(await run('manon')).toBe('Next up: Manon.')
  expect(await run('gisele')).toBe('Next up: Giselle.')
})

test('/ballet with words that name no piece says so and leaves the ballet on', async ($, on) => {
  const store: Record<string, unknown> = { isShown: true, next: 3 }
  storeOn(on, store)
  const run = async (args: string) => (await $.command.run({ ...TYPED, args })).text
  expect(await run('zzzz')).toMatch(/^No piece called "zzzz"\. Try gala, swan lake i-iv/)
  expect(await run('mayerling 4')).toBe('Mayerling has acts I, II, III.')
  expect(await run('firebird 2')).toBe('Firebird is a single act.')
  expect(store.isShown).toBe(true)
  expect(store.next).toBe(3)
  expect(await run('off')).toMatch(/^Ballet off/)
  expect(store.isShown).toBe(false)
  expect(await run('')).toMatch(/^Ballet on/)
})

test('Tab offers what the words typed start, else the piece they loosely name', () => {
  const names = PIECES.map(p => p.name)
  expect(completions(names, 'may')).toEqual(['mayerling i', 'mayerling ii', 'mayerling iii'])
  expect(completions(names, 'o')).toEqual(['on', 'off'])
  expect(completions(names, 'mmayer')).toEqual(['mayerling i'])
  expect(completions(names, 'xyz')).toEqual([])
  expect(completions(names, '')).toHaveLength(names.length + 5)
  expect(completions(names, 'prog')).toEqual(['programme'])
  expect(completions(names, 'li')).toEqual(['live'])
})

test('/ballet live and /ballet standard switch modes, and naming a piece goes back', async ($, on) => {
  const store: Record<string, unknown> = { next: 2 }
  storeOn(on, store)
  const run = async (args: string) => (await $.command.run({ ...TYPED, args })).text
  expect(await run('live')).toMatch(/^Live: Clawd dances on/)
  expect(store.mode).toBe('live')
  expect(await run('')).toMatch(/^Ballet off/)
  expect(await run('on')).toMatch(/dances live/)
  expect(await run('standard')).toBe('Standard: the ballets in turn. Next up, Swan Lake II.')
  expect(store.mode).toBe('standard')
  await run('live')
  expect(await run('giselle')).toBe('Next up: Giselle.')
  expect(store.mode).toBe('standard')
})

test('words that name no piece but come near a mode switch to it', async ($, on) => {
  expect(modeOf('standrd')).toBe('standard')
  expect(modeOf('repertoire')).toBe('standard')
  expect(modeOf('liev')).toBe('live')
  expect(modeOf('zzzz')).toBeUndefined()
  const store: Record<string, unknown> = { next: 2 }
  storeOn(on, store)
  const run = async (args: string) => (await $.command.run({ ...TYPED, args })).text
  expect(await run('liev')).toMatch(/^Live: Clawd dances on/)
  expect(store.mode).toBe('live')
  expect(await run('standrd')).toBe('Standard: the ballets in turn. Next up, Swan Lake II.')
  await run('live')
  // The old word still works.
  expect(await run('repertoire')).toMatch(/^Standard:/)
  expect(store.mode).toBe('standard')
  // A piece still wins: "gisele" is Giselle, not a mode.
  expect(await run('gisele')).toBe('Next up: Giselle.')
})

test('a reloaded plugin takes the band over: the old load stops painting it', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  storeOn(on, {})
  // The session's state, held here: this load's mark, until a later load
  // (a hot reload) writes its own.
  const marks: unknown[] = []
  on('state.set', (_$, e) => {
    marks.push(e.value)

    return { value: { isSet: true, version: marks.length } }
  })
  on('state.get', () => ({ value: { value: marks[marks.length - 1], version: marks.length } }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  let blits = 0
  on('ui.blit', (_$, e, next_) => {
    blits++

    return next_(e)
  })
  await $.session.start({ cwd: '/repo' } as never).catch(() => {})
  const ui = await $.ui.mount(band(true))
  await clock.advance(1000)
  expect(blits).toBeGreaterThan(0)
  marks.push('a later load')
  await clock.advance(100)
  const before = blits
  await clock.advance(1000)
  expect(blits).toBe(before)
  await ui.unmount()
})

// Row 0 of the band as text: where the live dancer's caption is.
const topRow = (cells: string, cols: number) => {
  const words = decode(cells)
  let row = ''
  for (let col = 0; col < cols; col++) row += String.fromCodePoint(words[col * 3] || 0x20)

  return row
}

test('live, each tool call fires a move labelled over Clawd, and passes through untouched', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  storeOn(on, { mode: 'live' })
  // The engine's answers: a file read, and tests that fail.
  on('tool.call', (_$, e) => (e.tool === 'Bash' ? { result: { stdout: '1 failed' }, isError: true } : { result: { file: 'ok' } }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })
  let ui = await $.ui.mount(band(true))
  expect(await ui.find({ key: 'ballet' })).toBeDefined()
  // Once the band has grown in and Clawd is on, a read.
  await clock.advance(2000)
  expect(await $.tool.call({ tool: 'Read', file_path: '/repo/hooks/live.ts' })).toMatchObject({ result: { file: 'ok' } })
  await clock.advance(500)
  await ui.unmount()
  ui = await $.ui.mount(band(true))
  const raster = await ui.find({ key: 'ballet' })
  expect(topRow(String(raster?.props.cells), Number(raster?.props.columns))).toContain('read live.ts')
  const failed = await $.tool.call({ tool: 'Bash', command: 'npm test' })
  expect(failed).toMatchObject({ isError: true, result: { stdout: '1 failed' } })
  await ui.unmount()
})

test('with the live label off, the moves carry no chip', { options: { label: 'off' } }, async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  storeOn(on, { mode: 'live' })
  on('tool.call', () => ({ result: { file: 'ok' } }))
  let ui = await $.ui.mount(band(true))
  await clock.advance(2000)
  await $.tool.call({ tool: 'Read', file_path: '/repo/hooks/live.ts' })
  await clock.advance(500)
  await ui.unmount()
  ui = await $.ui.mount(band(true))
  const raster = await ui.find({ key: 'ballet' })
  expect(topRow(String(raster?.props.cells), Number(raster?.props.columns))).not.toContain('read live.ts')
  await ui.unmount()
})

// The programme's pane, as the terminal seats it above the prompt.
const PROGRAMME_PANE = {
  plugin: 'ballet-clawd',
  surface: 'terminal' as const,
  component: 'Pane' as const,
  requestId: 'ballet-programme',
  props: { title: 'Ballet programme', isFocused: true, bodyColumns: 80, placement: 'inline' as const, scroll: { offset: 0, bodyRows: 12 }, view: {} },
}

test('/ballet programme opens the programme, a row a key: n lists the pieces to pick from', async ($, on) => {
  const store: Record<string, unknown> = { next: 0 }
  storeOn(on, store)
  const opened: string[] = []
  on('ui.open', (_$, e) => {
    opened.push(e.id)

    return { value: { isPlaced: true as const } }
  })
  const run = async (args: string) => (await $.command.run({ ...TYPED, args })).text
  expect(await run('programme')).toBe('The programme is open. Escape closes it.')
  expect(opened).toEqual(['ballet-programme'])
  expect(await run('settings')).toBe('The programme is open. Escape closes it.')
  // Typos too, as everywhere in /ballet; a piece's name still wins.
  expect(await run('progamme')).toBe('The programme is open. Escape closes it.')
  expect(await run('setings')).toBe('The programme is open. Escape closes it.')
  expect(await run('p')).toMatch(/^No piece called "p"/)
  expect(await run('manon')).toBe('Next up: Manon.')
  store.next = 0
  delete store.mode
  const ui = await $.ui.mount(PROGRAMME_PANE)
  expect((await ui.find({ key: 'order' }))?.props.hotkey).toBe('o')
  // n lists every piece, a letter each; a pick goes back to the rows.
  await ui.press({ key: 'next' })
  expect((await ui.find({ key: 'piece-15' }))?.props.hotkey).toBe('p')
  expect(await ui.find({ key: 'order' })).toBeUndefined()
  await ui.press({ key: 'piece-15' })
  expect(store.next).toBe(15)
  expect(await ui.find({ key: 'order' })).toBeDefined()
  // 0 goes back without a pick.
  await ui.press({ key: 'next' })
  await ui.press({ key: 'unpick' })
  expect(store.next).toBe(15)
  // Picking leaves the mode alone; m switches it.
  expect(store.mode).toBeUndefined()
  await ui.press({ key: 'mode' })
  expect(store.mode).toBe('live')
  await ui.unmount()
})

test('in turn the pieces follow the programme; shuffled, a ballet\'s acts stay in order', () => {
  const names = PIECES.map(p => p.name)
  expect(following(names, 1, false)).toBe(2)
  expect(following(names, names.length - 1, false)).toBe(0)
  // Swan Lake I goes on to its act II, whatever the dice say.
  expect(following(names, 1, true, () => 0.99)).toBe(2)
  // After Swan Lake IV, only the start of another ballet.
  for (let k = 0; k < 20; k++) {
    const next = split(names[following(names, 4, true, () => k / 20)]!)
    expect(next.act <= 1 && next.ballet !== 'swan lake').toBe(true)
  }
})

test('a blink of the band mid-turn picks up where it was; a new turn grows in', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  storeOn(on, { mode: 'live' })
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })
  let ui = await $.ui.mount(band(true))
  await clock.advance(3000)
  await ui.unmount()
  // A subagent's message lands: the band is gone for a moment.
  ui = await $.ui.mount(band(false))
  await ui.unmount()
  await clock.advance(200)
  ui = await $.ui.mount(band(true))
  expect(((await ui.find({ key: 'ballet' })) as { props: { rows: number } } | undefined)?.props.rows).toBe(9)
  await ui.unmount()
  // A turn ends, and a new one begins: the band grows in from a row.
  await $.turn.complete({ reason: 'answer' } as never).catch(() => {})
  ui = await $.ui.mount(band(false))
  await ui.unmount()
  await clock.advance(200)
  ui = await $.ui.mount(band(true))
  expect(((await ui.find({ key: 'ballet' })) as { props: { rows: number } } | undefined)?.props.rows).toBe(1)
  await ui.unmount()
})

test('each tool call has its move and label, read from the tool and its input', () => {
  expect(actOf('Read', { file_path: '/a/b/register.tsx' })).toEqual({ act: 'reading', move: 'read', label: 'read register.tsx' })
  expect(actOf('Grep', { pattern: 'stage(' })).toEqual({ act: 'searching', move: 'grep', label: 'grep' })
  expect(actOf('Edit', { file_path: 'x/live.ts' })).toEqual({ act: 'editing', move: 'edit', label: 'edit live.ts' })
  expect(actOf('Write', { file_path: 'x/new.md' }).move).toBe('write')
  expect(actOf('Bash', { command: 'npm test' })).toEqual({ act: 'testing', move: 'test', label: 'npm test' })
  expect(actOf('Bash', { command: 'npx tsc -p .' }).move).toBe('build')
  expect(actOf('Bash', { command: 'git log --oneline' })).toEqual({ act: 'git', move: 'git', label: 'git log' })
  expect(actOf('Bash', { command: 'git commit -m "x"' }).move).toBe('commit')
  expect(actOf('Bash', { command: 'node scripts/play.ts' })).toEqual({ act: 'running', move: 'run', label: 'node scripts' })
  expect(actOf('WebFetch', { url: 'https://example.com/a?b' })).toEqual({ act: 'web', move: 'web', label: 'fetch example.com' })
  expect(actOf('mcp__claude_ai_Gmail__search_threads', {})).toEqual({ act: 'mcp', move: 'mcp', label: 'claude ai Gmail' })
  expect(actOf('Agent', { description: 'Find the bug' })).toEqual({ act: 'agents', move: 'agent', label: 'agent' })
  expect(actOf('Read', { file_path: '/x/gardée.ts' }).label).toBe('read garde.ts')
})

test('shell commands have moves of their own, read past a cd', () => {
  const of = (command: string) => {
    const { act, move } = actOf('Bash', { command })

    return `${act}/${move}`
  }
  expect(of('cat package.json')).toBe('reading/cat')
  expect(of('grep -rn "test" hooks')).toBe('searching/grep')
  expect(of('rg -n stage hooks')).toBe('searching/rg')
  expect(of('cd "/a b/c" && ls -la')).toBe('searching/ls')
  expect(of('rm -rf dist')).toBe('editing/rm')
  expect(of('/bin/rm x')).toBe('editing/rm')
  expect(of('touch notes.md')).toBe('editing/mkdir')
  expect(of('sleep 5')).toBe('running/sleep')
  expect(of('pkill node')).toBe('running/kill')
  expect(of('ssh box uptime')).toBe('web/ssh')
  expect(of('curl -s https://x.y')).toBe('web/web')
  expect(of('cd repo && npm test')).toBe('testing/test')
})

test('git is read by its own words, and a VAR=value is never shown', () => {
  const of = (command: string) => {
    const { act, move } = actOf('Bash', { command })

    return `${act}/${move}`
  }
  // Tests or a build named in a message, a branch or a file are no test run.
  expect(of('git commit -m "Add tests for live"')).toBe('git/commit')
  expect(of('git add hooks/register.test.tsx')).toBe('git/git')
  expect(of('git checkout -b fix-build')).toBe('git/git')
  expect(of('gh pr create --title "fix tests"')).toBe('git/commit')
  expect(of('ls && git push')).toBe('searching/ls')
  expect(actOf('Bash', { command: 'API_KEY=sk-123 curl https://x.y' })).toEqual({ act: 'web', move: 'web', label: 'curl' })
  expect(actOf('Bash', { command: 'CI=1 FOO="a b" npm test' })).toEqual({ act: 'testing', move: 'test', label: 'npm test' })
})
