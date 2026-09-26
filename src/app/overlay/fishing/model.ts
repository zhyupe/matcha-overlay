import { FishingCatalog } from '../../../data/fishing'

export interface FishingEvent {
  action:
    | 'cast'
    | 'place'
    | 'bite'
    | 'hook'
    | 'reel'
    | 'catch'
    | 'end'
    | 'quit'
    | 'reset'
    | 'bait'
  time: number
  castId: string | null
  actorId: number
  castTime: number | null
  biteTime: number | null
  hookTime: number | null
  baitId: number | null
  baseBaitId: number | null
  placeId: number | null
  tug: number | null
  fishId: number | null
  mooch: boolean | null
  chum: boolean | null
  snagging: boolean | null
  statuses: number[] | null
}

export interface Profile {
  placeId: number
  fishId: number
  baitId: number
  chum: boolean
  snagging: boolean
  mooch: boolean
  tug?: number
  minMs?: number
  maxMs?: number
  // Curated prerequisites, not inferred from time samples.
  requiredStatuses?: number[]
  hours?: [number, number]
  weatherIds?: number[]
  note?: string
}

export interface Archive {
  version: 1
  catches: FishingEvent[]
  profiles: Profile[]
}
export const emptyArchive = (): Archive => ({
  version: 1,
  catches: [],
  profiles: [],
})
export const catalog = FishingCatalog
export const itemName = (id: number | null) =>
  id == null
    ? '未知鱼饵'
    : catalog.fish[id] || catalog.tackle[id] || `物品 #${id}`
export const placeName = (id: number | null) =>
  id == null ? '等待钓场信息' : catalog.places[id] || `钓场 #${id}`
export const tugName = (tug: number | null | undefined) =>
  ['未知', '轻杆 !', '中杆 !!', '重杆 !!!'][tug || 0] || '未知'
export const elapsed = (cast: FishingEvent, now: number) =>
  cast.castTime == null
    ? 0
    : Math.max(0, (cast.biteTime ?? cast.hookTime ?? now) - cast.castTime)

export function transition(
  current: FishingEvent | null,
  next: FishingEvent,
): FishingEvent | null {
  if (!Number.isFinite(next.time) || (current && next.time < current.time))
    return current
  if (next.action === 'reset' || next.action === 'quit') return null
  if (next.action === 'bait') return current
  if (!next.castId || next.castTime == null) return current
  if (next.action === 'cast') {
    if (current?.castId === next.castId) return current
    return next
  }
  if (current && current.castId !== next.castId) return current
  // Snapshots allow a newly opened overlay to join an already active cast.
  if (current?.action === 'catch' || current?.action === 'end') return current
  const rank = {
    cast: 0,
    place: 0,
    bite: 1,
    hook: 2,
    reel: 3,
    catch: 4,
    end: 4,
    quit: 5,
    reset: 5,
    bait: 0,
  }
  if (current && rank[next.action] < rank[current.action]) return current
  return next
}

export function recordCatch(archive: Archive, event: FishingEvent): Archive {
  if (
    event.action !== 'catch' ||
    !event.castId ||
    !event.fishId ||
    event.castTime == null ||
    event.biteTime == null ||
    event.biteTime <= event.castTime ||
    event.time < event.biteTime ||
    ![1, 2, 3].includes(event.tug || 0)
  )
    return archive
  if (archive.catches.some((c) => c.castId === event.castId)) return archive
  return { ...archive, catches: [...archive.catches, event].slice(-2000) }
}

const combo = (a: Profile | FishingEvent, b: FishingEvent) =>
  a.placeId === b.placeId &&
  a.baitId === b.baitId &&
  a.chum === b.chum &&
  a.snagging === b.snagging &&
  a.mooch === b.mooch
const knownCombo = (c: FishingEvent) =>
  c.placeId != null &&
  c.baitId != null &&
  c.chum != null &&
  c.snagging != null &&
  c.mooch != null

export interface Candidate {
  fishId: number
  name: string
  tug: number | null
  minMs?: number
  maxMs?: number
  allBaitsMinMs?: number
  allBaitsMaxMs?: number
  count: number
  result: 'match' | 'unknown' | 'outside' | 'excluded'
  reason: string
  note?: string
  source: 'manual' | 'observed' | 'none'
}

