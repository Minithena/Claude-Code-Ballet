import { test, expect, mock, type TestBody } from 'claude-code/testing'

import { PIECES } from './ballet'
import { completions } from './choose'

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
  expect(completions(names, '')).toHaveLength(names.length + 2)
})
