import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

// Resolve the extensionless imports used by the Vite source when running in Node.
const configUrl = new URL('../src/lib/config.ts', import.meta.url).href
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === configUrl && specifier.startsWith('./')) {
      return nextResolve(`${specifier}.ts`, context)
    }
    return nextResolve(specifier, context)
  },
})

const stored = new Map()
globalThis.window = {
  location: { hostname: 'config-test' },
  localStorage: {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, String(value)),
    removeItem: (key) => stored.delete(key),
  },
}

const { getConfig, getConfigWithInit, setConfig, useConfig, useConfigBoolean } =
  await import(configUrl)

function readHook(hook) {
  let result
  function Probe() {
    result = hook()
    return null
  }
  renderToString(createElement(Probe))
  return result
}

test('existing persisted values are available on the first render', () => {
  for (const [key, value, fallback] of [
    ['boolean', false, true],
    ['number', 0, 10],
    ['string', '', 'fallback'],
    ['object', { ship: ['A', 'B'] }, {}],
  ]) {
    stored.set(`config:${key}`, JSON.stringify(value))
    assert.deepEqual(getConfig(key, fallback), value)
    assert.deepEqual(readHook(() => useConfig(key, fallback))[0], value)
    assert.deepEqual(
      getConfigWithInit(key, () => assert.fail('must not initialize')),
      value,
    )
  }
})

test('hook updates share state and persist functional updates', () => {
  const [, setValue] = readHook(() => useConfig('counter', 0))
  setValue((previous) => previous + 1)
  setValue((previous) => previous + 1)
  assert.equal(readHook(() => useConfig('counter', 99))[0], 2)
  assert.equal(getConfig('counter'), 2)

  setConfig('counter', 7)
  assert.equal(readHook(() => useConfig('counter'))[0], 7)
  assert.equal(stored.get('config:counter'), '7')
})

test('imperative initialization is shared with hooks', () => {
  setConfig('initialized', { enabled: true })
  assert.deepEqual(readHook(() => useConfig('initialized'))[0], {
    enabled: true,
  })
  assert.equal(
    getConfigWithInit('generated', () => 42),
    42,
  )
  assert.equal(readHook(() => useConfig('generated'))[0], 42)
})

test('undefined removes persisted values and invalid JSON uses the default', () => {
  const [, setValue] = readHook(() => useConfig('optional'))
  setValue('value')
  setValue(undefined)
  assert.equal(stored.has('config:optional'), false)
  assert.equal(readHook(() => useConfig('optional'))[0], undefined)

  stored.set('config:invalid', '{broken')
  assert.equal(readHook(() => useConfig('invalid', 'fallback'))[0], 'fallback')
})

test('boolean toggles use the latest state even before another render', () => {
  const [, actions] = readHook(() => useConfigBoolean('toggle'))
  actions.toggle()
  actions.toggle()
  assert.equal(readHook(() => useConfigBoolean('toggle'))[0], false)
  actions.setTrue()
  assert.equal(getConfig('toggle'), true)
  actions.setFalse()
  assert.equal(getConfig('toggle'), false)
})
