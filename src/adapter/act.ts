import type { MatchaEvent } from '../app/interface'
import { tryParseJson } from '../lib/json'
import type { AdapterState, OverlayAdapter } from './types'

export interface NgldMessage {
  [x: string]: any
}
type NgldSubscriber<T extends NgldMessage = NgldMessage> = (message: T) => void

let queue: Array<{
  message: NgldMessage
  callback?: NgldSubscriber<any>
}> | null = []
let rseqCounter = 0
const responsePromises: Record<string, NgldSubscriber<any> | undefined> = {}
const subscribers: Record<string, NgldSubscriber<any>[] | undefined> = {}
let eventsStarted = false

let stopped = true
let timer: ReturnType<typeof setTimeout> | undefined
let socket: WebSocket | undefined
let sendMessage: (message: NgldMessage, callback?: NgldSubscriber) => void =
  () => {
    throw new Error('ACT adapter is not prepared')
  }
function connect() {
  const wsUrl = /[?&]OVERLAY_WS=([^&]+)/.exec(window.location.href)

  if (wsUrl) {
    let ws: WebSocket
    const sendMessage = (
      message: NgldMessage,
      callback?: NgldSubscriber<any>,
    ) => {
      if (queue) {
        queue.push({ message, callback })
        return
      }

      if (callback) {
        const rseq = ++rseqCounter

        message.rseq = rseq
        responsePromises[rseq] = callback
      }

      ws.send(JSON.stringify(message))
    }

    const connectWs = () => {
      if (stopped) return
      ws = new WebSocket(decodeURIComponent(wsUrl[1]))
      socket = ws

      ws.addEventListener('error', (e) => {
        console.error(e)
      })

      ws.addEventListener('open', () => {
        if (stopped) return
        if (!queue) return

        const q = queue
        queue = null

        for (const { message, callback } of q) {
          sendMessage(message, callback)
        }
      })

      ws.addEventListener('message', (msg) => {
        if (stopped) return
        const data = tryParseJson<NgldMessage>(msg.data)
        if (!data) {
          console.error('Invalid message received: ', msg)
          return
        }

        const rseq = data.rseq as string | undefined
        if (rseq !== undefined && responsePromises[rseq]) {
          const callback = responsePromises[rseq] as NgldSubscriber
          delete responsePromises[rseq]

          callback(data)
        } else {
          processEvent(data)
        }
      })

      ws.addEventListener('close', () => {
        if (stopped) return
        queue = eventsStarted
          ? [
              {
                message: {
                  call: 'subscribe',
                  events: Object.keys(subscribers),
                },
              },
            ]
          : []

        // Don't spam the server with retries.
        timer = setTimeout(connectWs, 300)
      })
    }

    connectWs()

    return sendMessage
  } else {
    const sendMessage = (message: NgldMessage, callback?: NgldSubscriber) => {
      if (queue) {
        queue.push({ message, callback })
        return
      }

      const apiCallback = callback
        ? (data: string | null) => {
            callback(data == null ? null : JSON.parse(data))
          }
        : undefined

      ;(window as any).OverlayPluginApi.callHandler(
        JSON.stringify(message),
        apiCallback,
      )
    }

    const waitForApi = () => {
      if (stopped) return
      if (!(window as any).OverlayPluginApi?.ready) {
        timer = setTimeout(waitForApi, 300)
        return
      }

      const q = queue
      queue = null
      ;(window as any).__OverlayCallback = processEvent

      if (!q) return

      for (const { message, callback } of q) {
        sendMessage(message, callback)
      }
    }

    waitForApi()
    return sendMessage
  }
}

function processEvent(msg: NgldMessage) {
  const eventSubscribers = subscribers[msg.type as string]
  if (!eventSubscribers) return

  for (const sub of eventSubscribers) sub(msg)
}

export { processEvent as dispatchOverlayEvent }

export const addOverlayListener = <T extends NgldMessage>(
  event: string,
  cb: NgldSubscriber<T>,
) => {
  if (eventsStarted && subscribers[event]) {
    console.warn(`A new listener for ${event} has been registered after event transmission has already begun.
Some events might have been missed and no cached values will be transmitted.
Please register your listeners before calling startOverlayEvents().`)
  }

  let eventSubscribers = subscribers[event]
  if (!eventSubscribers) {
    eventSubscribers = []
    subscribers[event] = eventSubscribers
  }

  eventSubscribers.push(cb)
}

export const removeOverlayListener = <T extends NgldMessage>(
  event: string,
  cb: NgldSubscriber<T>,
) => {
  const list = subscribers[event]
  if (list) {
    const pos = list.indexOf(cb)

    if (pos > -1) list.splice(pos, 1)
  }
}

