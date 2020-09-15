import React, { useState, useEffect, useMemo } from 'react'
import { TreasureSpotDTO } from './interface'
import { MatchaEvent, OverlayProps } from '../../interface'
import { Alert } from '../../../components/alert'
import { TreasureData } from './data'
import './index.css'

function parseLog(logData: number[]): TreasureSpotDTO {
  const [item, location, isNew] = logData
  return {
    item,
    location,
    isNew: isNew === 1,
  }
}

export function TreasureOverlay({ eventEmitter, active, setActive }: OverlayProps) {
  const [info, setInfo] = useState<TreasureSpotDTO>()
  const mapString = useMemo<string | null>(() => {
    if (!info) return null

    const map = TreasureData[info.item.toString()]
    if (!map || !map[info.location]) {
      return null
    }
    const row = map[info.location]
    return `${row.map},${row.x},${row.y}`
  }, [info])

  useEffect(() => {
    const handleLog = function (log: MatchaEvent<TreasureSpotDTO>) {
      const data = Array.isArray(log.content) ? parseLog(log.content) : log.content

      if ((info && data.item === info.item && data.location === info.location) || (!info && data.item === 0)) {
        return
      }

      if (!active) {
        setActive()
      }

      setInfo(data)
    }

    eventEmitter.on('Treasure', handleLog)
    eventEmitter.on('TreasureSpot', handleLog)
    return () => {
      eventEmitter.off('Treasure', handleLog)
      eventEmitter.off('TreasureSpot', handleLog)
    }
  }, [active, eventEmitter, info, setActive])

  if (!active) return null

  if (!mapString) {
    return <Alert title="未检测到宝物地图">请解读新的宝物地图。如果您已经持有解读过的地图，请尝试切换区域。</Alert>
  }

  return (
    <div className="overlay overlay-treasure">
      <iframe title="map" src={`map.html#${mapString}`} />
    </div>
  )
}
