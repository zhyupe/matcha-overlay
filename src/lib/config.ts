import { type Dispatch, type SetStateAction, useMemo } from 'react'
import { createStore, useAtom, type WritableAtom } from 'jotai'
import { atomWithStorage, createJSONStorage } from 'jotai/utils'
import { tryParseJson } from './json'
import { debug } from './log'

export function getConfig<T = unknown>(
  key: string,
  defaultValue?: T,
): T | undefined {
  debug('[config:get]', key)
  const stored = window.localStorage.getItem(`config:${key}`)
  if (stored) {
    const value = tryParseJson<T>(stored)
    return value === undefined ? defaultValue : value
  }
  return defaultValue
}

export function getConfigWithInit<T = unknown>(
  key: string,
  defaultValue: () => T,
): T {
  let value = getConfig<T>(key)
  if (value === undefined) {
    value = defaultValue()
    setConfig(key, value)
  }

  return value
}

export function setConfig<T = unknown>(key: string, value: T): void {
  debug('[config:set]', key, value)
  configStore.set(getConfigAtom<T>(key), () => value)
}

type ConfigAtom<T> = WritableAtom<
  T | undefined,
  [SetStateAction<T | undefined>],
  void
>

const configStore = createStore()
const atomMap = new Map<string, ConfigAtom<any>>()

function getConfigAtom<T>(key: string, defaultValue?: T): ConfigAtom<T> {
  let cached = atomMap.get(key)
  if (!cached) {
    const storage = createJSONStorage<T | undefined>(() => window.localStorage)
    cached = atomWithStorage<T | undefined>(
      `config:${key}`,
      defaultValue,
      {
        ...storage,
        setItem: (storageKey, value) => {
          if (value === undefined) {
            storage.removeItem(storageKey)
          } else {
            storage.setItem(storageKey, value)
          }
        },
      },
      { getOnInit: true },
    )
    atomMap.set(key, cached)
  }
  return cached
}

export function useConfig<T = unknown>(
  key: string,
): [T | undefined, Dispatch<SetStateAction<T | undefined>>]
export function useConfig<T = unknown>(
  key: string,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>]
export function useConfig<T = unknown>(
  key: string,
  defaultValue?: T,
): [T | undefined, Dispatch<SetStateAction<T | undefined>>] {
  const state = useMemo(
    () => getConfigAtom<T>(key, defaultValue),
    [key, defaultValue],
  )
  return useAtom(state, { store: configStore })
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
      toggle: () => setValue((previous) => !previous),
      setTrue: () => setValue(true),
      setFalse: () => setValue(false),
    },
  ]
}
