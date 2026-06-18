import { Button } from '#components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#components/ui/table'
import { useCallback, useMemo, useState } from 'react'
import type { SubmarineMap } from '../../../../data/submarine'
import type { Route } from '../lib/interface'
import {
  type Ship,
  calculateRoutes,
  getShipStatus,
  useSpotStatus,
} from '../lib/ship'

const formatRate = (value: number) => {
  if (value > 100) return `${value.toFixed()}/min`
  if (value > 1) return `${value.toFixed(2)}/min`

  const perHour = value * 60
  if (perHour > 1) return `${perHour.toFixed(2)}/h`

  return `${(perHour * 24).toFixed(2)}/d`
}

const formatExpectation = (value: number) => {
  if (value > 10000) return value.toFixed()
  if (value > 100) return value.toFixed(2)
  if (value > 1) return value.toFixed(4)
  return value.toFixed(6)
}

export function VoyageRoutes({
  ship,
  maps,
  spotStatus,
  activeMap,
}: {
  ship: Ship | null
  maps: Record<string, SubmarineMap>
  spotStatus: ReturnType<typeof useSpotStatus>
  activeMap: string
}) {
  const status = useMemo(
    () => (ship ? getShipStatus(ship.type, ship.rank, ship.parts) : null),
    [ship],
  )

  const [routes, setRoutes] = useState<Route[]>([])

  const calc = useCallback(() => {
    const nextRoutes: Route[] = []
    if (ship && status && spotStatus) {
      const mapData = maps[activeMap]
      const spots = Object.fromEntries(
        Object.entries(mapData.spots).filter(
          ([key, value]) =>
            value.location === '0' ||
            (value.rank <= ship.rank && spotStatus.get(activeMap, key)),
        ),
      )

      nextRoutes.push(...calculateRoutes(status, activeMap, spots))
      nextRoutes.sort((a, b) => b.score - a.score)
    }
    setRoutes(nextRoutes)
  }, [ship, status, maps, spotStatus, activeMap])

  return (
    <>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <Button type="button" disabled={!ship} onClick={calc}>
          计算路径
        </Button>
        <span>
          速度: {status?.speed ?? '-'} / 距离: {status?.range ?? '-'}
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>地图</TableHead>
            <TableHead>路线</TableHead>
            <TableHead>距离</TableHead>
            <TableHead>产出</TableHead>
            <TableHead>时间</TableHead>
            <TableHead>效率</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {routes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>选择潜水艇并标记探索点后计算。</TableCell>
            </TableRow>
          ) : (
            routes.map((route) => (
              <TableRow key={`${route.mapId}-${route.path.join('-')}`}>
                <TableCell>{maps[route.mapId].name}</TableCell>
                <TableCell className="break-keep">
                  {route.path.join('-')}
                </TableCell>
                <TableCell>{route.range}</TableCell>
                <TableCell>{formatExpectation(route.expectation)}</TableCell>
                <TableCell>{(route.time / 3600).toFixed(1)}h</TableCell>
                <TableCell>{formatRate(route.score)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  )
}
