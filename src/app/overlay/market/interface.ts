import { type Map as ImmutableMap, type List, Record } from 'immutable'

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

export type MarketItemMap = ImmutableMap<number, List<MarketPriceRecord>>
export type MarketItemsMap = ImmutableMap<number, MarketItemMap>
