import { useEffect, useMemo, useState } from 'react'
import { submarineMap } from '../../../data/submarine'
import type { OverlayProps } from '../../interface'
import { useEvent } from '../../../lib/event'
import { VoyageEdit } from './mods/edit'
import { VoyageMap } from './mods/map'
import { VoyageRoutes } from './mods/routes'
import {
  type SubmarineStatusLog,
  upsertSubmarineStatus,
  useShips,
  useSpotStatus,
} from './lib/ship'

const panelClass =
  'min-w-0 rounded-[5px] border border-white/15 bg-black/25 p-2.5'

export function SubmarineOverlay({
  eventEmitter,
  active,
  setActive,
}: OverlayProps) {
  const [activeKey, setActiveKey] = useState<string>()
  const [activeMap, setActiveMap] = useState('1')
  const ships = useShips()
  const spotStatus = useSpotStatus()

  useEvent<SubmarineStatusLog>(
    eventEmitter,
    'SubmarineStatus',
    (data) => {
      const key = upsertSubmarineStatus(ships, data)
      setActiveKey(key)
      setActive()
    },
  )

  const shipKeys = useMemo(() => Object.keys(ships.ships), [ships.ships])

  useEffect(() => {
    if (!activeKey && shipKeys.length > 0) {
      setActiveKey(shipKeys[0])
    }
  }, [activeKey, shipKeys])

  const activeShip = ships.get(activeKey)

  if (!active) return null

  return (
    <div className="overlay box-border flex flex-col gap-2.5 px-[5px] pb-[5px]">
      <section className={panelClass}>
        <VoyageEdit
          ships={ships}
          activeKey={activeKey}
          setActiveKey={setActiveKey}
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
            spotStatus={spotStatus}
          />
        </section>
      </div>
    </div>
  )
}
