import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '#components/ui/button'
import { getShipPartName, type Ship, type useShips } from '../lib/ship'
import type { SubmarineRank } from '../../../../data/submarine'
import { PropsWithChildren } from 'react'
import { cn } from '#lib/utils'

const partSlots = [0, 1, 2, 3] as const
// border-[#b7ca32]/60 bg-[#b7ca32]/15 px-2 py-1 text-xs text-[#d8eb5d]

const tagColors = {
  white: 'border-white/20 bg-white/10 text-white/90',
  matcha: 'border-[#b7ca32]/60 bg-[#b7ca32]/15 text-[#d8eb5d]',
}

function Tag({
  color = 'white',
  children,
}: PropsWithChildren<{
  color?: keyof typeof tagColors
}>) {
  return (
    <span
      className={cn(
        'min-w-0 rounded-[5px] border px-2 py-1 text-xs',
        tagColors[color],
      )}
    >
      {children}
    </span>
  )
}

function ShipPart({
  ship,
  slot,
}: {
  ship: Ship
  slot: (typeof partSlots)[number]
}) {
  return <Tag>{getShipPartName(ship.type, slot, ship.parts[slot])}</Tag>
}

function formatReturnTime(returnTime: number) {
  if (!returnTime) {
    return '-'
  }

  return new Date(returnTime * 1000).toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ShipStatusColumn({
  ship,
  shipStatus,
  onCalculate,
}: {
  ship: Ship
  shipStatus: SubmarineRank | null
  onCalculate: () => void
}) {
  if (ship.status === 1) {
    return (
      <div className="flex min-w-[320px] flex-wrap items-center justify-end gap-2">
        <Tag>
          速度: {shipStatus?.speed ?? '-'} / 距离: {shipStatus?.range ?? '-'}
        </Tag>
        <Button type="button" onClick={onCalculate}>
          计算路径
        </Button>
      </div>
    )
  }

  if (ship.status === 2) {
    const isExploring =
      ship.returnTime > 0 && ship.returnTime * 1000 > Date.now()

    return (
      <div className="flex min-w-[160px] justify-end items-center gap-2 text-xs">
        <Tag>
          {isExploring
            ? `探索中 [${formatReturnTime(ship.returnTime)}]`
            : '探索完成'}
        </Tag>
      </div>
    )
  }

  return (
    <div className="min-w-[120px] text-right text-xs text-white/70">
      <Tag>状态: {ship.status}</Tag>
    </div>
  )
}

export function VoyageEdit({
  ships,
  activeKey,
  setActiveKey,
  shipStatus,
  onCalculate,
}: {
  ships: ReturnType<typeof useShips>
  activeKey?: string
  setActiveKey: (val: string) => void
  shipStatus: SubmarineRank | null
  onCalculate: () => void
}) {
  const activeShip = ships.get(activeKey)
  const shipEntries = Object.entries(ships.ships)
  const activeIndex = shipEntries.findIndex(([key]) => key === activeKey)

  const selectByOffset = (offset: number) => {
    if (shipEntries.length === 0) return
    const base = activeIndex === -1 ? 0 : activeIndex
    const nextIndex = (base + offset + shipEntries.length) % shipEntries.length
    setActiveKey(shipEntries[nextIndex][0])
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <Button
          aria-label="Previous submarine"
          disabled={shipEntries.length <= 1}
          size="icon"
          type="button"
          onClick={() => selectByOffset(-1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          aria-label="Next submarine"
          disabled={shipEntries.length <= 1}
          size="icon"
          type="button"
          onClick={() => selectByOffset(1)}
        >
          <ChevronRight />
        </Button>
      </div>

      {activeShip ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className="min-w-[80px] truncate text-sm font-medium text-white">
            {activeShip.name}
          </div>
          <Tag color="matcha">Lv {activeShip.rank}</Tag>
          <div className="flex min-w-0 flex-[3] flex-wrap gap-1.5">
            {partSlots.map((slot) => (
              <ShipPart key={slot} ship={activeShip} slot={slot} />
            ))}
          </div>
          <ShipStatusColumn
            ship={activeShip}
            shipStatus={shipStatus}
            onCalculate={onCalculate}
          />
        </div>
      ) : (
        <div className="min-w-[220px] flex-1 text-sm text-white/90">
          请到部队工房管理潜水艇
        </div>
      )}
    </div>
  )
}
