import { expect, it, vi } from 'vitest'
import { mapDataProvider } from './data-provider'

it('uses worker map commands for every query and discards late replies after disposal', async () => {
  const invoke = vi.fn(async (action: string) => {
    if (action === 'map.get')
      return { rowId: 100, id: 'test/00', marker: 99, sizeFactor: 100 } as never
    if (action === 'map.image')
      return 'mojito-plugin://runtime/client-images/map' as never
    return [] as never
  })
  const { provider, dispose } = mapDataProvider(invoke)
  await provider.getRegion()
  await provider.getMap(100)
  await provider.getMapKeyById('test/00')
  await provider.getMapMarkers({
    rowId: 100,
    id: 'test/00',
    marker: 99,
    sizeFactor: 100,
  })
  expect(invoke.mock.calls).toEqual([
    ['map.regions', undefined],
    ['map.get', { rowId: 100 }],
    ['map.image', { id: 'test/00' }],
    ['map.key', { id: 'test/00' }],
    ['map.markers', { rowId: 100 }],
  ])
  let finish!: (value: never) => void
  invoke.mockImplementationOnce(
    () =>
      new Promise<never>((resolve) => {
        finish = resolve
      }),
  )
  const old = provider.getRegion()
  dispose()
  finish([] as never)
  await expect(old).rejects.toThrow('closed')
  await expect(provider.getRegion()).rejects.toThrow('closed')
})

it('prepares local image URLs before returning map data and caches missing icons', async () => {
  const invoke = vi.fn(
    async (action: string, input?: Record<string, unknown>) => {
      if (action === 'map.get') return { rowId: 1, id: 's1f1/00' } as never
      if (action === 'map.image') return 'mojito-plugin://runtime/map' as never
      if (action === 'map.markers')
        return [{ icon: 60561 }, { icon: 60561 }, { icon: 1 }] as never
      if (action === 'map.icon')
        return (
          input?.id === 60561 ? 'mojito-plugin://runtime/icon' : null
        ) as never
      throw new Error(action)
    },
  )
  const source = mapDataProvider(invoke)
  const map = await source.provider.getMap(1)
  expect(source.mapUrl(map.id)).toBe('mojito-plugin://runtime/map')
  await source.provider.getMapMarkers(map)
  await source.loadIcons([60561, 1])
  expect(source.iconUrl(60561)).toBe('mojito-plugin://runtime/icon')
  expect(source.iconUrl(1)).toBeNull()
  expect(
    invoke.mock.calls.filter(([action]) => action === 'map.icon'),
  ).toHaveLength(2)
  source.dispose()
  const next = mapDataProvider(invoke)
  expect(next.iconUrl(60561)).toBeNull()
  expect(() => next.mapUrl(map.id)).toThrow()
})

it('rejects missing map images instead of falling back to remote images', async () => {
  const source = mapDataProvider(
    async (action) =>
      (action === 'map.get' ? { id: 's1f1/00' } : null) as never,
  )
  await expect(source.provider.getMap(1)).rejects.toThrow('地图图片不存在')
})