const pendingCalls = new Set<(error: Error) => void>()
export const callOverlayHandler = (msg: NgldMessage) => {
  if (stopped) return Promise.reject(new Error('ACT adapter is not prepared'))
  return new Promise<NgldMessage>((resolve, reject) => {
    pendingCalls.add(reject)
    sendMessage(msg, (value) => {
      pendingCalls.delete(reject)
      resolve(value)
    })
  })
}

export const startOverlayEvents = () => {
  eventsStarted = true

  sendMessage({
    call: 'subscribe',
    events: Object.keys(subscribers),
  })
}

let state: AdapterState = {
  status: 'connecting',
  message: '等待数据源',
  language: 'chs',
  clock: null,
  mapGeneration: 0,
  unsupportedActWebSocket: false,
}
const stateListeners = new Set<() => void>()
const eventListeners = new Set<(event: MatchaEvent<unknown>) => void>()
function updateState(value: Partial<AdapterState>) {
  if (
    Object.entries(value).every(
      ([key, next]) => state[key as keyof AdapterState] === next,
    )
  )
    return
  state = { ...state, ...value }
  for (const listener of stateListeners) listener()
}
function receiveLine(line: string[]) {
  if (line?.length !== 5 || line[0] !== '00') return
  const label = line[3]
  if (!label.startsWith('Matcha')) return
  const typePos = label.indexOf('-')
  if (typePos === -1) return
  const type = label.slice(typePos + 1)
  const [, version, language] = label.slice(0, typePos).split('#')
  updateState({
    status: 'connected',
    message: 'ACT 已连接',
    version: version || 'Legacy',
    language: language || 'chs',
  })
  const event = {
    time: new Date(line[1]),
    type,
    version: version || 'Legacy',
    content: tryParseJson(line[4]) || line[4],
  }
  for (const listener of eventListeners) listener(event)
}
const logListener = (event: NgldMessage) => receiveLine(event.line)
export const adapter: OverlayAdapter = {
  name: 'ACT',
  async prepare() {
    if (!stopped) return
    stopped = false
    const unsupported = window.location.search.includes('HOST_PORT')
    updateState({ unsupportedActWebSocket: unsupported })
    if (unsupported) {
      ;(window as any).__OverlayPlugin_ws_faker = () => {}
      return
    }
    sendMessage = connect()
  },
  dispose() {
    stopped = true
    for (const reject of pendingCalls) reject(new Error('ACT adapter disposed'))
    pendingCalls.clear()
    clearTimeout(timer)
    socket?.close()
    socket = undefined
    queue = []
    eventsStarted = false
    removeOverlayListener('LogLine', logListener)
    eventListeners.clear()
    for (const key of Object.keys(responsePromises))
      delete responsePromises[key]
    delete (window as any).__OverlayCallback
    delete (window as any)._dev_mock
  },
  async subscribeEvents(receive) {
    if (stopped) throw new Error('ACT adapter is not prepared')
    if (state.unsupportedActWebSocket) return () => {}
    eventListeners.add(receive)
    if (eventListeners.size === 1) {
      addOverlayListener('LogLine', logListener)
      const { hostname } = window.location
      if (hostname === '127.0.0.1' || hostname === 'localhost') {
        ;(window as any)._dev_mock = (log: string) =>
          receiveLine(log.split('|'))
        for (const line of process.env.MOCK_LOGS?.split('\n') ?? [])
          receiveLine(line.trim().split('|'))
      }
      startOverlayEvents()
    }
    return () => {
      eventListeners.delete(receive)
      if (!eventListeners.size) {
        removeOverlayListener('LogLine', logListener)
        delete (window as any)._dev_mock
      }
    }
  },
  getState: () => state,
  subscribeState(listener) {
    stateListeners.add(listener)
    return () => {
      stateListeners.delete(listener)
    }
  },
  storage: {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    removeItem: (key) => window.localStorage.removeItem(key),
    subscribe(key, callback) {
      const listener = (event: StorageEvent) => {
        if (event.storageArea === window.localStorage && event.key === key)
          callback(event.newValue)
      }
      window.addEventListener('storage', listener)
      return () => window.removeEventListener('storage', listener)
    },
  },
  async speak(text) {
    await callOverlayHandler({ call: 'say', text })
  },
  fetch: (url, options) => window.fetch(url, options),
  async resolveImage(url) {
    return { url, dispose() {} }
  },
  async createMapSession(library) {
    library.setDataProvider()
    library.setMapUrlResolver()
    library.setIconUrlResolver()
    return { async prepareIcons() {}, dispose() {} }
  },
}