export function predict(
  cast: FishingEvent,
  archive: Archive,
  now: number,
  toleranceMs = 1500,
  weatherId?: number,
): Candidate[] {
  const ids = new Set(catalog.placefish[cast.placeId ?? ''] || [])
  archive.profiles
    .filter((p) => p.placeId === cast.placeId)
    .forEach((p) => {
      ids.add(p.fishId)
    })
  archive.catches
    .filter((c) => c.placeId === cast.placeId && c.fishId)
    .forEach((c) => {
      if (c.fishId != null) ids.add(c.fishId)
    })
  const time = elapsed(cast, now)
  const hour = ((cast.castTime ?? now) / 175000) % 24
  const rows = [...ids].map((fishId): Candidate => {
    const profile = knownCombo(cast)
      ? archive.profiles.find((p) => p.fishId === fishId && combo(p, cast))
      : undefined
    const samples = knownCombo(cast)
      ? archive.catches.filter((c) => c.fishId === fishId && combo(c, cast))
      : []
    const times = samples
      .map((c) => elapsed(c, c.time))
      .filter((t) => Number.isFinite(t) && t > 0)
    // Empirical bounds are soft evidence: sparse observations are never absolute exclusions.
    const minMs =
      profile?.minMs ?? (times.length ? Math.min(...times) : undefined)
    const maxMs =
      profile?.maxMs ?? (times.length ? Math.max(...times) : undefined)
    const allBaitProfiles = archive.profiles.filter(
      (p) => p.fishId === fishId && p.placeId === cast.placeId,
    )
    const allBaitTimes = archive.catches
      .filter((c) => c.fishId === fishId && c.placeId === cast.placeId)
      .map((c) => elapsed(c, c.time))
      .filter((t) => Number.isFinite(t) && t > 0)
    const allBaitBounds = [
      ...allBaitTimes,
      ...allBaitProfiles.flatMap((p) =>
        p.minMs != null && p.maxMs != null ? [p.minMs, p.maxMs] : [],
      ),
    ]
    const observedTugs = new Set(
      archive.catches.filter((c) => c.fishId === fishId).map((c) => c.tug),
    )
    const tug =
      profile?.tug ??
      (observedTugs.size === 1 ? [...observedTugs][0] : null) ??
      null
    const row: Candidate = {
      fishId,
      name: itemName(fishId),
      tug,
      minMs,
      maxMs,
      allBaitsMinMs: allBaitBounds.length
        ? Math.min(...allBaitBounds)
        : undefined,
      allBaitsMaxMs: allBaitBounds.length
        ? Math.max(...allBaitBounds)
        : undefined,
      count: times.length,
      result: 'unknown',
      reason: '缺少此鱼饵的时间统计',
      note: profile?.note,
      source:
        profile?.minMs != null ? 'manual' : times.length ? 'observed' : 'none',
    }
    if (cast.tug != null && tug != null && cast.tug !== tug)
      return { ...row, result: 'excluded', reason: '上钩强度不符' }
    if (
      profile?.requiredStatuses?.some(
        (id) => cast.statuses != null && !cast.statuses.includes(id),
      )
    )
      return { ...row, result: 'excluded', reason: '所需状态不满足' }
    if (profile?.hours) {
      const [start, end] = profile.hours
      const inWindow =
        start < end ? hour >= start && hour < end : hour >= start || hour < end
      if (!inWindow)
        return { ...row, result: 'excluded', reason: '不在艾欧泽亚时间窗口' }
    }
    if (
      profile?.weatherIds?.length &&
      weatherId != null &&
      !profile.weatherIds.includes(weatherId)
    )
      return { ...row, result: 'excluded', reason: '天气条件不满足' }
    const unknownCondition =
      (profile?.requiredStatuses?.length && cast.statuses == null) ||
      (profile?.weatherIds?.length && weatherId == null) ||
      profile?.note
    if (minMs != null && maxMs != null) {
      const outside =
        time > maxMs + toleranceMs ||
        (cast.biteTime != null && time < minMs - toleranceMs)
      return {
        ...row,
        result: outside ? 'outside' : unknownCondition ? 'unknown' : 'match',
        reason: outside
          ? '超出已知区间（仍可能上钩）'
          : unknownCondition
            ? '时间相符，前置条件待确认'
            : cast.biteTime == null && time < minMs
              ? '尚未进入已知区间'
              : '时间相符；前置条件未完整收录',
      }
    }
    return row
  })
  const rank = { match: 0, unknown: 1, outside: 2, excluded: 3 }
  return rows.sort(
    (a, b) =>
      rank[a.result] - rank[b.result] ||
      (a.minMs ?? Infinity) - (b.minMs ?? Infinity) ||
      a.fishId - b.fishId,
  )
}

