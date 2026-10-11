import type { FishingEvent } from './model'

export interface Distribution {
  bait_id: number
  fish_id: number
  is_chum: boolean
  tug_type: number
  count: number
  range: { min: number; max: number; effective_min: number; effective_max: number }
  percentiles: { p50: number }
}
export interface FishingStatistics {
  version: 1
  enabled: boolean
  session: string
  revision: number
  cast: FishingEvent | null
  state: 'disabled' | 'waiting' | 'loading' | 'refreshing' | 'ready' | 'empty' | 'stale' | 'error'
  cachedAt: number | null
  distributions: Distribution[]
}
export function matchingStatistics(stats: FishingStatistics | null, cast: FishingEvent) {
  return stats?.enabled && stats.cast?.castId === cast.castId &&
    stats.cast.placeId === cast.placeId && stats.cast.baitId === cast.baitId
    ? stats.distributions : []
}
export function validStatistics(value: FishingStatistics): boolean {
  return value?.version === 1 && typeof value.enabled === 'boolean' &&
    typeof value.session === 'string' && Number.isSafeInteger(value.revision) &&
    (value.cast == null || (typeof value.cast.castId === 'string' && Number.isFinite(value.cast.time) &&
      ['cast', 'place', 'bite', 'hook', 'reel', 'catch', 'end'].includes(value.cast.action) &&
      (value.cast.statuses == null || Array.isArray(value.cast.statuses)))) &&
    Array.isArray(value.distributions) && value.distributions.length <= 10000 &&
    value.distributions.every(d => d && Number.isSafeInteger(d.fish_id) && d.fish_id > 0 &&
      Number.isSafeInteger(d.bait_id) && d.bait_id > 0 && typeof d.is_chum === 'boolean' &&
      [1, 2, 3].includes(d.tug_type) && Number.isSafeInteger(d.count) && d.count >= 10 &&
      d.range?.min > 0 && d.range.min <= d.range.effective_min &&
      d.range.effective_min <= d.range.effective_max && d.range.effective_max <= d.range.max &&
      d.range.max <= 600000 && d.percentiles?.p50 >= d.range.min && d.percentiles.p50 <= d.range.max)
}
export function statisticsMessage(stats: FishingStatistics | null, cast: FishingEvent | null): string {
  if (!stats?.enabled || !cast || stats.cast?.castId !== cast.castId) return ''
  if (cast.placeId == null || cast.placeId === 0 || cast.placeId === 950) return '钓场未知，仅使用本地数据'
  if (cast.baitId == null || cast.baitId === 0) return '鱼饵未知，仅使用本地数据'
  return ({ disabled: '', waiting: '等待可查询的钓场信息', loading: '鱼漂查询中，计时正常运行',
    refreshing: '正在更新鱼漂统计，暂用缓存', ready: '', empty: '暂无社区样本',
    stale: '鱼漂查询失败，暂用缓存', error: '鱼漂暂不可用，使用本地数据' })[stats.state] ?? ''
}
