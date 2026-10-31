import type { Value } from '@ffcafe/mojito-plugin-sdk'
import type { ViewBridge } from '@ffcafe/mojito-plugin-sdk/view'
import type { MapDataProvider } from '@thewakingsands/eorzea-interactive-map'
import { imageUrls } from '../lib/image-urls'
import type { AdapterState, OverlayAdapter, ViewClock } from './types'

interface DataSourceInfo {
  revision: string
  language: string
  build: string | null
}

export interface MatchaEnvelope {
  sequence: number
  type: string
  content: Value
  timestamp: number
}
export interface SourceStatus {
  source: 'ACT' | 'Mojito'
  state: 'connecting' | 'connected' | 'error'
  message: string
}
export function envelope(value: unknown): MatchaEnvelope | null {
  if (!value || typeof value !== 'object') return null
  const item = value as MatchaEnvelope
  return Number.isSafeInteger(item.sequence) &&
    item.sequence >= 0 &&
    typeof item.type === 'string' &&
    item.type.length > 0 &&
    Number.isFinite(item.timestamp) &&
    'content' in item
    ? item
    : null
}

/** Subscribe first; retain live arrivals until the initial snapshot has been applied. */
export async function subscribeMojito(
  bridge: ViewBridge,
  receive: (event: MatchaEnvelope) => void,
  metadata?: (value: { language?: string; version?: string }) => void,
  signal?: AbortSignal,
) {
  let active = true
  let pending: MatchaEnvelope[] | null = []
  let lastSequence = -1
  const deliver = (event: MatchaEnvelope) => {
    if (!active || signal?.aborted || event.sequence <= lastSequence) return
    lastSequence = event.sequence
    receive(event)
  }
  const restore = async (reset: boolean, attempt = 0): Promise<void> => {
    const state = await bridge.snapshot('matcha.state', { signal })
    signal?.throwIfAborted()
    if (!active) return
    if (
      !state ||
      typeof state !== 'object' ||
      !('events' in state) ||
      !Array.isArray(state.events)
    )
      throw new Error('数据源快照无效')
    if (reset)
      receive({
        sequence: lastSequence,
        type: 'Reset',
        content: null,
        timestamp: Date.now(),
      })
    lastSequence = -1
    updateSourceClock(state)
    updateSourceData(state)
    metadata?.({
      language:
        'language' in state && typeof state.language === 'string'
          ? state.language
          : undefined,
      version:
        'version' in state && typeof state.version === 'string'
          ? state.version
          : undefined,
    })
    const events = state.events
      .map(envelope)
      .filter((item): item is MatchaEnvelope => item !== null)
    for (const event of events.sort((a, b) => a.sequence - b.sequence))
      deliver(event)
    // Deleted/evicted state (for example a finished FATE) has no retained event.
    // Its sequence still belongs to the snapshot and must not look like packet loss.
    if (
      'sequence' in state &&
      typeof state.sequence === 'number' &&
      Number.isSafeInteger(state.sequence)
    )
      lastSequence = Math.max(lastSequence, state.sequence)
    const queued = pending ?? []
    pending = null
    queued.sort((a, b) => a.sequence - b.sequence)
    for (let index = 0; index < queued.length; index++) {
      const event = queued[index]
      if (lastSequence >= 0 && event.sequence > lastSequence + 1) {
        if (attempt >= 2) throw new Error('数据源快照未能恢复事件缺口')
        pending = queued.slice(index)
        await restore(true, attempt + 1)
        return
      }
      deliver(event)
    }
  }
  const subscription = bridge.subscribe(
    'matcha.events',
    async (batch) => {
      if (!active || signal?.aborted) return
      for (const value of batch.items) {
        const event = envelope(value)
        if (event) {
          if (pending) {
            if (pending.length >= 8192)
              throw new Error('数据源初始化积压过多，请重新打开页面')
            pending.push(event)
          } else if (lastSequence >= 0 && event.sequence > lastSequence + 1) {
            pending = [event]
            try {
              await restore(true)
            } catch (error) {
              setSourceStatus(
                'error',
                '数据流存在缺口，恢复失败，请重新打开页面',
              )
              throw error
            }
          } else deliver(event)
        }
      }
    },
    { signal },
  )
  try {
    await subscription.ready
    await restore(false)
    signal?.throwIfAborted()
    return {
      ...subscription,
      dispose() {
        active = false
        subscription.dispose()
      },
    }
  } catch (error) {
    subscription.dispose()
    throw error
  }
}

