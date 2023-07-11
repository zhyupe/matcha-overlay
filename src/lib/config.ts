import { Dispatch, SetStateAction, useMemo } from 'react'
import { atom, RecoilState, useRecoilState } from 'recoil'
import { debug } from './log'

export function getConfig<T = unknown>(key: string, defaultValue?: T): T | undefined {
  debug('[config:get]', key)
  const stored = window.localStorage.getItem(`config:${key}`)
  if (stored) {
    try {
      return JSON.parse(stored) as T
    } catch (e) {
      //
    }
  }
  return defaultValue
}

export function getConfigWithInit<T = unknown>(key: string, defaultValue: () => T): T {
  let value = getConfig<T>(key)
  if (!value) {
    value = defaultValue()
    setConfig(key, value)
  }

  return value
}

export function setConfig<T = unknown>(key: string, value: T): void {
  debug('[config:set]', key, value)
  window.localStorage.setItem(`config:${key}`, JSON.stringify(value))
}

const atomMap = new Map<string, RecoilState<any>>()

export function useConfig<T = unknown>(key: string): [T | undefined, Dispatch<SetStateAction<T>>]
export function useConfig<T = unknown>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>]
export function useConfig<T = unknown>(
  key: string,
  defaultValue?: T,
): [T | undefined, Dispatch<SetStateAction<T | undefined>>] {
  const state = useMemo(() => {
    let cached = atomMap.get(key)
    if (!cached) {
      cached = atom({
        key,
        default: getConfig(key, defaultValue),
      })
      atomMap.set(key, cached)
    }
    return cached
  }, [key, defaultValue])

  const [value, setValue] = useRecoilState<T | undefined>(state)

  return [
    value,
    (newValue) => {
      setValue((oldValue) => {
        if (typeof newValue === 'function') {
          newValue = (newValue as (v: T | undefined) => T | undefined)(oldValue)
        }

        setConfig(key, newValue)
        return newValue
      })
    },
  ]
}

export function useConfigBoolean(
  key: string,
  defaultValue = false,
): [
  boolean,
  {
    set: Dispatch<SetStateAction<boolean>>
    toggle: () => void
    setTrue: () => void
    setFalse: () => void
  },
] {
  const [value, setValue] = useConfig<boolean>(key, defaultValue)
  return [
    value || false,
    {
      set: setValue,
      toggle: () => setValue(!value),
      setTrue: () => setValue(true),
      setFalse: () => setValue(false),
    },
  ]
}
