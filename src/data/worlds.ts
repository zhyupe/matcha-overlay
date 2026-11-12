/* eslint-disable */

export interface IWorldData {
  region: string
  dc?: number
  name?: string
  en: string
}

export enum DC {
  陆行鸟 = 1,
  莫古力 = 6,
  猫小胖 = 7,
  豆豆柴 = 8,
}

export const Worlds: Record<number, IWorldData> = {}
