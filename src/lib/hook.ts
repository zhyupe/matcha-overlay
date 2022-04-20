import { useEffect, useRef } from 'react'

export function useLatest<T>(value: T) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  }, [value])

  return ref
}

export function useTimer(time: number, enabled: boolean, handler: () => void) {
  const ref = useLatest(handler)
  useEffect(() => {
    if (!enabled) return

    const timer = setInterval(() => ref.current(), time)
    return () => clearInterval(timer)
  }, [time, enabled])
}
