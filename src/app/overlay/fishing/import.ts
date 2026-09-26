import { type Archive, parseArchive } from './model'

export interface FishingRanges {
  format: 'matcha-fishing-ranges'
  version: 1
  ranges: {
    placeId: number
    fishId: number
    baitId: number
    biteSeconds: [number, number]
    tug?: 1 | 2 | 3
    chum?: boolean
    snagging?: boolean
    mooch?: boolean
  }[]
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const positiveId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const rangeKeys = new Set([
  'placeId',
  'fishId',
  'baitId',
  'biteSeconds',
  'tug',
  'chum',
  'snagging',
  'mooch',
])

export function parseFishingImport(text: string): Archive {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('文件不是有效的 JSON。')
  }
  if (isObject(data) && !('format' in data)) return parseArchive(text)
  if (
    !isObject(data) ||
    data.format !== 'matcha-fishing-ranges' ||
    data.version !== 1
  )
    throw new Error(
      '区间文件需要 format: "matcha-fishing-ranges" 和 version: 1。',
    )
  if (
    Object.keys(data).some(
      (key) => !['format', 'version', 'ranges'].includes(key),
    )
  )
    throw new Error('区间文件只支持 format、version 和 ranges 字段。')
  if (!Array.isArray(data.ranges) || data.ranges.length > 10000)
    throw new Error('ranges 必须是数组，最多 10000 条区间数据。')

  const profiles = data.ranges.map((range: unknown, index: number) => {
    const fail = (message: string): never => {
      throw new Error(`第 ${index + 1} 条区间：${message}`)
    }
    if (!isObject(range)) return fail('需要一个对象。')
    const unknownKey = Object.keys(range).find((key) => !rangeKeys.has(key))
    if (unknownKey) return fail(`不支持字段 ${unknownKey}。`)
    const { placeId, fishId, baitId, biteSeconds, tug } = range
    if (!positiveId(placeId) || !positiveId(fishId) || !positiveId(baitId))
      return fail('placeId、fishId、baitId 必须是正整数 ID。')
    if (
      !Array.isArray(biteSeconds) ||
      biteSeconds.length !== 2 ||
      !biteSeconds.every(
        (value) =>
          typeof value === 'number' &&
          value > 0 &&
          positiveId(Math.round(value * 1000)),
      ) ||
      biteSeconds[0] > biteSeconds[1]
    )
      return fail(
        'biteSeconds 必须是 [最小秒数, 最大秒数]，换算并四舍五入为毫秒后必须为正整数。',
      )
    if ('tug' in range && tug !== 1 && tug !== 2 && tug !== 3)
      return fail('tug 必须是 1（轻杆）、2（中杆）或 3（重杆）；未知时省略。')
    for (const key of ['chum', 'snagging', 'mooch']) {
      if (key in range && typeof range[key] !== 'boolean')
        return fail(`${key} 必须是布尔值；省略时为 false。`)
    }
    return {
      placeId,
      fishId,
      baitId,
      minMs: Math.round(biteSeconds[0] * 1000),
      maxMs: Math.round(biteSeconds[1] * 1000),
      tug,
      chum: range.chum ?? false,
      snagging: range.snagging ?? false,
      mooch: range.mooch ?? false,
    }
  })
  return parseArchive(JSON.stringify({ version: 1, catches: [], profiles }))
}
