import { useCallback, useEffect, useMemo, useState } from 'react'
import { submarineMap } from '../../../data/submarine'
import { useEvent } from '../../../lib/event'
import type { OverlayProps } from '../../interface'
import type { Route } from './lib/interface'
import {
  calculateRoutes,
  formatSubmarine,
  getShipStatus,
  type Ship,
  type SubmarineStatusLog,
  useSpotStatus,
} from './lib/ship'
import { VoyageMap } from './mods/map'
import { VoyageRoutes } from './mods/routes'
import { VoyageEdit } from './mods/status'

const panelClass = 'min-w-0 rounded border border-white/15 bg-black/25 p-2.5'

export function SubmarineOverlay({
  eventEmitter,
  active,
  setActive,
}: OverlayProps) {
  const [ships, setShips] = useState<Ship[]>([])
  const [activeKey, setActiveKey] = useState(0)

  const [activeMap, setActiveMap] = useState('1')
  const [routes, setRoutes] = useState<Route[]>([])
  const spotStatus = useSpotStatus()

  useEvent<SubmarineStatusLog>(eventEmitter, 'SubmarineStatus', (data) => {
    const ship = formatSubmarine(data)
    setShips((prev) => {
      const next = prev.slice()
      next[ship.index] = ship
      return next
    })

    setActive()
  })

  const activeShip = ships[activeKey]
  const activeShipStatus = useMemo(
    () =>
      activeShip
        ? getShipStatus(activeShip.type, activeShip.rank, activeShip.parts)
        : null,
    [activeShip],
  )

  const calculate = useCallback(() => {
    const nextRoutes: Route[] = []
    if (activeShip?.status === 1 && activeShipStatus) {
      const mapData = submarineMap[activeMap]
      const spots = Object.fromEntries(
        Object.entries(mapData.spots).filter(
          ([key, value]) =>
            value.location === '0' ||
            (value.rank <= activeShip.rank && spotStatus.get(activeMap, key)),
        ),
      )

      nextRoutes.push(...calculateRoutes(activeShipStatus, activeMap, spots))
      nextRoutes.sort((a, b) => b.score - a.score)
    }
    setRoutes(nextRoutes)
  }, [activeShip, activeShipStatus, activeMap, spotStatus])

  // biome-ignore lint/correctness/useExhaustiveDependencies: by design
  useEffect(() => {
    setRoutes([])
  }, [activeKey, activeMap])

  if (!active) return null

  return (
    <div className="overlay box-border flex flex-col gap-2.5 p-1">
      <section>
        <VoyageEdit
          ships={ships}
          activeKey={activeKey}
          setActiveKey={setActiveKey}
          shipStatus={activeShipStatus}
          onCalculate={calculate}
        />
      </section>
      <div className="grid grid-cols-[minmax(360px,1fr)_minmax(360px,1fr)] gap-2.5 max-[820px]:grid-cols-1">
        <section className={`${panelClass} overflow-hidden`}>
          <VoyageMap
            maps={submarineMap}
            spotStatus={spotStatus}
            activeMap={activeMap}
            setActiveMap={setActiveMap}
          />
        </section>
        <section className={panelClass}>
          <VoyageRoutes
            ship={activeShip}
            maps={submarineMap}
            activeMap={activeMap}
            routes={routes}
          />
        </section>
      </div>
    </div>
  )
}
