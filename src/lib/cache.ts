import { debounce } from 'debounce'
import LRU from 'lru-cache'

export class Cache<K, V> extends LRU<K, V> {
  constructor(private name: string, options: LRU.Options<K, V> = {}) {
    super({
      ...options,
      dispose: (key: K, value: V) => {
        this.saveToStorage()
        if (options.dispose) {
          options.dispose(key, value)
        }
      },
    })

    this.loadFromStorage()
  }

  loadFromStorage() {
    if (!window.localStorage) return

    const dump = window.localStorage.getItem(this.name)
    if (!dump) return

    try {
      this.load(JSON.parse(dump))
    } catch (e) {
      // ignore
    }
  }

  saveToStorage = debounce(() => {
    if (!window.localStorage) return
    window.localStorage.setItem(this.name, JSON.stringify(this.dump()))
  }, 200)

  set(key: K, value: V, maxAge?: number): boolean {
    const result = super.set(key, value, maxAge)
    this.saveToStorage()

    return result
  }
}
