import type { Value } from '@ffcafe/mojito-plugin-sdk'
import type { MapDataProvider } from '@thewakingsands/eorzea-interactive-map'
import { command, setSourceStatus } from '../source'

export function mapDataProvider(invoke: typeof command = command) {
  let disposed = false
  const request = async <T>(
    action: string,
    value?: Record<string, Value>,
  ): Promise<T> => {
    if (disposed) throw new Error('Map data source closed')
    try {
      const result = await invoke(action, value)
      if (disposed) throw new Error('Map data source closed')
      return result as T
    } catch (error) {
      if (!disposed)
        setSourceStatus(
          'error',
          String(error).includes('permission_denied')
            ? '地图需要游戏资料读取权限'
            : '当前客户端地图资料不可用',
        )
      throw error
    }
  }
  const provider: MapDataProvider = {
    getRegion: () => request('map.regions'),
    getMap: (rowId) => request('map.get', { rowId }),
    getMapKeyById: (id) => request('map.key', { id }),
    getMapMarkers: (map) => request('map.markers', { rowId: map.rowId }),
  }
  return {
    provider,
    dispose: () => {
      disposed = true
    },
  }
}
