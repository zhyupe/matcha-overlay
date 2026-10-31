import type { BatchListener, Value } from '@ffcafe/mojito-plugin-sdk'
import type { ViewBridge } from '@ffcafe/mojito-plugin-sdk/view'
import { afterEach, expect, it, vi } from 'vitest'
import type { MapLibrary } from './types'

const connectView = vi.hoisted(() => vi.fn())
vi.mock('@ffcafe/mojito-plugin-sdk/view', () => ({ connectView }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  vi.clearAllMocks()
})
function fixture() {
  const listeners = new Map<string, BatchListener<Value>>()
  const disposers: ReturnType<typeof vi.fn>[] = []
  const originalFetch = vi.fn()
  vi.stubGlobal('window', {
    fetch: originalFetch,
    location: { protocol: 'mojito-plugin:', search: '' },
  })
  vi.stubGlobal('document', { documentElement: { dataset: {} } })
  const command = vi.fn(async (_channel: string, value: any) => {
    switch (value.action) {
      case 'config.get':
        return 'true'
      case 'map.icon':
        return `mojito-plugin://runtime/icon/${value.id}`
      case 'map.image':
        return `mojito-plugin://runtime/map/${value.id}`
      case 'map.get':
        return { rowId: 1, id: 's1f1/00', marker: 1, sizeFactor: 100 }
      case 'map.markers':
        return [{ icon: 60561, x: 1, y: 2 }]
      case 'http':
        return {
          body: new Uint8Array([1]),
          status: 200,
          headers: { 'content-type': 'image/png' },
        }
      default:
        return null
    }
  })
  const bridge = {
    identity: { kind: 'overlay' },
    command,
    snapshot: vi.fn(async () => ({
      language: 'ja',
      version: '2',
      sequence: 1,
      events: [
        { sequence: 1, type: 'Gearset', content: { slot: 1 }, timestamp: 123 },
      ],
    })),
    subscribe(channel: string, listener: BatchListener<Value>) {
      listeners.set(channel, listener)
      const dispose = vi.fn()
      disposers.push(dispose)
      return {
        ready: Promise.resolve(),
        closed: new Promise(() => {}),
        dispose,
      }
    },
  } as unknown as ViewBridge
  connectView.mockResolvedValue(bridge)
  const emit = async (channel: string, items: Value[]) =>
    listeners.get(channel)?.({ items } as never)
  return { bridge, command, originalFetch, disposers, emit }
}
it('provides state, storage, events, speech and authorized images through the Mojito interface', async () => {
  const f = fixture()
  const { adapter } = await import('./index')
  expect(connectView).not.toHaveBeenCalled()
  await adapter.prepare()
  expect(adapter.name).toBe('Mojito')
  expect(adapter.storage.getItem('config:app-minified')).toBe('true')
  const changed = vi.fn(),
    unsubscribe = adapter.storage.subscribe('config:app-minified', changed)
  await f.emit('matcha.config', [
    { key: 'overlay.config:app-minified', value: 'false' },
  ])
  expect(changed).toHaveBeenCalledWith('false')
  expect(adapter.storage.getItem('config:app-minified')).toBe('false')
  adapter.storage.setItem('config:app-minified', 'true')
  await Promise.resolve()
  await Promise.resolve()
  expect(f.command).toHaveBeenCalledWith(
    'matcha.command',
    { action: 'config.set', key: 'overlay.config:app-minified', value: 'true' },
    expect.anything(),
  )
  const receive = vi.fn(),
    stop = await adapter.subscribeEvents(receive)
  expect(receive).toHaveBeenCalledWith({
    time: new Date(123),
    type: 'Gearset',
    version: 'Mojito',
    content: { slot: 1 },
  })
  expect(adapter.getState()).toMatchObject({
    language: 'ja',
    version: '2',
    status: 'connected',
  })
  await f.emit('matcha.status', [
    {
      mapDataGeneration: 2,
      session: { clock: { source: 'replay', now: 456, paused: true } },
    },
  ])
  expect(adapter.getState()).toMatchObject({
    mapGeneration: 2,
    clock: { source: 'replay', now: 456, paused: true },
  })
  await adapter.speak('test')
  expect(f.command).toHaveBeenCalledWith(
    'matcha.command',
    { action: 'say', text: 'test' },
    expect.anything(),
  )
  const image = await adapter.resolveImage('https://example.test/image.png')
  expect(image.url.startsWith('blob:')).toBe(true)
  expect(await (await fetch(image.url)).arrayBuffer()).toEqual(
    new Uint8Array([1]).buffer,
  )
  image.dispose()
  await expect(fetch(image.url)).rejects.toThrow()
  expect((await adapter.resolveImage('data:image/png;base64,AA==')).url).toBe(
    'data:image/png;base64,AA==',
  )
  stop()
  unsubscribe()
  adapter.dispose()
  expect(window.fetch).toBe(f.originalFetch)
  for (const dispose of f.disposers) expect(dispose).toHaveBeenCalled()
  const before = receive.mock.calls.length
  await f.emit('matcha.events', [
    { sequence: 2, type: 'Gearset', content: null, timestamp: 200 },
  ])
  expect(receive).toHaveBeenCalledTimes(before)
})
it('keeps map resolvers synchronous after async preparation and clears them on disposal', async () => {
  fixture()
  const { adapter } = await import('./mojito')
  await adapter.prepare()
  const library = {
    setDataProvider: vi.fn(),
    setMapUrlResolver: vi.fn(),
    setIconUrlResolver: vi.fn(),
  }
  const session = await adapter.createMapSession(
    library as unknown as MapLibrary,
  )
  const provider = library.setDataProvider.mock.calls[0][0]
  const mapUrl = library.setMapUrlResolver.mock.calls[0][0]
  const iconUrl = library.setIconUrlResolver.mock.calls[0][0]
  const map = await provider.getMap(1)
  await provider.getMapMarkers(map)
  await session.prepareIcons([123])
  expect(mapUrl('s1f1/00')).toBe('mojito-plugin://runtime/map/s1f1/00')
  expect(iconUrl(123)).toBe('mojito-plugin://runtime/icon/123')
  session.dispose()
  expect(library.setDataProvider).toHaveBeenLastCalledWith()
  expect(library.setMapUrlResolver).toHaveBeenLastCalledWith()
  expect(library.setIconUrlResolver).toHaveBeenLastCalledWith()
  await expect(provider.getMap(1)).rejects.toThrow('closed')
  adapter.dispose()
})
it('discards an initial snapshot arriving after adapter disposal', async () => {
  const f = fixture()
  let finish!: (value: Value) => void
  vi.mocked(f.bridge.snapshot).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const { adapter } = await import('./mojito')
  await adapter.prepare()
  const receive = vi.fn()
  const pending = adapter.subscribeEvents(receive)
  await Promise.resolve()
  await Promise.resolve()
  adapter.dispose()
  finish({ events: [], language: 'de' })
  await expect(pending).rejects.toThrow()
  expect(receive).not.toHaveBeenCalled()
  expect(adapter.getState().language).toBe('chs')
  expect(f.disposers.at(-1)).toHaveBeenCalled()
})
