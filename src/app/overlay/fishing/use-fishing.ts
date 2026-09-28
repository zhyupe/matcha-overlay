import { useCallback, useEffect, useRef, useState } from 'react'
import { useEvent } from '../../../lib/event'
import { useTimer } from '../../../lib/hook'
import type { OverlayProps } from '../../interface'
import { clockTime, type FishingClock, updateClock } from './clock'
import { parseFishingImport } from './import'
import {
  type Archive,
  emptyArchive,
  type FishingEvent,
  mergeArchives,
  parseArchive,
  recordCatch,
  transition,
} from './model'

const storageKey = 'matcha-fishing-v1'

export function useFishing({ eventEmitter, active, setActive }: OverlayProps) {
  const [cast, setCast] = useState<FishingEvent | null>(null)
  const castRef = useRef<FishingEvent | null>(null)
  const clockRef = useRef<FishingClock | null>(null)
  const [archive, setArchive] = useState<Archive>(emptyArchive)
  const archiveRef = useRef(archive)
  const [loaded, setLoaded] = useState(false)
  const [storageError, setStorageError] = useState('')
  const [message, setMessage] = useState('')
  const [now, setNow] = useState(0)
  const [baseBait, setBaseBait] = useState<number | null>(null)

  const updateArchive = useCallback((value: Archive) => {
    archiveRef.current = value
    setArchive(value)
  }, [])

  useEffect(() => {
    try {
      const text = localStorage.getItem(storageKey)
      if (text) updateArchive(parseArchive(text))
    } catch {
      setStorageError('本地数据读取失败，原数据未覆盖。')
    }
    setLoaded(true)
  }, [updateArchive])

  useEffect(() => {
    if (!loaded || storageError) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(archive))
    } catch {
      setStorageError('本地保存失败，请导出备份。')
    }
  }, [archive, loaded, storageError])

  useEvent<FishingEvent>(eventEmitter, 'Fishing', (event) => {
    const next = transition(castRef.current, event)
    const receivedAt = performance.now()
    clockRef.current = updateClock(clockRef.current, next, receivedAt)
    setNow(clockTime(clockRef.current, receivedAt))
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
  })
  useEvent(eventEmitter, 'InitZone', () => {
    castRef.current = null
    clockRef.current = null
    setCast(null)
    setNow(0)
    setBaseBait(null)
  })
  const running = cast?.action === 'cast' || cast?.action === 'place'
  useTimer(100, active && running, () =>
    setNow(clockTime(clockRef.current, performance.now())),
  )

  function exportArchive() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(archiveRef.current, null, 2)], {
        type: 'application/json',
      }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `matcha-fishing-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
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
    archive,
    now,
    baseBait,
    running,
    message: storageError || message,
    importArchive,
    exportArchive,
  }
}
