import { useCallback, useEffect, useMemo, useState } from 'react'
import { submarineMap } from '../../../data/submarine'
import { useEvent } from '../../../lib/event'
import type { OverlayProps } from '../../interface'
import type { Route } from './lib/interface'
import {
  calculateRoutes,
  getShipStatus,
  type SubmarineStatusLog,
  upsertSubmarineStatus,
  useShips,
  useSpotStatus,
} from './lib/ship'
import { VoyageMap } from './mods/map'
import { VoyageRoutes } from './mods/routes'
import { VoyageEdit } from './mods/status'

const panelClass =
  'min-w-0 rounded-[5px] border border-white/15 bg-black/25 p-2.5'

export function SubmarineOverlay({
  eventEmitter,
  active,
  setActive,
}: OverlayProps) {
  const [activeKey, setActiveKey] = useState<string>()
  const [activeMap, setActiveMap] = useState('1')
  const [routes, setRoutes] = useState<Route[]>([])
  const ships = useShips()
  const spotStatus = useSpotStatus()

  useEvent<SubmarineStatusLog>(eventEmitter, 'SubmarineStatus', (data) => {
    const key = upsertSubmarineStatus(ships, data)
    setActiveKey(key)
    setActive()
  })

  const shipKeys = useMemo(() => Object.keys(ships.ships), [ships.ships])

  useEffect(() => {
    if (!activeKey && shipKeys.length > 0) {
      setActiveKey(shipKeys[0])
    }
  }, [activeKey, shipKeys])

  const activeShip = ships.get(activeKey)
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

  useEffect(() => {
    setRoutes([])
  }, [activeKey, activeMap])

  if (!active) return null

  return (
    <div className="overlay box-border flex flex-col gap-2.5 px-[5px] pb-[5px]">
      <section className={panelClass}>
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
