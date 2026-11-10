import { Check } from 'lucide-react'
import {
  type ReactElement,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react'
import { Chip } from '#components/ui/controls'
import { adapter } from '../../../../adapter'
import { HQ } from '../../../../components/icon'
import { ItemIcon } from '../../../../components/item-icon'
import type { MarketItemMap } from '../interface'
import './cell.css'
import { Worlds } from '../../../../data/worlds'
import {
  type ItemRecord,
  itemName,
  queryItem,
} from '../../../../lib/store/item'
import { useFirstGroup, useGlobalCheapest, useLocalCheapest } from './calc'

function Quantity({ quantity, hq }: { quantity: number; hq: number }) {
  return (
    <span className="quantity">
      ×{quantity.toLocaleString()}
      {hq > 0 && (
        <>
          {' · '}
          <HQ />
          {hq.toLocaleString()}
        </>
      )}
    </span>
  )
}

export function Cell({
  world,
  item,
  hqOnly,
}: {
  world: number
  item: MarketItemMap
  hqOnly: boolean
}): ReactElement {
  const localCheapest = useLocalCheapest(item, world, hqOnly)
  const globalCheapest = useGlobalCheapest(item, hqOnly)
  const firstGroup = useFirstGroup(item, world, hqOnly)

  if (!localCheapest || !firstGroup) {
    return <td className="no-record">—</td>
  }

  const isGlobalCheapest = localCheapest.price === globalCheapest
  return (
    <td className={isGlobalCheapest ? 'lowest' : ''}>
      <div className="price">
        <b>{localCheapest.price.toLocaleString()}</b>
        <Quantity quantity={localCheapest.quantity} hq={localCheapest.hq} />
        {isGlobalCheapest && (
          <Chip tone="ok">
            <Check />
            最低
          </Chip>
        )}
      </div>
      <div className="group">
        前 {firstGroup.quantity.toLocaleString()} 个均价{' '}
        {(firstGroup.totalPrice / firstGroup.quantity).toLocaleString(
          undefined,
          { maximumFractionDigits: 0 },
        )}
      </div>
    </td>
  )
}

type ItemNameProps = { item: number; language: string }

Cell.ItemName = function ItemNameSource(props: ItemNameProps) {
  const { mapGeneration } = useSyncExternalStore(
    adapter.subscribeState,
    adapter.getState,
  )
  return <ItemName key={mapGeneration} {...props} />
}

function ItemName({ item, language }: ItemNameProps) {
  const [record, setRecord] = useState<ItemRecord | null>(null)
  const [name, setName] = useState<string>('')
  useEffect(() => {
    setRecord(null)
    setName('载入中')
    queryItem(item, language)
      .then((record) => {
        setRecord(record)
        setName(itemName(record, language))
      })
      .catch(() => setName(String(item)))
  }, [item, language])

  return (
    <th key={item}>
      <span className="item-head">
        <ItemIcon record={record} className="size-6" />
        <span className="truncate">{name}</span>
      </span>
    </th>
  )
}

Cell.WorldName = function WorldName({ id }: { id: number }) {
  const world = Worlds[id]
  return <th>{world?.name || world?.en || id}</th>
}
