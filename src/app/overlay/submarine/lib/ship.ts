import {
  SubmarineRank,
  SubmarineSpot,
  submarineMap,
  submarineParts,
  submarineRanks,
} from '../../../../data/submarine'
import { useCallback, useMemo } from 'react'
import { dfsPlanner, findTopRoutesOptimized, naivePlanner } from './planner'
import {
  getSpotsDistance,
  getSubmarineSecondsForSpots,
  getSubmarineVoyageDistance,
  random,
} from './utils'
import { PlannerInput, Route } from './interface'
import { useConfig } from '../../../../lib/config'

export enum ShipType {
  Airship,
  Submarine,
}

export type ShipParts = [number, number, number, number]
export interface Ship {
  key: string
  type: ShipType
  name: string
  rank: number
  parts: ShipParts
}

export interface SubmarineStatusLog {
  index: number
  status: number
  rank: number
  birthdate: number
  returnTime: number
  currentExp: number
  totalExpForNextRank: number
  capacity: number
  name: string
  hull: number
  stern: number
  bow: number
  bridge: number
  destination: number[]
}

export function useShips() {
  const [ships, setShips] = useConfig<Record<string, Ship>>('ships', {})
  const update = (value: Ship) => {
    setShips((old) => ({ ...old, [value.key]: value }))
  }
  const remove = (value: Ship) => {
    setShips(({ ...ships }) => {
      const newShips = { ...ships }
      delete newShips[value.key]
      return newShips
    })
  }
  const create = (data: Partial<Ship> = {}) => {
    const key = random()
    update({
      key,
      type: ShipType.Submarine,
      name: '新船',
      rank: 1,
      parts: [0, 0, 0, 0],
      ...data,
    })

    return key
  }

  return {
    ships: ships || {},
    get: (id?: string) => (id && ships?.[id]) || null,
    update,
    remove,
    create,
  }
}

export function upsertSubmarineStatus(
  ships: ReturnType<typeof useShips>,
  data: SubmarineStatusLog,
) {
  const key = `submarine-${data.index}`
  ships.update({
    key,
    type: ShipType.Submarine,
    name: data.name || `潜水艇 ${data.index + 1}`,
    rank: data.rank || 1,
    parts: [data.hull, data.stern, data.bow, data.bridge],
  })

  return key
}

export function useSpotStatus() {
  const [status, setStatus] = useConfig<Record<string, string[]>>(
    'submarine-spot',
    {},
  )

  const get = useCallback(
    (mapId: string, spot: string) => {
      return !!status?.[mapId]?.includes(spot)
    },
    [status],
  )

  const update = useCallback(
    (mapId: string, spot: string, discovered?: boolean) => {
      setStatus((status) => {
        const mapSet = new Set(status?.[mapId] || [])
        const prevDiscovered = mapSet.has(spot)
        if (discovered === undefined) {
          discovered = !prevDiscovered
        } else if (prevDiscovered === discovered) {
          return status
        }

        const spots = submarineMap[mapId]?.spots
        if (!spots) {
          return status
        }

        if (discovered) {
          // find up
          let currentSpot: string | null = spot
          do {
            mapSet.add(currentSpot)
            currentSpot = spots[currentSpot]?.parent
          } while (currentSpot && currentSpot !== '0')
        } else {
          // find down
          mapSet.delete(spot)
          for (const item of Object.values(spots)) {
            if (!item.parent || item.parent === '0') {
              continue
            }

            if (!mapSet.has(item.parent)) {
              mapSet.delete(item.location)
            }
          }
        }

        return {
          ...status,
          [mapId]: Array.from(mapSet),
        }
      })
    },
    [setStatus],
  )

  const updateAll = useCallback(
    (mapId: string, discovered?: boolean) => {
      setStatus((status) => {
        const spots = submarineMap[mapId]?.spots
        if (!spots) {
          return status
        }

        return {
          ...status,
          [mapId]: discovered ? Object.keys(spots) : [],
        }
      })
    },
    [setStatus],
  )

  return useMemo(
    () => ({
      status: status || {},
      get,
      update,
      updateAll,
    }),
    [status, get, update, updateAll],
  )
}

export function getShipParts(type: ShipType, slot: number) {
  if (type === ShipType.Airship) {
    throw new Error('not implemented')
  }

  const titles = ['船体', '船尾', '船首', '舰桥']

  return {
    title: titles[slot],
    parts: Object.entries(submarineParts)
      .filter(([, value]) => value.slot === slot)
      .map(([key, value]) => ({
        label: value.name,
        value: +key,
      })),
  }
}

export function getShipStatus(
  type: ShipType,
  rank: number,
  parts: ShipParts,
): SubmarineRank {
  if (type === ShipType.Airship) {
    throw new Error('not implemented')
  }

  const status = { ...submarineRanks[rank] }
  for (const part of parts) {
    const info = submarineParts[part]
    if (!info) {
      continue
    }

    status.surveillance += info.surveillance
    status.retrieval += info.retrieval
    status.speed += info.speed
    status.range += info.range
    status.favor += info.favor
  }

  return status
}

const planners = { dfsPlanner, naivePlanner, findTopRoutesOptimized }
export function calculateRoutes(
  ship: SubmarineRank,
  mapId: string,
  spots: Record<string, SubmarineSpot>,
): Route[] {
  const { range, speed } = ship

  // 计算航点的期望产出
  const spotExpectation: Record<string, number> = {}
  for (const spot of Object.keys(spots)) {
    if (spot === '0') {
      continue
    }

    spotExpectation[spot] = spots[spot].exp
  }

  const input: PlannerInput = {
    spots: spotExpectation,
    getTime: (a, b) => getSubmarineSecondsForSpots(spots[a], spots[b], speed),
    getDistance: (from: string, to: string) => {
      const fromSpot = spots[from]
      const toSpot = spots[to]

      const distance = getSpotsDistance(fromSpot, toSpot)
      return getSubmarineVoyageDistance(distance) + toSpot.distance
    },
    rangeLimit: range,
    topK: 10,
    maxVisits: 5,
  }

  const planner = planners.findTopRoutesOptimized
  const routes = planner(input)

  return routes.map((route) => {
    return {
      mapId,
      ...route,
    }
  })
}
