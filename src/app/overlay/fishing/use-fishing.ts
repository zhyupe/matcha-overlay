import { useCallback, useEffect, useRef, useState } from 'react'
import { adapter } from '../../../adapter'
import { useEvent } from '../../../lib/event'
import { useTimer } from '../../../lib/hook'
import type { OverlayProps } from '../../interface'
import { displayClockTime, type FishingClock, updateClock } from './clock'
import { parseFishingImport } from './import'
import {
  type Archive,
  cleanFishingEvent,
  emptyArchive,
  type FishingEvent,
  mergeArchives,
  parseArchive,
  recordCatch,
  transition,
} from './model'
import { type FishingStatistics, validStatistics } from './statistics'

const storageKey = 'matcha-fishing-v1'

export async function removeInvalidFishingArchive(text: string) {
  if (adapter.storage.getItem(storageKey) !== text)
    throw new Error('钓鱼存档已变化，请重新加载后检查，未清理。')
  let valid = false
  try {
    parseArchive(text)
    valid = true
  } catch {
    // Only an archive rejected by the reader can be cleared here.
  }
  if (valid) throw new Error('钓鱼存档有效，未清理。')
  await adapter.storage.removeItem(storageKey)
}

export function useFishing({ eventEmitter, active, setActive }: OverlayProps) {
  const [statistics, setStatistics] = useState<FishingStatistics | null>(null)
  const statisticsRef = useRef<FishingStatistics | null>(null)
  const retiredSessions = useRef(new Set<string>())
  const [cast, setCast] = useState<FishingEvent | null>(null)
  const castRef = useRef<FishingEvent | null>(null)
  const clockRef = useRef<FishingClock | null>(null)
  const [archive, setArchive] = useState<Archive>(emptyArchive)
  const archiveRef = useRef(archive)
  const [loaded, setLoaded] = useState(false)
  const [storageError, setStorageError] = useState<{
    message: string
    detail?: string
  } | null>(null)
  const [invalidArchive, setInvalidArchive] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)
  const clearingRef = useRef(false)
  const [message, setMessage] = useState('')
  const [now, setNow] = useState(0)
  const [baseBait, setBaseBait] = useState<number | null>(null)

  const updateArchive = useCallback((value: Archive) => {
    archiveRef.current = value
    setArchive(value)
  }, [])

  useEffect(() => {
    try {
      const text = adapter.storage.getItem(storageKey)
      if (text !== null) {
        try {
          updateArchive(parseArchive(text))
        } catch (error) {
          setInvalidArchive(text)
          const reason =
            error instanceof SyntaxError
              ? '存档不是有效的 JSON。'
              : error instanceof Error
                ? error.message
                : '存档格式无效。'
          setStorageError({ message: '本地数据读取失败。', detail: reason })
        }
      }
    } catch {
      setStorageError({ message: '无法访问本地存储。' })
    }
    setLoaded(true)
  }, [updateArchive])

  useEffect(() => {
    if (!loaded || storageError) return
    try {
      adapter.storage.setItem(storageKey, JSON.stringify(archive))
    } catch {
      setStorageError({ message: '本地保存失败，请导出备份。' })
    }
  }, [archive, loaded, storageError])

  const receiveFishing = (input: FishingEvent) => {
    const event = cleanFishingEvent(input)
    const next = transition(castRef.current, event)
    const receivedAt = performance.now()
    clockRef.current = updateClock(clockRef.current, next, receivedAt)
    setNow(
      displayClockTime(
        clockRef.current,
        receivedAt,
        adapter.getState().clock ?? undefined,
      ),
    )
    castRef.current = next
    setCast(next)
    if (next === event && event.action === 'catch') {
      updateArchive(recordCatch(archiveRef.current, event))
    }
    if (event.baseBaitId != null) setBaseBait(event.baseBaitId)
    if (next === event && event.action === 'cast') {
      setMessage('')
      setActive()
    }
  }
  useEvent<FishingEvent>(eventEmitter, 'Fishing', receiveFishing)
  useEvent<FishingStatistics>(eventEmitter, 'FishingStatistics', (incoming) => {
    if (
      !validStatistics(incoming) ||
      retiredSessions.current.has(incoming.session)
    )
      return
    const previous = statisticsRef.current
    if (
      previous?.session === incoming.session &&
      previous.revision >= incoming.revision
    )
      return
    if (previous && previous.session !== incoming.session)
      retiredSessions.current.add(previous.session)
    const next = {
      ...incoming,
      cast: incoming.cast ? cleanFishingEvent(incoming.cast) : null,
    }
    statisticsRef.current = next
    setStatistics(next)
    // A heartbeat can restore a newly opened overlay without touching an established clock.
    if (next.cast) {
      if (
        !castRef.current ||
        next.cast.time > castRef.current.time ||
        (next.cast.castId === castRef.current.castId &&
          next.cast.action !== castRef.current.action)
      )
        receiveFishing(next.cast)
    } else if (previous?.cast && next.enabled) {
      castRef.current = null
      clockRef.current = null
      setCast(null)
      setNow(0)
    }
  })
  const resetSession = () => {
    castRef.current = null
    clockRef.current = null
    setCast(null)
    setNow(0)
    setBaseBait(null)
    setStatistics(null)
    statisticsRef.current = null
    retiredSessions.current.clear()
  }
  useEvent(eventEmitter, 'InitZone', resetSession)
  useEvent(eventEmitter, 'Reset', resetSession)
  const running = cast?.action === 'cast' || cast?.action === 'place'
  useTimer(100, active && running, () =>
    setNow(
      displayClockTime(
        clockRef.current,
        performance.now(),
        adapter.getState().clock ?? undefined,
      ),
    ),
  )

  function exportArchive() {
    const url = URL.createObjectURL(
      new Blob(
        [invalidArchive ?? JSON.stringify(archiveRef.current, null, 2)],
        {
          type: 'application/json',
        },
      ),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `matcha-fishing-${invalidArchive !== null ? 'invalid-' : ''}${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function clearInvalidArchive() {
    if (invalidArchive === null || clearingRef.current) return false
    clearingRef.current = true
    setClearing(true)
    try {
      await removeInvalidFishingArchive(invalidArchive)
      setInvalidArchive(null)
      setStorageError(null)
      setMessage('已清理。')
      return true
    } catch (error) {
      setStorageError({
        message: '清理失败。',
        detail: error instanceof Error ? error.message : undefined,
      })
      return false
    } finally {
      clearingRef.current = false
      setClearing(false)
    }
  }

  async function importArchive(file: File) {
    try {
      if (file.size > 5_000_000) throw new Error('文件超过 5 MB。')
      const imported = parseFishingImport(await file.text())
      updateArchive(mergeArchives(archiveRef.current, imported))
      setMessage(
        `已合并 ${imported.fish.length} 条鱼种、${imported.profiles.length} 条区间、${imported.catches.length} 条鱼获。`,
      )
    } catch (error) {
      setMessage((error as Error).message)
    }
  }

  return {
    cast,
    statistics,
    archive,
    now,
    baseBait,
    running,
    message: storageError?.message || message,
    messageDetail: storageError?.detail,
    hasInvalidArchive: invalidArchive !== null,
    clearing,
    clearInvalidArchive,
    importArchive,
    exportArchive,
  }
}
