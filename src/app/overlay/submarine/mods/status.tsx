import { Button } from '#components/ui/button'
import { Chip, Empty, SegmentedControl } from '#components/ui/controls'
import type { SubmarineRank } from '../../../../data/submarine'
import { formatCondition } from '../lib/condition'
import { getShipPartName, type Ship } from '../lib/ship'

const partSlots = [0, 1, 2, 3] as const

function ShipPart({
  ship,
  slot,
}: {
  ship: Ship
  slot: (typeof partSlots)[number]
}) {
  const condition = ship.conditions?.[slot]
  return (
    <Chip tone={condition === 0 ? 'danger' : undefined}>
      {getShipPartName(ship.type, slot, ship.parts[slot])}
      {condition != null && (
        <span className="text-fg-3">{formatCondition(condition)}</span>
      )}
    </Chip>
  )
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

function ShipStatus({
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
      <>
        <span className="text-xs text-fg-2 tabular-nums">
          速度 {shipStatus?.speed ?? '-'} · 航程 {shipStatus?.range ?? '-'}
        </span>
        <Button variant="primary" size="xs" onClick={onCalculate}>
          计算航线
        </Button>
      </>
    )
  }

  if (ship.status === 2) {
    const isExploring =
      ship.returnTime > 0 && ship.returnTime * 1000 > Date.now()
    return isExploring ? (
      <Chip tone="ok">探索中 · {formatReturnTime(ship.returnTime)} 返回</Chip>
    ) : (
      <Chip tone="ok">探索完成</Chip>
    )
  }

  return <Chip>状态 {ship.status}</Chip>
}

export function VoyageEdit({
  ships,
  activeKey: activeIndex,
  setActiveKey,
  shipStatus,
  onCalculate,
}: {
  ships: Ship[]
  activeKey: number
  setActiveKey: (val: number) => void
  shipStatus: SubmarineRank | null
  onCalculate: () => void
}) {
  const activeShip = ships[activeIndex]

  if (!activeShip) {
    return <Empty>请到部队工房管理潜水艇</Empty>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          label="潜水艇"
          value={String(activeIndex)}
          onValueChange={(value) => setActiveKey(Number(value))}
          options={ships.flatMap((ship, index) =>
            ship ? [{ value: String(index), label: ship.name }] : [],
          )}
        />
        <span className="flex-1" />
        <ShipStatus
          ship={activeShip}
          shipStatus={shipStatus}
          onCalculate={onCalculate}
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip className="text-fg">Lv {activeShip.rank}</Chip>
        {partSlots.map((slot) => (
          <ShipPart key={slot} ship={activeShip} slot={slot} />
        ))}
      </div>
    </div>
  )
}
