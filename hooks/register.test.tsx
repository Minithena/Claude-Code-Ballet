import { test, expect, mock } from 'claude-code/testing'

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
  // /ballet picked Mayerling's first act (piece 4).
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
