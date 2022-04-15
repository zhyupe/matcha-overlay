import { OverlayProps } from '../../interface'
import { EorzeaMap, MapInfo } from '../../../components/map'
import { useTreasureSpot } from './data-source/treasure'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Maps } from '../../../data/maps'
import { MapIcon } from '../../../map/interface'
import cn from 'classnames'
import './index.scss'
import { MapAction, PointInfo } from './interface'

function Point({ point, empty = '未知' }: { point: PointInfo | null; empty?: string }) {
  const [name, x, y] = useMemo(() => {
    if (!point) {
      return [null, null, null]
    }

    const mapInfo = Maps[point.map]
    const pos = [point.x, point.y].map((pos, i) => {
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

function Treasure({ point, onClick }: { point: PointInfo | null; onClick: MapAction }) {
  const showOnMap = () => {
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
  }

  useEffect(showOnMap, [point, onClick])

  return (
    <div className={cn('map-treasure space-between', point && 'clickable')} onClick={showOnMap}>
      <span className="tag">[寻宝]</span>
      <Point point={point} empty="未检测到宝图，请尝试切换地图" />
    </div>
  )
}

export function MapEventOverlay({ eventEmitter, active, setActive }: OverlayProps) {
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
      <main className="map-container">{mapInfo.map !== 0 ? <EorzeaMap {...mapInfo} /> : null}</main>
      <aside className="map-points">
        <Treasure point={treasure} onClick={action} />
      </aside>
    </div>
  )
}
