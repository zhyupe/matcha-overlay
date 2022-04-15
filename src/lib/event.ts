import { EventEmitter } from 'events'
import { useEffect, useRef } from 'react'
import { MatchaEvent } from '../app/interface'

export function useEvent<T>(eventEmitter: EventEmitter, name: string, handler: (data: T, log: MatchaEvent<T>) => void) {
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    const handleLog = (log: MatchaEvent<T>) => {
      handlerRef.current(log.content, log)
    }

    eventEmitter.on(name, handleLog)
    return () => {
      eventEmitter.off(name, handleLog)
    }
  }, [eventEmitter, name])
}
