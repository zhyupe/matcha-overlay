import { useCallback, useMemo, useState } from 'react'
import {
  type SubmarineRank,
  type SubmarineSpot,
  submarineMap,
  submarineParts,
  submarineRanks,
} from '../../../../data/submarine'
import { useConfig } from '../../../../lib/config'
import type { PlannerInput, Route } from './interface'
import { dfsPlanner, findTopRoutesOptimized, naivePlanner } from './planner'
import {
  getSpotsDistance,
  getSubmarineSecondsForSpots,
  getSubmarineVoyageDistance,
} from './utils'

export enum ShipType {
  Airship,
  Submarine,
}

export type ShipParts = [number, number, number, number]
export interface Ship {
  index: number
  type: ShipType
  name: string
  rank: number
  parts: ShipParts
  status: number
  returnTime: number
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

export function formatSubmarine(data: SubmarineStatusLog): Ship {
  return {
    index: data.index,
    type: ShipType.Submarine,
    name: data.name,
    rank: data.rank || 1,
    parts: [data.hull, data.stern, data.bow, data.bridge],
    status: data.status,
    returnTime: data.returnTime,
  }
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

  const titles = ['鑸逛綋', '鑸瑰熬', '鑸归', '鑸版ˉ']

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

export function getShipPartName(type: ShipType, slot: number, partId: number) {
  if (!partId) {
    return 'None'
  }

  return (
    getShipParts(type, slot).parts.find((part) => part.value === partId)
      ?.label || `#${partId}`
  )
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