let sourceClock: ViewClock = { source: null, now: null, paused: false }
export const getSourceClock = () => sourceClock
function updateSourceClock(value: Value) {
  if (!value || typeof value !== 'object' || !('session' in value)) return
  const session = value.session
  if (!session || typeof session !== 'object' || !('clock' in session)) return
  const clock = session.clock
  if (
    !clock ||
    typeof clock !== 'object' ||
    !('now' in clock) ||
    !('source' in clock) ||
    !('paused' in clock)
  )
    return
  sourceClock = {
    source: typeof clock.source === 'string' ? clock.source : null,
    now:
      typeof clock.now === 'number' && Number.isFinite(clock.now)
        ? clock.now
        : null,
    paused: clock.paused === true,
  }
  updateState({ clock: sourceClock })
}
let bridge: ViewBridge | undefined
let itemDataSource: DataSourceInfo | null = null
const itemDataListeners = new Set<() => void>()
export const getItemDataSource = () => itemDataSource
export function watchItemDataSource(listener: () => void) {
  itemDataListeners.add(listener)
  return () => {
    itemDataListeners.delete(listener)
  }
}
function setItemDataSource(next: DataSourceInfo | null) {
  if (JSON.stringify(next) === JSON.stringify(itemDataSource)) return
  itemDataSource = next
  for (const listener of itemDataListeners) listener()
}
let mapDataGeneration = 0
const mapDataListeners = new Set<() => void>()
export const getMapDataGeneration = () => mapDataGeneration
export function watchMapDataGeneration(listener: () => void) {
  mapDataListeners.add(listener)
  return () => {
    mapDataListeners.delete(listener)
  }
}
export function updateSourceData(value: Value) {
  if (
    value &&
    typeof value === 'object' &&
    'mapDataGeneration' in value &&
    typeof value.mapDataGeneration === 'number' &&
    value.mapDataGeneration !== mapDataGeneration
  ) {
    mapDataGeneration = value.mapDataGeneration
    updateState({ mapGeneration: mapDataGeneration })
    for (const listener of mapDataListeners) listener()
  }
  if (!value || typeof value !== 'object' || !('dataSourceInfo' in value))
    return
  const info = value.dataSourceInfo
  setItemDataSource(
    info &&
      typeof info === 'object' &&
      'revision' in info &&
      typeof info.revision === 'string' &&
      'language' in info &&
      typeof info.language === 'string' &&
      'build' in info &&
      (info.build === null || typeof info.build === 'string')
      ? { revision: info.revision, language: info.language, build: info.build }
      : null,
  )
}
let status: SourceStatus = {
  source: 'Mojito',
  state: 'connecting',
  message: '等待数据源',
}
const statusListeners = new Set<() => void>()
export const getSourceStatus = () => status
export function watchSourceStatus(listener: () => void) {
  statusListeners.add(listener)
  return () => {
    statusListeners.delete(listener)
  }
}
export function setSourceStatus(state: SourceStatus['state'], message: string) {
  status = { ...status, state, message }
  updateState({ status: state, message })
  for (const listener of statusListeners) listener()
}
async function command(
  action: string,
  values: Record<string, Value> = {},
): Promise<Value> {
  if (!bridge) throw new Error('Mojito 数据源尚未连接')
  return bridge.command(
    'matcha.command',
    { action, ...values },
    { signal: lifetime.signal },
  )
}
export async function prepareSource() {
  if (bridge) return
  if (lifetime.signal.aborted) lifetime = new AbortController()
  const signal = lifetime.signal
  const { connectView } = await import('@ffcafe/mojito-plugin-sdk/view')
  const connection = await connectView()
  signal.throwIfAborted()
  bridge = connection
  originalFetch = window.fetch
  window.fetch = hostFetch(
    (url, signal) =>
      connection.command(
        'matcha.command',
        { action: 'http', url, options: { method: 'GET' } },
        { signal: AbortSignal.any([signal, lifetime.signal]) },
      ),
    window.fetch.bind(window),
  )
  document.documentElement.dataset.matchaView = bridge.identity.kind
  const touched = new Set<string>()
  const changes = bridge.subscribe('matcha.config', (batch) => {
    if (signal.aborted) return
    for (const item of batch.items) {
      if (
        !item ||
        typeof item !== 'object' ||
        !('key' in item) ||
        typeof item.key !== 'string' ||
        !item.key.startsWith('overlay.') ||
        !('value' in item) ||
        (item.value !== null && typeof item.value !== 'string')
      )
        continue
      const key = item.key.slice('overlay.'.length)
      if (!keys.includes(key)) continue
      touched.add(key)
      if ((memory.get(key) ?? null) === item.value) continue
      if (item.value === null) memory.delete(key)
      else memory.set(key, item.value)
      for (const listener of storageListeners.get(key) ?? [])
        listener(item.value)
    }
  })
  const clock = bridge.subscribe('matcha.status', (batch) => {
    if (signal.aborted) return
    for (const item of batch.items) {
      updateSourceClock(item)
      updateSourceData(item)
    }
  })
  cleanupConnection = () => {
    changes.dispose()
    clock.dispose()
    if (originalFetch) window.fetch = originalFetch
    bridge = undefined
  }
  try {
    await Promise.all([changes.ready, clock.ready])
    await hydrateStorage(touched)
    signal.throwIfAborted()
  } catch (error) {
    changes.dispose()
    clock.dispose()
    if (originalFetch) window.fetch = originalFetch
    bridge = undefined
    throw error
  }
}
export async function startMojito(
  receive: (event: MatchaEnvelope) => void,
  metadata?: (value: { language?: string; version?: string }) => void,
) {
  if (!bridge) throw new Error('Mojito 数据源尚未连接')
  const subscription = await subscribeMojito(
    bridge,
    receive,
    metadata,
    lifetime.signal,
  )
  let disposed = false
  setSourceStatus('connected', 'Mojito 已连接')
  void subscription.closed.then(({ reason }) => {
    if (!disposed) {
      setItemDataSource(null)
      setSourceStatus('error', `数据源已停止：${reason}`)
    }
  })
  return () => {
    disposed = true
    subscription.dispose()
  }
}

