import { beforeEach, expect, it, vi } from 'vitest'
import { emptyArchive } from './model'
import { removeInvalidFishingArchive } from './use-fishing'

const storage = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => string | null>(),
  removeItem: vi.fn<(key: string) => void | Promise<void>>(),
}))
vi.mock('../../../adapter', () => ({ adapter: { storage } }))

const key = 'matcha-fishing-v1'
const invalid = '{broken archive'
let items: Map<string, string>

beforeEach(() => {
  vi.resetAllMocks()
  items = new Map([
    [key, invalid],
    ['config:app-minified', 'true'],
    ['gearset-item', 'equipment'],
    ['matcha-fishing-v2', 'other archive'],
  ])
  storage.getItem.mockImplementation((key) => items.get(key) ?? null)
  storage.removeItem.mockImplementation((key) => {
    items.delete(key)
  })
})

it.each([
  invalid,
  '',
  JSON.stringify({ version: 0, catches: [], profiles: [] }),
  JSON.stringify({ ...emptyArchive(), profiles: [{}] }),
])('removes only the rejected fishing archive: %s', async (text) => {
  items.set(key, text)
  await removeInvalidFishingArchive(text)
  expect(storage.removeItem).toHaveBeenCalledExactlyOnceWith(key)
  expect([...items]).toEqual([
    ['config:app-minified', 'true'],
    ['gearset-item', 'equipment'],
    ['matcha-fishing-v2', 'other archive'],
  ])
})

it('refuses to remove a valid archive even when its contents match', async () => {
  const text = JSON.stringify(emptyArchive())
  items.set(key, text)
  await expect(removeInvalidFishingArchive(text)).rejects.toThrow('存档有效')
  expect(storage.removeItem).not.toHaveBeenCalled()
  expect(items.get(key)).toBe(text)
})

it.each([
  JSON.stringify(emptyArchive()),
  '{different corruption',
  null,
])('refuses to clear data changed since the error was detected: %s', async (text) => {
  if (text === null) items.delete(key)
  else items.set(key, text)
  await expect(removeInvalidFishingArchive(invalid)).rejects.toThrow('已变化')
  expect(storage.removeItem).not.toHaveBeenCalled()
  expect(items.get(key) ?? null).toBe(text)
})

it('does not remove anything when storage access fails', async () => {
  storage.getItem.mockImplementation(() => {
    throw new Error('access denied')
  })
  await expect(removeInvalidFishingArchive(invalid)).rejects.toThrow(
    'access denied',
  )
  expect(storage.removeItem).not.toHaveBeenCalled()
  expect(items.get(key)).toBe(invalid)
})

it('waits for the host to confirm deletion', async () => {
  let finish!: () => void
  storage.removeItem.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  const completed = vi.fn()
  const pending = removeInvalidFishingArchive(invalid).then(completed)
  await Promise.resolve()
  expect(completed).not.toHaveBeenCalled()
  finish()
  await pending
  expect(completed).toHaveBeenCalledOnce()
})

it('reports a failed deletion without discarding the stored archive', async () => {
  storage.removeItem.mockRejectedValue(new Error('host rejected deletion'))
  await expect(removeInvalidFishingArchive(invalid)).rejects.toThrow(
    'host rejected deletion',
  )
  expect(items.get(key)).toBe(invalid)
})
