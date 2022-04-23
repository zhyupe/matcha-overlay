/* eslint-disable no-unused-vars */
import { EventEmitter } from 'events'
import { connect as natsConnect, NatsConnection, jwtAuthenticator, Subscription, Msg, JSONCodec } from 'nats.ws'
import { useEffect, useMemo, useState } from 'react'
import { debounce } from 'debounce'
import { Worlds } from '../../../../data/worlds'
import { getConfig, getConfigWithInit, setConfig, useConfig, useConfigBoolean } from '../../../../lib/config'
import { useEvent } from '../../../../lib/event'
import { createUser, fromSeed, KeyPair } from 'nkeys.js'
import { v4 as uuidv4 } from 'uuid'
import { useLatest, useTimer } from '../../../../lib/hook'
import { List } from 'immutable'
import { speak } from '../../../../lib/tts'
import { FFXIVFate } from '../../../../data/fates'

export interface FateWatchListChangedDTO {
  world: number
  fates: number[]
}

export interface PostMoogleConfig {
  world: number
  dc: number
  fates: number[]
  isDefault: boolean
}

const currentCollectingFate = [1763, 1855]

function usePostMoogleConfig(eventEmitter: EventEmitter): PostMoogleConfig {
  const [dc, setDC] = useConfig('post-moogle-dc', 0)
  const [world, setWorld] = useConfig('post-moogle-world', 0)
  const [fates, setFates] = useConfig<number[]>('post-moogle-fates')

  useEvent<FateWatchListChangedDTO>(eventEmitter, 'FateWatchListChanged', (data) => {
    const nextWorld = Worlds[data.world]
    if (!data.world || !nextWorld) {
      setDC(0)
      setWorld(0)
      return
    }

    setDC(nextWorld.dc || 0)
    setWorld(data.world)
    setFates(data.fates)
  })

  return {
    world,
    dc,
    ...(fates
      ? {
          fates,
          isDefault: false,
        }
      : {
          fates: currentCollectingFate,
          isDefault: true,
        }),
  }
}

const apiServer = process.env.POST_MOOGLE_API || ''
const natsServer = process.env.POST_MOOGLE_NATS || ''
const topicPrefix = 'realtime.fate'

const configKey = {
  client: 'post-moogle-client',
  seed: 'post-moogle-seed',
}

const connect = debounce(async (cb: (err: Error | null, conn: NatsConnection, close: () => void) => void) => {
  const clientId = getConfigWithInit(configKey.client, () => uuidv4())

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const seed = getConfig<string>(configKey.seed)

  let nkey: KeyPair
  if (seed) {
    nkey = fromSeed(encoder.encode(seed))
  } else {
    nkey = createUser()
    setConfig(configKey.seed, decoder.decode(nkey.getSeed()))
  }

  const qs = new URLSearchParams({
    id: clientId,
    key: nkey.getPublicKey(),
  })

  const res = await fetch(`${apiServer}/api/v1/auth/nats?${qs}`)
  if (res.status !== 200) {
    throw new Error(`Invalid auth response: status ${res.status}`)
  }

  const { token } = await res.json()
  if (!token) {
    throw new Error('Invalid jwt response')
  }

  const conn = await natsConnect({
    servers: [natsServer],
    reconnect: false,
    ignoreClusterUpdates: true,
    authenticator: jwtAuthenticator(token, nkey.getSeed()),
  })

  let manuallyClosed = false
  cb(null, conn, () => {
    manuallyClosed = true
    void conn.close()
  })

  const error = await conn.closed()
  if (error) {
    console.error(error)
    console.log(`[nats] Connection closed with error, retry in 10s`)

    setTimeout(() => connect(cb), 10e3)
  } else if (!manuallyClosed) {
    console.log(`[nats] Connection unexpectly closed, retry`)
    void connect(cb)
  } else {
    console.log(`[nats] Connection closed`)
  }
})

