import type { Value } from '@ffcafe/mojito-plugin-sdk'

export function hostFetch(
  invoke: (url: string, signal: AbortSignal) => Promise<Value>,
  fallback: typeof fetch,
): typeof fetch {
  const slots = Array.from({ length: 4 }, () => Promise.resolve())
  let next = 0
  return async (input, options) => {
    const request = new Request(input, options)
    if (new URL(request.url).protocol !== 'https:')
      return fallback(input, options)
    if (request.method !== 'GET')
      throw new Error('Only read-only resource requests are supported')
    const slot = next++ % slots.length
    const result = slots[slot].then(async () => {
      request.signal.throwIfAborted()
      const value = await invoke(request.url, request.signal)
      if (
        !value ||
        typeof value !== 'object' ||
        !('body' in value) ||
        !(value.body instanceof Uint8Array) ||
        !('status' in value) ||
        typeof value.status !== 'number'
      )
        throw new Error('Invalid resource response')
      const headers =
        'headers' in value && value.headers && typeof value.headers === 'object'
          ? (value.headers as Record<string, string>)
          : {}
      return new Response(new Uint8Array(value.body), {
        status: value.status,
        headers,
      })
    })
    slots[slot] = result.then(
      () => {},
      () => {},
    )
    return result
  }
}

export function imageUrls() {
  const pending = new Map<string, Promise<string>>()
  const inline = new Map<string, string>()
  const urls = new Set<string>()
  const controller = new AbortController()
  const keep = (blob: Blob) => {
    controller.signal.throwIfAborted()
    const url = URL.createObjectURL(blob)
    urls.add(url)
    return url
  }
  const data = (url: string) => {
    const existing = inline.get(url)
    if (existing) return existing
    const comma = url.indexOf(',')
    const header = url.slice(5, comma)
    const content = url.slice(comma + 1)
    const bytes = header.endsWith(';base64')
      ? Uint8Array.from(atob(content), (letter) => letter.charCodeAt(0))
      : new TextEncoder().encode(decodeURIComponent(content))
    const result = keep(new Blob([bytes], { type: header.split(';')[0] }))
    inline.set(url, result)
    return result
  }
  return {
    data,
    load(url: string) {
      if (url.startsWith('data:')) return Promise.resolve(data(url))
      let result = pending.get(url)
      if (!result) {
        result = fetch(url, { signal: controller.signal }).then(
          async (response) => {
            if (!response.ok)
              throw new Error(`Image request failed: ${response.status}`)
            return keep(await response.blob())
          },
        )
        pending.set(url, result)
      }
      return result
    },
    dispose() {
      controller.abort()
      for (const url of urls) URL.revokeObjectURL(url)
      urls.clear()
    },
  }
}
