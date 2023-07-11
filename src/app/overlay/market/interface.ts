import { List, Record, Map } from 'immutable'

export interface MarketItem {
  id: number
}

export interface MarketRecord {
  price: number
  quantity: number
  hq: boolean
}

export interface MarketLogInfo {
  type: 'data'
  mode: string
  server: { id: number }
  item: MarketItem
  data: number[][]
}

export interface MarketBoardItemListingCountDTO {
  item: number
  world: number
  count: number
}

export interface MarketBoardItemListingDTO {
  item: number
  world: number
  data: MarketRecord[]
}

export type MarketPriceRecord = Record<{
  price: number
  quantity: number
  hq: number
}>
export const MarketPriceRecord = Record({ price: 0, quantity: 0, hq: 0 })

export type MarketItemMap = Map<number, List<MarketPriceRecord>>
export type MarketItemsMap = Map<number, MarketItemMap>