const positive = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n > 0
export function parseArchive(text: string): Archive {
  const data = JSON.parse(text)
  if (
    data?.version !== 1 ||
    !Array.isArray(data.catches) ||
    !Array.isArray(data.profiles) ||
    data.catches.length > 2000 ||
    data.profiles.length > 10000
  )
    throw new Error(
      '需要 version: 1、catches 和 profiles 数组；最多 2000 条鱼获和 10000 条区间数据。',
    )
  for (const p of data.profiles) {
    if (
      !p ||
      !positive(p.placeId) ||
      !positive(p.fishId) ||
      !positive(p.baitId) ||
      ['chum', 'snagging', 'mooch'].some((k) => typeof p[k] !== 'boolean') ||
      (p.tug != null && ![1, 2, 3].includes(p.tug)) ||
      ((p.minMs != null || p.maxMs != null) &&
        (!positive(p.minMs) || !positive(p.maxMs) || p.minMs > p.maxMs)) ||
      (p.note != null && (typeof p.note !== 'string' || p.note.length > 500)) ||
      (p.requiredStatuses != null &&
        (!Array.isArray(p.requiredStatuses) ||
          !p.requiredStatuses.every(positive))) ||
      (p.weatherIds != null &&
        (!Array.isArray(p.weatherIds) || !p.weatherIds.every(positive))) ||
      (p.hours != null &&
        (!Array.isArray(p.hours) ||
          p.hours.length !== 2 ||
          !p.hours.every(
            (n: unknown) =>
              typeof n === 'number' && Number.isFinite(n) && n >= 0 && n < 24,
          ) ||
          p.hours[0] === p.hours[1]))
    )
      throw new Error(
        '区间数据格式无效：请检查鱼种、鱼饵、状态、时间区间和前置条件。',
      )
  }
  let result: Archive = { version: 1, catches: [], profiles: data.profiles }
  for (const c of data.catches) {
    if (
      !c ||
      typeof c.castId !== 'string' ||
      !positive(c.time) ||
      !positive(c.actorId) ||
      !positive(c.castTime) ||
      !positive(c.biteTime) ||
      !positive(c.fishId) ||
      ['baitId', 'baseBaitId', 'placeId'].some(
        (k) => c[k] !== null && !positive(c[k]),
      ) ||
      ['chum', 'snagging', 'mooch'].some(
        (k) => c[k] !== null && typeof c[k] !== 'boolean',
      ) ||
      (c.statuses !== null &&
        (!Array.isArray(c.statuses) || !c.statuses.every(positive)))
    )
      throw new Error('鱼获记录格式无效。')
    const next = recordCatch(result, c)
    if (next === result) throw new Error('鱼获记录重复或缺少有效的咬钩时间。')
    result = next
  }
  const keys = data.profiles.map((p: Profile) =>
    [p.placeId, p.fishId, p.baitId, p.chum, p.snagging, p.mooch].join(':'),
  )
  if (new Set(keys).size !== keys.length)
    throw new Error('存在重复的鱼种 / 鱼饵 / 状态区间数据。')
  return result
}

export function mergeArchives(current: Archive, imported: Archive): Archive {
  const catches = new Map(current.catches.map((c) => [c.castId, c]))
  for (const caught of imported.catches) catches.set(caught.castId, caught)
  const key = (p: Profile) =>
    [p.placeId, p.fishId, p.baitId, p.chum, p.snagging, p.mooch].join(':')
  const profiles = new Map(current.profiles.map((p) => [key(p), p]))
  for (const profile of imported.profiles) profiles.set(key(profile), profile)
  if (profiles.size > 10000) throw new Error('合并后超过 10000 条区间数据。')
  return {
    version: 1,
    catches: [...catches.values()].sort((a, b) => a.time - b.time).slice(-2000),
    profiles: [...profiles.values()],
  }
}
