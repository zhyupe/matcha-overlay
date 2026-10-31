import { debounce } from 'debounce'
import { LRUCache } from 'lru-cache'
import { adapter } from '../adapter'
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
    if (!adapter.storage) return

    if (this.version) {
      const storageVersion = adapter.storage.getItem(`${this.name}:ver`)
      if (storageVersion !== this.version) return
    }

    const dump = adapter.storage.getItem(this.name)
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
    if (!adapter.storage) return
    adapter.storage.setItem(this.name, JSON.stringify(this.dump()))
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
