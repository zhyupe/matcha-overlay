import { Dispatch, SetStateAction, useState } from 'react'

export function getConfig<T = unknown>(key: string, defaultValue?: T): T | undefined {
  console.log('[config:get]', key)
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

export function setConfig<T = unknown>(key: string, value: T): void {
  console.log('[config:set]', key, value)
  window.localStorage.setItem(`config:${key}`, JSON.stringify(value))
}

export function useConfig<T = unknown>(
  key: string,
  defaultValue?: T,
): [T | undefined, Dispatch<SetStateAction<T | undefined>>] {
  const [value, setValue] = useState(() => getConfig(key, defaultValue))

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
    set: Dispatch<SetStateAction<boolean | undefined>>
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
