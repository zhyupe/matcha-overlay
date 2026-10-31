import { expect, it, vi } from 'vitest'
import { hostFetch, imageUrls } from './transport'

it('uses the authorized read-only bridge and preserves response bytes and MIME type', async () => {
  const invoke = vi.fn(async () => ({
    body: new TextEncoder().encode('{"value":1}'),
    status: 200,
    headers: { 'content-type': 'application/json' },
  }))
  const fallback = vi.fn()
  const fetcher = hostFetch(invoke, fallback)
  const response = await fetcher('https://example.test/data')
  expect(response.headers.get('content-type')).toBe('application/json')
  expect(await response.json()).toEqual({ value: 1 })
  await expect(
    fetcher('https://example.test/data', { method: 'POST' }),
  ).rejects.toThrow('read-only')
  expect(invoke).toHaveBeenCalledOnce()
  expect(fallback).not.toHaveBeenCalled()
})
it('bounds concurrent requests and skips a cancelled queued read', async () => {
  let active = 0,
    maximum = 0
  const release: (() => void)[] = []
  const invoke = vi.fn(async () => {
    maximum = Math.max(maximum, ++active)
    await new Promise<void>((resolve) => release.push(resolve))
    active--
    return { body: new Uint8Array(), status: 200 }
  })
  const fetcher = hostFetch(invoke, vi.fn())
  const pending = Array.from({ length: 4 }, () =>
    fetcher('https://example.test/data'),
  )
  const controller = new AbortController()
  const cancelled = fetcher('https://example.test/data', {
    signal: controller.signal,
  }).catch((error: Error) => error)
  await Promise.resolve()
  controller.abort()
  for (const resolve of release) resolve()
  await Promise.all(pending)
  expect(await cancelled).toBeInstanceOf(Error)
  expect(maximum).toBe(4)
  expect(invoke).toHaveBeenCalledTimes(4)
})
it('preserves inline image URLs without allocating blobs', async () => {
  const create = vi.spyOn(URL, 'createObjectURL')
  try {
    const images = imageUrls()
    const url = 'data:image/svg+xml,%3Csvg%2F%3E'
    expect(await images.load(url)).toBe(url)
    images.dispose()
    expect(create).not.toHaveBeenCalled()
  } finally {
    create.mockRestore()
  }
})
