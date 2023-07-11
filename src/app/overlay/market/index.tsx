import { useState } from 'react'
import './index.css'
import { List, Map } from 'immutable'
import {
  MarketRecord,
  MarketPriceRecord,
  MarketBoardItemListingCountDTO,
  MarketBoardItemListingDTO,
  MarketItemsMap,
} from './interface'
import { OverlayProps } from '../../interface'
import { useEvent } from '../../../lib/event'
import { MarketTable } from './mods/table'

function updatePriceRow(records: List<MarketPriceRecord>, data: MarketRecord[]): List<MarketPriceRecord> {
  const ret = data.reduce((records, { price, quantity, hq }) => {
    const index = records.findIndex((record) => record.get('price') === price)
    if (index === -1) {
      return records.push(
        MarketPriceRecord({
          price,
          quantity,
          hq: hq ? quantity : 0,
        }),
      )
    }

    return records.update(index, (record) =>
      record!.update('quantity', (value) => value + quantity).update('hq', (value) => value + (hq ? quantity : 0)),
    )
  }, records)

  return ret
}

export function MarketOverlay({ language, eventEmitter, active, setActive }: OverlayProps) {
  const [worlds, setWorlds] = useState(() => List<number>())
  const [items, setItems] = useState<MarketItemsMap>(() => Map())

  const reset = () => {
    setWorlds((servers) => servers.clear())
    setItems((items) => items.clear())
  }

  useEvent<MarketBoardItemListingDTO>(eventEmitter, 'MarketBoardItemListing', (data) => {
    if (!active) {
      setActive()
    }

    setWorlds((servers) => {
      if (!servers.includes(data.world)) {
        return servers.push(data.world)
      } else {
        return servers
      }
    })

    setItems((items) =>
      items.update(data.item, (item = Map()) => {
        return item.update(data.world, (records = List()) => updatePriceRow(records, data.data))
      }),
    )
  })

  useEvent<MarketBoardItemListingCountDTO>(eventEmitter, 'MarketBoardItemListingCount', (data) => {
    setItems((items) => {
      return items.update(data.item, (item = Map()) => item.set(data.world, List()))
    })
  })

  if (!active) return null

  return <MarketTable worlds={worlds} items={items} language={language} onReset={reset} />
}
