declare let OverlayPluginApi: any

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

const sendMessage = (() => {
  const wsUrl = /[?&]OVERLAY_WS=([^&]+)/.exec(window.location.href)

  if (wsUrl) {
    let ws: WebSocket
    const sendMessage = (message: NgldMessage, callback?: NgldSubscriber<any>) => {
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
      ws = new WebSocket(wsUrl[1])

      ws.addEventListener('error', (e) => {
        console.error(e)
      })

      ws.addEventListener('open', () => {
        if (!queue) return

        const q = queue
        queue = null

        for (const { message, callback } of q) {
          sendMessage(message, callback)
        }
      })

      ws.addEventListener('message', (msg) => {
        let data: NgldMessage
        try {
          data = JSON.parse(msg.data)
        } catch (e) {
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
        queue = []

        // Don't spam the server with retries.
        setTimeout(connectWs, 300)
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

      OverlayPluginApi.callHandler(JSON.stringify(message), apiCallback)
    }

    const waitForApi = () => {
      if (!OverlayPluginApi || !OverlayPluginApi.ready) {
        setTimeout(waitForApi, 300)
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
})()

function processEvent(msg: NgldMessage) {
  const eventSubscribers = subscribers[msg.type as string]
  if (!eventSubscribers) return

  for (const sub of eventSubscribers) sub(msg)
}

export { processEvent as dispatchOverlayEvent }

export const addOverlayListener = <T>(event: string, cb: NgldSubscriber<T>) => {
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

export const removeOverlayListener = <T>(event: string, cb: NgldSubscriber<T>) => {
  const list = subscribers[event]
  if (list) {
    const pos = list.indexOf(cb)

    if (pos > -1) list.splice(pos, 1)
  }
}

export const callOverlayHandler = (msg: NgldMessage) => {
  return new Promise<NgldMessage>((resolve) => sendMessage(msg, resolve))
}

export const startOverlayEvents = () => {
  eventsStarted = false

  sendMessage({
    call: 'subscribe',
    events: Object.keys(subscribers),
  })
}
