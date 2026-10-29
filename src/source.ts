import type { Value } from '@ffcafe/mojito-plugin-sdk'
import type { ViewBridge } from '@ffcafe/mojito-plugin-sdk/view'
import { hostFetch } from './transport'

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
export const isMojitoSource = (
  location: Pick<Location, 'protocol' | 'search'>,
) =>
  location.protocol === 'mojito-plugin:' ||
  new URLSearchParams(location.search).get('source') === 'mojito'

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
) {
  let pending: MatchaEnvelope[] | null = []
  let lastSequence = -1
  const deliver = (event: MatchaEnvelope) => {
    if (event.sequence <= lastSequence) return
    lastSequence = event.sequence
    receive(event)
  }
  const restore = async (reset: boolean, attempt = 0): Promise<void> => {
    const state = await bridge.snapshot('matcha.state')
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
  const subscription = bridge.subscribe('matcha.events', async (batch) => {
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
            setSourceStatus('error', '数据流存在缺口，恢复失败，请重新打开页面')
            throw error
          }
        } else deliver(event)
      }
    }
  })
  try {
    await subscription.ready
    await restore(false)
    return subscription
  } catch (error) {
    subscription.dispose()
    throw error
  }
}

export const mojitoSource =
  typeof window !== 'undefined' && isMojitoSource(window.location)
export interface ViewClock {
  source: string | null
  now: number | null
  paused: boolean
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
export function updateSourceData(value: Value) {
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
  source: mojitoSource ? 'Mojito' : 'ACT',
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
  for (const listener of statusListeners) listener()
}
export async function command(
  action: string,
  values: Record<string, Value> = {},
): Promise<Value> {
  if (!bridge) throw new Error('Mojito 数据源尚未连接')
  return bridge.command('matcha.command', { action, ...values })
}
export async function prepareSource() {
  if (!mojitoSource) return
  const { connectView } = await import('@ffcafe/mojito-plugin-sdk/view')
  const connection = await connectView()
  bridge = connection
  window.fetch = hostFetch(
    (url, signal) =>
      connection.command(
        'matcha.command',
        { action: 'http', url, options: { method: 'GET' } },
        { signal },
      ),
    window.fetch.bind(window),
  )
  document.documentElement.dataset.matchaView = bridge.identity.kind
  const touched = new Set<string>()
  const changes = bridge.subscribe('matcha.config', (batch) => {
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
    for (const item of batch.items) {
      updateSourceClock(item)
      updateSourceData(item)
    }
  })
  try {
    await Promise.all([changes.ready, clock.ready])
    await hydrateStorage(touched)
  } catch (error) {
    changes.dispose()
    clock.dispose()
    throw error
  }
  window.addEventListener(
    'pagehide',
    () => {
      changes.dispose()
      clock.dispose()
    },
    { once: true },
  )
}
export async function startMojito(
  receive: (event: MatchaEnvelope) => void,
  metadata?: (value: { language?: string; version?: string }) => void,
) {
  if (!bridge) throw new Error('Mojito 数据源尚未连接')
  const subscription = await subscribeMojito(bridge, receive, metadata)
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
    if (!mojitoSource) {
      const listener = (event: StorageEvent) => {
        if (event.storageArea === window.localStorage && event.key === key)
          callback(event.newValue)
      }
      window.addEventListener('storage', listener)
      return () => window.removeEventListener('storage', listener)
    }
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
    return mojitoSource
      ? (memory.get(key) ?? null)
      : window.localStorage.getItem(key)
  },
  setItem(key, value) {
    if (!mojitoSource) {
      window.localStorage.setItem(key, value)
      return
    }
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
    if (!mojitoSource) {
      window.localStorage.removeItem(key)
      return
    }
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

export async function request(
  url: string,
): Promise<{ body: Uint8Array; status: number }> {
  if (mojitoSource) {
    const result = await command('http', { url, options: { method: 'GET' } })
    if (
      !result ||
      typeof result !== 'object' ||
      !('body' in result) ||
      !(result.body instanceof Uint8Array) ||
      !('status' in result) ||
      typeof result.status !== 'number'
    )
      throw new Error('网络响应格式错误')
    return { body: result.body, status: result.status }
  }
  const result = await fetch(url)
  return {
    body: new Uint8Array(await result.arrayBuffer()),
    status: result.status,
  }
}
export async function requestJson<T>(url: string): Promise<T> {
  const response = await request(url)
  if (response.status < 200 || response.status >= 300)
    throw new Error(`请求失败：HTTP ${response.status}`)
  return JSON.parse(new TextDecoder().decode(response.body)) as T
}
export async function requestImage(url: string): Promise<ImageBitmap> {
  const response = await request(url)
  if (response.status !== 200)
    throw new Error(`图像请求失败：HTTP ${response.status}`)
  // Decode authorized bytes directly; no remote/blob/data URL is assigned to an image element.
  return createImageBitmap(new Blob([new Uint8Array(response.body)]))
}
