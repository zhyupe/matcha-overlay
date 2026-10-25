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
        protocol: 'mojito-plugin:', search: '',
        href: 'mojito-plugin://runtime/view?OVERLAY_WS=ws://localhost',
      },
      OverlayPluginApi: { ready: true, callHandler },
    })
    const adapter = await import('./ngld')
    adapter.startOverlayEvents()
    expect(WebSocket).not.toHaveBeenCalled()
    expect(callHandler).not.toHaveBeenCalled()
  })

  it('retains ACT API subscription, event cleanup and speech', async () => {
    const callHandler = vi.fn((input, callback) => callback?.('{"ok":true}'))
    const browser = {
      location: { protocol: 'https:', search: '', href: 'https://example.test/' },
      OverlayPluginApi: { ready: true, callHandler },
    }
    vi.stubGlobal('window', browser)
    const adapter = await import('./ngld')
    const listener = vi.fn()
    adapter.addOverlayListener('LogLine', listener)
    adapter.startOverlayEvents()
    expect(JSON.parse(callHandler.mock.calls[0][0])).toEqual({ call: 'subscribe', events: ['LogLine'] })
    adapter.dispatchOverlayEvent({ type: 'LogLine', line: ['test'] })
    expect(listener).toHaveBeenCalledOnce()
    adapter.removeOverlayListener('LogLine', listener)
    adapter.dispatchOverlayEvent({ type: 'LogLine', line: ['later'] })
    expect(listener).toHaveBeenCalledOnce()
    await expect(adapter.callOverlayHandler({ call: 'say', text: 'test' })).resolves.toEqual({ ok: true })
  })

  it('retains ACT WebSocket events and request responses', async () => {
    const listeners: Record<string, (event?: any) => void> = {}
    const send = vi.fn()
    vi.stubGlobal('WebSocket', class {
      send = send
      addEventListener(name: string, listener: (event?: any) => void) { listeners[name] = listener }
    })
    vi.stubGlobal('window', {
      location: { protocol: 'https:', search: '?OVERLAY_WS=ws://localhost:10501/ws', href: 'https://example.test/?OVERLAY_WS=ws://localhost:10501/ws' },
    })
    const adapter = await import('./ngld')
    const listener = vi.fn()
    adapter.addOverlayListener('LogLine', listener)
    adapter.startOverlayEvents()
    listeners.open()
    expect(JSON.parse(send.mock.calls[0][0])).toEqual({ call: 'subscribe', events: ['LogLine'] })
    listeners.message({ data: JSON.stringify({ type: 'LogLine', line: ['test'] }) })
    expect(listener).toHaveBeenCalledOnce()
    const response = adapter.callOverlayHandler({ call: 'say', text: 'test' })
    const request = JSON.parse(send.mock.calls[1][0])
    listeners.message({ data: JSON.stringify({ rseq: request.rseq, ok: true }) })
    await expect(response).resolves.toMatchObject({ ok: true })
  })
})
