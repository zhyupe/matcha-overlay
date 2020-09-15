import React, { useState, useEffect } from 'react'
import { MarketItemRecord, MarketPriceRecord } from '../interface'
import { HQ } from '../../../../components/icon'
import './cell.css'
import { queryItem } from '../../../../lib/store/item'
import { CNWorlds } from '../../../../data/worlds'

function Amount({ quantity, hq }: { quantity: number; hq: number }) {
  return (
    <span className="quantity">
      ({(quantity - hq).toLocaleString()}/<HQ />
      {hq.toLocaleString()})
    </span>
  )
}

export function Cell({ world, item, hqOnly }: { world: number; item: MarketItemRecord; hqOnly: boolean }) {
  let records = item.get('rows').get(world)
  if (records && hqOnly) {
    records = records
      .filter((record) => record.get('hq') !== 0)
      .map((record) =>
        MarketPriceRecord({
          price: record.get('price'),
          quantity: record.get('hq'),
          hq: record.get('hq'),
        }),
      )
  }

  if (!records || records.count() === 0) {
    return <td className="no-record">-</td>
  }

  const localLowest = (records.get(0) as MarketPriceRecord).toJS()
  const firstGroup = records.reduce(
    (ret, record) => {
      if (ret.quantity >= 99) return ret

      const recordQuantity = record.get('quantity')
      return {
        totalPrice: ret.totalPrice + record.get('price') * recordQuantity,
        quantity: ret.quantity + recordQuantity,
        hq: ret.hq + record.get('hq'),
      }
    },
    { totalPrice: 0, quantity: 0, hq: 0 },
  )

  const isGlobalLowest = item.get('rows').every((records) => {
    const lowest = hqOnly ? records.find((record) => record.get('hq') !== 0) : records.get(0)
    return !lowest || lowest.get('price') >= localLowest.price
  })

  return (
    <td className={isGlobalLowest ? 'lowest' : ''}>
      <div className="single">
        {localLowest.price.toLocaleString()}
        <Amount quantity={localLowest.quantity} hq={localLowest.hq} />
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

Cell.ItemName = function ItemName({ item }: { item: number }) {
  const [name, setName] = useState<string>('')
  useEffect(() => {
    setName('载入中')
    queryItem(item)
      .then((record) => setName(record.n))
      .catch(() => 0)
  }, [item])

  return (
    <th key={item} className={name.length >= 6 ? 'small' : ''}>
      {name}
    </th>
  )
}

Cell.WorldName = function WorldName({ id }: { id: number }) {
  return <th>{CNWorlds[id]?.chs || id}</th>
}
