import { useEffect, useMemo } from 'react'
import { Empty } from '#components/ui/controls'
import { EorzeaMap, type MapInfo } from '../../../components/map'
import { Maps } from '../../../data/maps'
import { MapIcon } from '../../../map/interface'
import type { OverlayProps } from '../../interface'
import { useTreasureSpot } from './data-source/treasure'
import './index.css'

export function TreasureOverlay({
  eventEmitter,
  active,
  setActive,
}: OverlayProps) {
  const point = useTreasureSpot(eventEmitter)
  const mapInfo = useMemo<MapInfo | null>(
    () =>
      point && {
        map: point.map,
        markers: [{ icon: MapIcon.Treasure, x: point.x, y: point.y }],
      },
    [point],
  )

  // A newly found treasure brings its map forward
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new point should switch
  useEffect(() => {
    if (point && !active) setActive()
  }, [point])

  if (!active) return null

  if (!point || !mapInfo) {
    return (
      <div className="overlay">
        <Empty>未检测到宝图，请尝试切换地图</Empty>
      </div>
    )
  }

  return (
    <div className="overlay overlay-treasure">
      <div className="treasure-map">
        <EorzeaMap {...mapInfo} />
      </div>
      <div className="treasure-card">
        <span className="treasure-place">{Maps[point.map]?.name}</span>
        <span className="treasure-position select-text">
          X <b>{point.x.toFixed(1)}</b> Y <b>{point.y.toFixed(1)}</b>
        </span>
      </div>
    </div>
  )
}