function useConnection(enabled: boolean, topics: string[], handler: (message: Msg) => void) {
  const [connection, setConnection] = useState<NatsConnection>()
  const handlerRef = useLatest(handler)

  const [subscribed] = useState(new Map<string, Subscription>())

  useEffect(() => {
    if (!enabled) {
      setConnection(undefined)
      return
    }

    let closeConnection: () => void
    void connect((err, conn, _close) => {
      if (err) return

      closeConnection = _close

      console.log(`[nats] New connection established. Clearing subscribed.`)
      subscribed.clear()
      setConnection(conn)
    })

    return () => {
      if (closeConnection) {
        console.log(`[nats] Closing connection.`)
        closeConnection()
      }
    }
  }, [enabled])

  useEffect(() => {
    if (!connection || connection.isClosed()) {
      return
    }

    for (const [key, sub] of subscribed) {
      if (topics.includes(key)) continue

      console.log(`[nats][topic:${key}] Unsubscribing ...`)
      subscribed.delete(key)
      sub.unsubscribe()
    }

    for (const key of topics) {
      const sub = connection.subscribe(key)
      console.log(`[nats][topic:${key}] Subscribing ...`)
      subscribed.set(key, sub)
      ;(async () => {
        for await (const m of sub) {
          handlerRef.current(m)
        }
      })().catch((err) => {
        console.log(`[nats][topic:${key}] Error: ${err.code} ${err.message}`)
        subscribed.delete(key)
      })
    }
  }, [connection, topics])
}

export enum ReportStage {
  Prepare = 'prepare',
  Ongoing = 'ongoing',
  End = 'end',
}

export interface PostMoogleFate {
  dc: number
  fate: number
  world: number
  instance: number
  startTime: number
  duration: number
  stage: ReportStage
}

export type PostMoogleItem<T> = T & {
  _receivedAt: number
  _subject: string
}

export interface PostMoogleState {
  enabled: boolean
  config: PostMoogleConfig
  data: List<PostMoogleItem<PostMoogleFate>>
  enable: () => void
  disable: () => void
}

const hasServer = !!apiServer && !!natsServer
const codec = JSONCodec()
export function usePostMoogle(eventEmitter: EventEmitter): PostMoogleState {
  const [enabled, { setTrue, setFalse }] = useConfigBoolean('post-moogle-enabled')
  const [tts] = useConfigBoolean('post-moogle-tts')
  const config = usePostMoogleConfig(eventEmitter)
  const [data, setData] = useState(List<PostMoogleItem<PostMoogleFate>>())

  const topics = useMemo(() => {
    return config.fates.map((fate) => `${topicPrefix}.dc${config.dc}.fate${fate}.*`)
  }, [config.dc, config.fates])

  const ready = enabled && hasServer && config.dc !== 0 && config.fates.length !== 0
  useConnection(ready, topics, (msg) => {
    if (msg.subject.includes('.fate')) {
      const json = codec.decode(msg.data) as PostMoogleFate

      const isEnd = json.stage === ReportStage.End
      setData((data) => {
        const index = data.findIndex((item) => item._subject === msg.subject)

        if (isEnd) {
          return index === -1 ? data : data.remove(index)
        }

        const updater = (item?: PostMoogleItem<PostMoogleFate>) => ({
          _receivedAt: Date.now(),
          _subject: msg.subject,
          ...item,
          ...json,
          startTime: json.startTime || item?.startTime || 0,
          duration: json.duration || item?.duration || 0,
          stage:
            json.stage === ReportStage.Ongoing || item?.stage === ReportStage.Ongoing
              ? ReportStage.Ongoing
              : ReportStage.Prepare,
        })

        if (index === -1) {
          if (tts) {
            speak(
              `${Worlds[json.world]?.name} ${json.instance ? `${json.instance}线` : ''} ${FFXIVFate[json.fate]?.name}`,
            )
          }

          return data.push(updater())
        }

        return data.update(index, updater)
      })
    }
  })

  // FIXME: replace with real messages of fate ends
  useTimer(5000, ready && !data.isEmpty(), () => {
    const now = Date.now()
    setData((data) =>
      data.filter((item) => {
        const startTime = item.startTime ? item.startTime * 1000 : item._receivedAt
        const duration = (item.duration || 15 * 60) * 1000

        return now <= startTime + duration
      }),
    )
  })

  return {
    enabled,
    config,
    data,
    enable: setTrue,
    disable: setFalse,
  }
}