const keys = [
  'config:app-minified',
  'config:market-transpose',
  'config:market-hq-only',
  'config:submarine-spot',
  'force-april-style',
  'gearset-item',
  'gearset-item:ver',
  'matcha-fishing-v1',
]
const memory = new Map<string, string>()
const storageListeners = new Map<string, Set<(value: string | null) => void>>()
let writes = Promise.resolve()
async function hydrateStorage(touched: Set<string>) {
  await Promise.all(
    keys.map(async (key) => {
      const value = await command('config.get', { key: `overlay.${key}` })
      if (!touched.has(key) && typeof value === 'string') memory.set(key, value)
    }),
  )
}
export const sourceStorage: Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
> & {
  subscribe(key: string, callback: (value: string | null) => void): () => void
} = {
  subscribe(key, callback) {
    let listeners = storageListeners.get(key)
    if (!listeners) {
      listeners = new Set()
      storageListeners.set(key, listeners)
    }
    listeners.add(callback)
    return () => {
      listeners.delete(callback)
    }
  },
  getItem(key) {
    return memory.get(key) ?? null
  },
  setItem(key, value) {
    memory.set(key, value)
    writes = writes
      .then(async () => {
        await command('config.set', { key: `overlay.${key}`, value })
      })
      .catch((error: unknown) =>
        setSourceStatus(
          'error',
          `保存失败：${error instanceof Error ? error.message : String(error)}`,
        ),
      )
  },
  removeItem(key) {
    memory.delete(key)
    writes = writes
      .then(async () => {
        await command('config.set', { key: `overlay.${key}`, value: null })
      })
      .catch((error: unknown) =>
        setSourceStatus('error', `保存失败：${String(error)}`),
      )
  },
}

