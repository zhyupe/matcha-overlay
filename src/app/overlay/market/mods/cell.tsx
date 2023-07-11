import { useState, useEffect } from 'react'
import { MarketItemMap } from '../interface'
import { HQ } from '../../../../components/icon'
import './cell.css'
import { itemName, queryItem } from '../../../../lib/store/item'
import { Worlds } from '../../../../data/worlds'
import { useFirstGroup, useGlobalCheapest, useLocalCheapest } from './calc'

function Amount({ quantity, hq }: { quantity: number; hq: number }) {
  return (
    <span className="quantity">
      ({(quantity - hq).toLocaleString()}/<HQ />
      {hq.toLocaleString()})
    </span>
  )
}

export function Cell({ world, item, hqOnly }: { world: number; item: MarketItemMap; hqOnly: boolean }): JSX.Element {
  const localCheapest = useLocalCheapest(item, world, hqOnly)
  const globalCheapest = useGlobalCheapest(item, hqOnly)
  const firstGroup = useFirstGroup(item, world, hqOnly)

  if (!localCheapest || !firstGroup) {
    return <td className="no-record">-</td>
  }

  const isGlobalCheapest = localCheapest.price === globalCheapest
  return (
    <td className={isGlobalCheapest ? 'lowest' : ''}>
      <div className="single">
        {localCheapest.price.toLocaleString()}
        <Amount quantity={localCheapest.quantity} hq={localCheapest.hq} />
      </div>
      <div className="group">
        ~
        {(firstGroup.totalPrice / firstGroup.quantity).toLocaleString(undefined, {
          maximumFractionDigits: 0,
        })}
        <Amount quantity={firstGroup.quantity} hq={firstGroup.hq} />
      </div>
    </td>
  )
}

Cell.Empty = function Empty() {
  return (
    <td>
      <div className="single">
        最低价
        <Amount quantity={1} hq={0} />
      </div>
      <div className="group">
        前 N 个均价
        <Amount quantity={10} hq={2} />
      </div>
    </td>
  )
}

Cell.ItemName = function ItemName({ item, language }: { item: number; language: string }) {
  const [name, setName] = useState<string>('')
  useEffect(() => {
    setName('载入中')
    queryItem(item, language)
      .then((record) => setName(itemName(record, language)))
      .catch(() => item)
  }, [item, language])

  return (
    <th key={item} className={name.length >= 6 ? 'small' : ''}>
      {name}
    </th>
  )
}

Cell.WorldName = function WorldName({ id }: { id: number }) {
  const world = Worlds[id]
  return <th>{world?.name || world?.en || id}</th>
}
