import cn from 'classnames'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { EorzeaMap, type MapInfo } from '../../../components/map'
import { Maps } from '../../../data/maps'
import { MapIcon } from '../../../map/interface'
import type { OverlayProps } from '../../interface'
import { useTreasureSpot } from './data-source/treasure'
import './index.scss'
import { Instance1, Instance2, Instance3 } from '../../../components/icon'
import { FFXIVFate } from '../../../data/fates'
import type { MapAction, PointInfo } from './interface'

function Point({
  point,
  empty = '未知',
}: {
  point: PointInfo | null
  empty?: string
}) {
  const [name, x, y] = useMemo(() => {
    if (!point) {
      return [null, null, null]
    }

    const mapInfo = Maps[point.map]
    const pos = [point.x, point.y].map((pos) => {
      const [a, b] = pos.toFixed(1).split('.')
      return (
        <>
          {a}
          <small>.{b}</small>
        </>
      )
    })

    return [mapInfo.name, ...pos]
  }, [point])

  if (!point) {
    return <span>{empty}</span>
  }

  return (
    <div className="point">
      {name}
      <span className="position">
        ({x}, {y})
      </span>
    </div>
  )
}

function Treasure({
  point,
  onClick,
}: {
  point: PointInfo | null
  onClick: MapAction
}) {
  const showOnMap = useCallback(() => {
    if (!point) return

    onClick({
      map: point.map,
      markers: [
        {
          icon: MapIcon.Treasure,
          x: point.x,
          y: point.y,
        },
      ],
    })
  }, [point, onClick])

  useEffect(() => {
    showOnMap()
  }, [showOnMap])

  return (
    <div
      className={cn('map-treasure space-between', point && 'clickable')}
      onClick={showOnMap}
    >
      <span className="tag">[寻宝]</span>
      <Point point={point} empty="未检测到宝图，请尝试切换地图" />
    </div>
  )
}

function Instance({ value }: { value: number }) {
  switch (value) {
    case 1:
      return <Instance1 />
    case 2:
      return <Instance2 />
    case 3:
      return <Instance3 />
  }

  return null
}

function EventTimer({ from, to }: { from: number; to: number }) {
  const timeString = useMemo(() => {
    const seconds = Math.floor((to - from) / 1000)
    if (seconds < 0) {
      return '--:--'
    }

    const minutes = Math.floor(seconds / 60)
    return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
  }, [from, to])

  return <span>{timeString}</span>
}

function ListeningFates({
  fate,
  isDefault,
}: {
  fate: number[]
  isDefault: boolean
}) {
  const name = (id: number) => (
    <span className="tag">{FFXIVFate[id]?.name || `FATE:${id}`}</span>
  )

  return (
    <div>
      {fate.length === 0 ? '未设置' : null}
      {fate.length <= 2 ? (
        <>
          {name(fate[0])}和{name(fate[1])}
        </>
      ) : (
        <>
          {name(fate[0])}等 {fate.length} 个
        </>
      )}
      <div>{`${isDefault ? '默认设置，' : ''}请在抹茶 Matcha 插件内修改或设置`}</div>
    </div>
  )
}

export function MapEventOverlay({
  eventEmitter,
  active,
  setActive,
}: OverlayProps) {
  const treasure = useTreasureSpot(eventEmitter)
  const [mapInfo, setMapInfo] = useState<MapInfo>({ map: 0 })

  const action = useCallback<MapAction>(
    (nextMapInfo: MapInfo) => {
      setMapInfo(nextMapInfo)
      if (!active) {
        setActive()
      }
    },
    [active, setActive],
  )

  if (!active) return null

  return (
    <div className="overlay overlay-map-event">
      <main className="map-container">
        {mapInfo.map !== 0 ? <EorzeaMap {...mapInfo} /> : null}
      </main>
      <aside className="map-points">
        <Treasure point={treasure} onClick={action} />
      </aside>
    </div>
  )
}