let lifetime = new AbortController()
let originalFetch: typeof fetch | undefined
let cleanupConnection = () => {}
const cleanups = new Set<() => void>()
let state: AdapterState = {
  status: 'connecting',
  message: '等待数据源',
  language: 'chs',
  clock: null,
  mapGeneration: 0,
  unsupportedActWebSocket: false,
}
const listeners = new Set<() => void>()
function updateState(value: Partial<AdapterState>) {
  if (
    Object.entries(value).every(
      ([key, next]) => state[key as keyof AdapterState] === next,
    )
  )
    return
  state = { ...state, ...value }
  for (const listener of listeners) listener()
}
export const adapter: OverlayAdapter = {
  name: 'Mojito',
  prepare: prepareSource,
  dispose() {
    lifetime.abort()
    for (const dispose of cleanups) dispose()
    cleanups.clear()
    cleanupConnection()
  },
  async subscribeEvents(receive) {
    const stop = await startMojito(
      (event) =>
        receive({
          time: new Date(event.timestamp),
          type: event.type,
          version: 'Mojito',
          content: event.content,
        }),
      (metadata) =>
        updateState({
          version: metadata.version || 'Mojito',
          language: metadata.language || 'chs',
        }),
    )
    const dispose = () => {
      stop()
      cleanups.delete(dispose)
    }
    cleanups.add(dispose)
    return dispose
  },
  getState: () => state,
  subscribeState(listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  storage: sourceStorage,
  async speak(text) {
    try {
      await command('say', { text })
    } catch (error) {
      setSourceStatus('error', String(error))
      throw error
    }
  },
  fetch(url, options) {
    if (!bridge) return Promise.reject(new Error('Mojito 数据源尚未连接'))
    return window.fetch(url, options)
  },
  async resolveImage(url) {
    const images = imageUrls(adapter.fetch)
    const dispose = () => {
      images.dispose()
      cleanups.delete(dispose)
    }
    cleanups.add(dispose)
    try {
      const resolved = await images.load(url)
      lifetime.signal.throwIfAborted()
      return { url: resolved, dispose }
    } catch (error) {
      dispose()
      throw error
    }
  },
  async createMapSession(library) {
    const source = mapDataProvider()
    library.setDataProvider(source.provider)
    library.setMapUrlResolver(source.mapUrl)
    library.setIconUrlResolver(source.iconUrl)
    let disposed = false
    const dispose = () => {
      if (disposed) return
      disposed = true
      source.dispose()
      library.setDataProvider()
      library.setMapUrlResolver()
      library.setIconUrlResolver()
      cleanups.delete(dispose)
    }
    cleanups.add(dispose)
    try {
      await source.loadIcons([60561])
    } catch (error) {
      dispose()
      throw error
    }
    return { prepareIcons: source.loadIcons, dispose }
  },
}

export function hostFetch(
  invoke: (url: string, signal: AbortSignal) => Promise<Value>,
  fallback: typeof fetch,
): typeof fetch {
  const slots = Array.from({ length: 4 }, () => Promise.resolve())
  let next = 0
  return async (input, options) => {
    const request = new Request(input, options)
    if (new URL(request.url).protocol !== 'https:')
      return fallback(input, options)
    if (request.method !== 'GET')
      throw new Error('Only read-only resource requests are supported')
    const slot = next++ % slots.length
    const result = slots[slot].then(async () => {
      request.signal.throwIfAborted()
      const value = await invoke(request.url, request.signal)
      if (
        !value ||
        typeof value !== 'object' ||
        !('body' in value) ||
        !(value.body instanceof Uint8Array) ||
        !('status' in value) ||
        typeof value.status !== 'number'
      )
        throw new Error('Invalid resource response')
      const headers =
        'headers' in value && value.headers && typeof value.headers === 'object'
          ? (value.headers as Record<string, string>)
          : {}
      return new Response(new Uint8Array(value.body), {
        status: value.status,
        headers,
      })
    })
    slots[slot] = result.then(
      () => {},
      () => {},
    )
    return result
  }
}

export function mapDataProvider(invoke: typeof command = command) {
  let disposed = false
  const request = async <T>(
    action: string,
    value?: Record<string, Value>,
  ): Promise<T> => {
    if (disposed) throw new Error('Map data source closed')
    try {
      const result = await invoke(action, value)
      if (disposed) throw new Error('Map data source closed')
      return result as T
    } catch (error) {
      if (!disposed)
        setSourceStatus(
          'error',
          String(error).includes('permission_denied')
            ? '地图需要游戏资料读取权限'
            : '当前客户端地图资料不可用',
        )
      throw error
    }
  }
  const maps = new Map<string, string>()
  const icons = new Map<number, string | null>()
  const loadIcons = async (ids: number[]) => {
    for (const id of new Set(ids)) {
      if (!icons.has(id))
        icons.set(id, await request<string | null>('map.icon', { id }))
    }
  }
  const provider: MapDataProvider = {
    getRegion: () => request('map.regions'),
    getMap: async (rowId) => {
      const map = await request<Awaited<ReturnType<MapDataProvider['getMap']>>>(
        'map.get',
        { rowId },
      )
      const url = await request<string | null>('map.image', { id: map.id })
      if (!url) throw new Error('当前客户端地图图片不存在')
      maps.set(map.id, url)
      return map
    },
    getMapKeyById: (id) => request('map.key', { id }),
    getMapMarkers: async (map) => {
      const markers = await request<
        Awaited<ReturnType<MapDataProvider['getMapMarkers']>>
      >('map.markers', { rowId: map.rowId })
      await loadIcons(
        markers.flatMap((marker) => (marker.icon ? [marker.icon] : [])),
      )
      return markers
    },
  }
  return {
    provider,
    loadIcons,
    mapUrl(id: string) {
      const url = maps.get(id)
      if (!url) throw new Error('地图图片尚未加载')
      return url
    },
    iconUrl: (id: number) => icons.get(id) ?? null,
    dispose: () => {
      disposed = true
    },
  }
}
