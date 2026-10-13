import { debounce } from 'debounce'
import { LRUCache } from 'lru-cache'
import { tryParseJson } from './json'

export class Cache<K extends {}, V extends {}> extends LRUCache<K, V> {
  private version?: string

  constructor(
    private name: string,
    options: LRUCache.Options<K, V, unknown> & { version?: string },
  ) {
    super({
      ...options,
      dispose: (value, key, reason) => {
        this.saveToStorage()
        if (options.dispose) {
          options.dispose(value, key, reason)
        }
      },
    })

    if (options.version) {
      this.version = options.version
    }

    this.loadFromStorage()
  }

  loadFromStorage() {
    if (!window.localStorage) return

    if (this.version) {
      const storageVersion = window.localStorage.getItem(`${this.name}:ver`)
      if (storageVersion !== this.version) return
    }

    const dump = window.localStorage.getItem(this.name)
    if (!dump) return

    const data = tryParseJson<[K, LRUCache.Entry<V>][]>(dump)
    // Older lru-cache versions stored objects instead of [key, entry] tuples.
    if (
      Array.isArray(data) &&
      data.every((entry) => Array.isArray(entry) && entry.length === 2)
    ) {
      this.load(data)
    }
  }

  saveToStorage = debounce(() => {
    if (!window.localStorage) return
    window.localStorage.setItem(this.name, JSON.stringify(this.dump()))
  }, 200)

  override set(
    key: K,
    value: V | undefined,
    options?: LRUCache.SetOptions<K, V, unknown>,
  ): this {
    const result = super.set(key, value, options)
    this.saveToStorage()

    return result
  }
}
