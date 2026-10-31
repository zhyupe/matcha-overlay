import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('overlay transport selection', () => {
  it('does not start ACT transport for a Mojito view', async () => {
    const callHandler = vi.fn()
    const WebSocket = vi.fn()
    vi.stubGlobal('WebSocket', WebSocket)
    vi.stubGlobal('window', {
      location: {
        protocol: 'mojito-plugin:',
        search: '',
        href: 'mojito-plugin://runtime/view?OVERLAY_WS=ws://localhost',
      },
      OverlayPluginApi: { ready: true, callHandler },
    })
    await import('./index')
    expect(WebSocket).not.toHaveBeenCalled()
    expect(callHandler).not.toHaveBeenCalled()
  })

  it('retains ACT API subscription, event cleanup and speech', async () => {
    const callHandler = vi.fn((_input, callback) => callback?.('{"ok":true}'))
    const browser = {
      location: {
        protocol: 'https:',
        search: '',
        href: 'https://example.test/',
      },
      OverlayPluginApi: { ready: true, callHandler },
    }
    vi.stubGlobal('window', browser)
    const adapter = await import('./act')
    await adapter.adapter.prepare()
    const listener = vi.fn()
    adapter.addOverlayListener('LogLine', listener)
    adapter.startOverlayEvents()
    expect(JSON.parse(callHandler.mock.calls[0][0])).toEqual({
      call: 'subscribe',
      events: ['LogLine'],
    })
    adapter.dispatchOverlayEvent({ type: 'LogLine', line: ['test'] })
    expect(listener).toHaveBeenCalledOnce()
    adapter.removeOverlayListener('LogLine', listener)
    adapter.dispatchOverlayEvent({ type: 'LogLine', line: ['later'] })
    expect(listener).toHaveBeenCalledOnce()
    await expect(
      adapter.callOverlayHandler({ call: 'say', text: 'test' }),
    ).resolves.toEqual({ ok: true })
  })

  it('retains ACT WebSocket events and request responses', async () => {
    const listeners: Record<string, (event?: any) => void> = {}
    const send = vi.fn()
    vi.stubGlobal(
      'WebSocket',
      class {
        send = send
        addEventListener(name: string, listener: (event?: any) => void) {
          listeners[name] = listener
        }
      },
    )
    vi.stubGlobal('window', {
      location: {
        protocol: 'https:',
        search: '?OVERLAY_WS=ws://localhost:10501/ws',
        href: 'https://example.test/?OVERLAY_WS=ws://localhost:10501/ws',
      },
    })
    const adapter = await import('./act')
    await adapter.adapter.prepare()
    const listener = vi.fn()
    adapter.addOverlayListener('LogLine', listener)
    adapter.startOverlayEvents()
    listeners.open()
    expect(JSON.parse(send.mock.calls[0][0])).toEqual({
      call: 'subscribe',
      events: ['LogLine'],
    })
    listeners.message({
      data: JSON.stringify({ type: 'LogLine', line: ['test'] }),
    })
    expect(listener).toHaveBeenCalledOnce()
    const response = adapter.callOverlayHandler({ call: 'say', text: 'test' })
    const request = JSON.parse(send.mock.calls[1][0])
    listeners.message({
      data: JSON.stringify({ rseq: request.rseq, ok: true }),
    })
    await expect(response).resolves.toMatchObject({ ok: true })
  })
})

it('normalizes ACT logs, metadata and storage through the shared interface', async () => {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
  }
  const events = new Map<string, (event: any) => void>()
  const browser = {
    location: {
      protocol: 'https:',
      search: '',
      href: 'https://example.test/',
      hostname: 'example.test',
    },
    localStorage: storage,
    addEventListener: (name: string, listener: (event: any) => void) =>
      events.set(name, listener),
    removeEventListener: vi.fn(),
    OverlayPluginApi: {
      ready: true,
      callHandler: vi.fn((_input, callback) => callback?.('{}')),
    },
  }
  vi.stubGlobal('window', browser)
  const { adapter } = await import('./index')
  expect(browser.OverlayPluginApi.callHandler).not.toHaveBeenCalled()
  await adapter.prepare()
  const receive = vi.fn(),
    stop = await adapter.subscribeEvents(receive)
  const dispatch = (
    browser as typeof browser & { __OverlayCallback: (value: unknown) => void }
  ).__OverlayCallback
  dispatch({
    type: 'LogLine',
    line: [
      '00',
      '2026-10-31T00:00:00Z',
      '',
      'Matcha#3.6#ja-Gearset',
      '{"slot":1}',
    ],
  })
  expect(receive).toHaveBeenCalledWith({
    time: new Date('2026-10-31T00:00:00Z'),
    type: 'Gearset',
    version: '3.6',
    content: { slot: 1 },
  })
  expect(adapter.getState()).toMatchObject({
    status: 'connected',
    version: '3.6',
    language: 'ja',
    clock: null,
  })
  adapter.storage.setItem('test', 'one')
  expect(adapter.storage.getItem('test')).toBe('one')
  const changed = vi.fn(),
    off = adapter.storage.subscribe('test', changed)
  events.get('storage')?.({
    storageArea: storage,
    key: 'test',
    newValue: 'two',
  })
  expect(changed).toHaveBeenCalledWith('two')
  off()
  expect(browser.removeEventListener).toHaveBeenCalled()
  expect((await adapter.resolveImage('https://example.test/image')).url).toBe(
    'https://example.test/image',
  )
  stop()
  dispatch({
    type: 'LogLine',
    line: ['00', '2026-10-31T00:00:00Z', '', 'Matcha#3.6#ja-Gearset', '{}'],
  })
  expect(receive).toHaveBeenCalledOnce()
  adapter.dispose()
})
it('reconnects the ACT socket with subscriptions and stops retrying after disposal', async () => {
  vi.useFakeTimers()
  try {
    const sockets: {
      listeners: Record<string, (event?: any) => void>
      send: ReturnType<typeof vi.fn>
      close: ReturnType<typeof vi.fn>
    }[] = []
    vi.stubGlobal(
      'WebSocket',
      class {
        listeners: Record<string, (event?: any) => void> = {}
        send = vi.fn()
        close = vi.fn(() => this.listeners.close?.())
        constructor(public url: string) {
          sockets.push(this)
        }
        addEventListener(name: string, listener: (event?: any) => void) {
          this.listeners[name] = listener
        }
      },
    )
    vi.stubGlobal('window', {
      location: {
        protocol: 'https:',
        search: '?OVERLAY_WS=ws://localhost/ws',
        href: 'https://example.test/?OVERLAY_WS=ws://localhost/ws',
      },
    })
    const { adapter } = await import('./index')
    await adapter.prepare()
    const receive = vi.fn()
    await adapter.subscribeEvents(receive)
    sockets[0].listeners.open()
    sockets[0].listeners.close()
    await vi.advanceTimersByTimeAsync(300)
    sockets[1].listeners.open()
    expect(JSON.parse(sockets[1].send.mock.calls[0][0])).toEqual({
      call: 'subscribe',
      events: ['LogLine'],
    })
    const speech = adapter.speak('pending').catch((error) => error)
    adapter.dispose()
    expect(await speech).toBeInstanceOf(Error)
    expect(sockets[1].close).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(1000)
    expect(sockets).toHaveLength(2)
  } finally {
    vi.useRealTimers()
  }
})
