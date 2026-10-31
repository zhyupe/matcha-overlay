export function imageUrls(
  fetcher: (
    url: string,
    options?: { signal?: AbortSignal },
  ) => Promise<Response> = fetch,
) {
  const pending = new Map<string, Promise<string>>()
  const urls = new Set<string>()
  const controller = new AbortController()
  const keep = (blob: Blob) => {
    controller.signal.throwIfAborted()
    const url = URL.createObjectURL(blob)
    urls.add(url)
    return url
  }
  return {
    load(url: string) {
      if (url.startsWith('data:')) return Promise.resolve(url)
      let result = pending.get(url)
      if (!result) {
        result = fetcher(url, { signal: controller.signal }).then(
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
