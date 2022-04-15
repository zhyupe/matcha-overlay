import { EventEmitter } from 'events'
import { useMemo, useState } from 'react'
import { PointInfo } from '../interface'
import { TreasureData } from '../../../../data/treasures'
import { useEvent } from '../../../../lib/event'

export interface TreasureSpotDTO {
  item: number
  location: number
  isNew: boolean
}

export function useTreasureSpot(eventEmitter: EventEmitter) {
  const [info, setInfo] = useState<TreasureSpotDTO>()

  useEvent<TreasureSpotDTO>(eventEmitter, 'TreasureSpot', (data) => {
    if ((info && data.item === info.item && data.location === info.location) || (!info && data.item === 0)) {
      return
    }

    setInfo(data)
  })

  const result = useMemo<PointInfo | null>(() => {
    if (!info) return null

    const map = TreasureData[info.item.toString()]
    if (!map || !map[info.location]) {
      return null
    }
    const row = map[info.location]
    return {
      map: row.map,
      x: row.x,
      y: row.y,
    }
  }, [info])

  return result
}
