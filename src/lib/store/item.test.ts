import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({
  name: 'Mojito',
  generation: 0,
  local: vi.fn(),
  remote: vi.fn(),
  cached: vi.fn(),
}))
vi.mock('../../adapter', () => ({
  adapter: {
    get name() {
      return mock.name
    },
    getState: () => ({ mapGeneration: mock.generation }),
  },
}))
vi.mock('../../adapter/mojito', () => ({ queryItems: mock.local }))
vi.mock('../xivapi', () => ({ xivapi: { items: { list: mock.remote } } }))
vi.mock('../cache', () => ({
  Cache: class {
    get = mock.cached
    set() {}
  },
}))
beforeEach(() => {
  vi.useFakeTimers()
  vi.resetModules()
  vi.clearAllMocks()
  mock.name = 'Mojito'
  mock.generation = 0
})
afterEach(() => vi.useRealTimers())
const item = {
  id: 42,
  n: { chs: '本地装备' },
  i: 'mojito-plugin://runtime/icon',
  s: 2,
  a: 0,
  l: 740,
  local: true,
}

it('batches local lookups and bypasses the persistent XIVAPI cache', async () => {
  mock.cached.mockReturnValue({ n: { chs: '旧缓存' }, l: 1 })
  mock.local.mockResolvedValue([item])
  const { queryItem, itemName } = await import('./item')
  const result = Promise.all([queryItem(42, 'chs'), queryItem(42, 'en')])
  await vi.advanceTimersByTimeAsync(200)
  expect(await result).toEqual([item, item])
  expect(itemName(item, 'en')).toBe('本地装备')
  expect(mock.local).toHaveBeenCalledExactlyOnceWith([42])
  expect(mock.remote).not.toHaveBeenCalled()
  expect(mock.cached).not.toHaveBeenCalled()
})
it('does not fall back to HTTP when local access is denied', async () => {
  mock.local.mockRejectedValue(new Error('permission_denied'))
  const { queryItem } = await import('./item')
  const result = expect(queryItem(42, 'chs')).rejects.toThrow(
    'permission_denied',
  )
  await vi.advanceTimersByTimeAsync(200)
  await result
  expect(mock.remote).not.toHaveBeenCalled()
})
it('rejects a result from the previous client generation', async () => {
  let resolve!: (rows: (typeof item)[]) => void
  mock.local.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r
      }),
  )
  const { queryItem } = await import('./item')
  const result = expect(queryItem(42, 'chs')).rejects.toThrow(
    '物品数据源已改变',
  )
  await vi.advanceTimersByTimeAsync(200)
  mock.generation++
  resolve([item])
  await result
})
it('keeps ACT item queries on XIVAPI', async () => {
  mock.name = 'ACT'
  mock.cached.mockReturnValue(undefined)
  mock.remote.mockResolvedValue({
    rows: [
      {
        row_id: 42,
        fields: {
          Icon: '/i/42.png',
          LevelItem: 740,
          MateriaSlotCount: 2,
          IsAdvancedMeldingPermitted: false,
          'Name@lang(en)': 'Online item',
        },
      },
    ],
  })
  const { queryItem } = await import('./item')
  const result = queryItem(42, 'en')
  await vi.advanceTimersByTimeAsync(200)
  expect(await result).toMatchObject({ n: { en: 'Online item' }, l: 740 })
  expect(mock.remote).toHaveBeenCalledOnce()
  expect(mock.local).not.toHaveBeenCalled()
})
