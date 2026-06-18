import { Plus, Trash } from '../../../../components/icon'
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#components/ui/select'
import { type Ship, ShipType, getShipParts, useShips } from '../lib/ship'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const labelClass = 'flex min-w-[120px] flex-1 flex-col gap-[3px]'
const labelTextClass = 'text-xs text-white/70'

function ShipPartSelect({
  ship,
  slot,
  onChange,
}: {
  ship: Ship
  slot: number
  onChange: (value: Ship) => void
}) {
  const { title, parts } = getShipParts(ship.type, slot)
  const items = [
    { value: '0', label: 'None' },
    ...parts.map((part) => ({
      value: part.value.toString(),
      label: part.label,
    })),
  ]

  return (
    <label className={labelClass}>
      <span className={labelTextClass}>{title}</span>
      <Select
        items={items}
        value={ship.parts[slot].toString()}
        onValueChange={(nextValue) => {
          const nextParts = [...ship.parts] as Ship['parts']
          nextParts[slot] = Number(nextValue)
          onChange({ ...ship, parts: nextParts })
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="None" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">None</SelectItem>
          {parts.map((part) => (
            <SelectItem key={part.value} value={part.value.toString()}>
              {part.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

function ShipEditor({
  value,
  onChange,
}: {
  value: Ship
  onChange: (value: Ship) => void
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
      <label className="flex min-w-[160px] flex-[1.4] flex-col gap-[3px]">
        <span className={labelTextClass}>Name</span>
        <Input
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </label>
      <label className="flex w-20 flex-none flex-col gap-[3px]">
        <span className={labelTextClass}>Lv</span>
        <Input
          min={1}
          type="number"
          value={value.rank}
          onChange={(event) =>
            onChange({ ...value, rank: Number(event.target.value) || 1 })
          }
        />
      </label>
      {[0, 1, 2, 3].map((slot) => (
        <ShipPartSelect
          key={slot}
          ship={value}
          slot={slot}
          onChange={onChange}
        />
      ))}
    </div>
  )
}

export function VoyageEdit({
  ships,
  activeKey,
  setActiveKey,
}: {
  ships: ReturnType<typeof useShips>
  activeKey?: string
  setActiveKey: (val: string) => void
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
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex items-end gap-1">
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
        <ShipEditor value={activeShip} onChange={ships.update} />
      ) : (
        <div className="min-w-[220px] flex-1 pb-1 text-white/90">
          Waiting for submarine status log.
        </div>
      )}

      <div className="flex items-end gap-1">
        <Button
          aria-label="Add submarine"
          size="icon"
          type="button"
          onClick={() => setActiveKey(ships.create())}
        >
          <Plus />
        </Button>
        <Button
          aria-label="Delete submarine"
          disabled={!activeShip}
          size="icon"
          type="button"
          onClick={() => {
            if (!activeShip) return
            ships.remove(activeShip)
            const fallback = shipEntries.find(([key]) => key !== activeShip.key)
            setActiveKey(fallback?.[0] || '')
          }}
        >
          <Trash />
        </Button>
      </div>
    </div>
  )
}
