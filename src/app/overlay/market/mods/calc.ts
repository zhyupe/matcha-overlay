import { List } from 'immutable'
import { useMemo } from 'react'
import { MarketItemMap, MarketPriceRecord } from '../interface'

const isHQ = (item: MarketPriceRecord) => item.get('hq') !== 0

const findCheapest = (records: List<MarketPriceRecord>, hqOnly: boolean) => {
  return records.find((item) => {
    if (hqOnly) {
      return isHQ(item)
    }

    return true
  })
}

export function useLocalCheapest(item: MarketItemMap, world: number, hqOnly: boolean) {
  return useMemo(() => {
    const records = item.get(world)
    if (!records) {
      return null
    }

    const record = findCheapest(records, hqOnly)
    if (record) {
      return record.toJSON()
    }

    return null
  }, [item, world, hqOnly])
}

export function useGlobalCheapest(item: MarketItemMap, hqOnly: boolean) {
  return useMemo(() => {
    return item.reduce((min, records) => {
      const record = findCheapest(records, hqOnly)
      if (record) {
        const price = record.get('price')
        if (price < min) {
          return price
        }
      }

      return min
    }, Infinity)
  }, [item, hqOnly])
}

export function useFirstGroup(item: MarketItemMap, world: number, hqOnly: boolean) {
  return useMemo(() => {
    const records = item.get(world)
    if (!records) {
      return null
    }

    return records.reduce(
      (ret, record) => {
        if (ret.quantity >= 99 || (hqOnly && !isHQ(record))) return ret

        const recordQuantity = record.get('quantity')
        return {
          totalPrice: ret.totalPrice + record.get('price') * recordQuantity,
          quantity: ret.quantity + recordQuantity,
          hq: ret.hq + record.get('hq'),
        }
      },
      { totalPrice: 0, quantity: 0, hq: 0 },
    )
  }, [item, world, hqOnly])
}
