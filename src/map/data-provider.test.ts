import { expect, it, vi } from 'vitest'
import { mapDataProvider } from './data-provider'

it('uses worker map commands for every query and discards late replies after disposal', async () => {
  const invoke = vi.fn(async () => [] as never)
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
