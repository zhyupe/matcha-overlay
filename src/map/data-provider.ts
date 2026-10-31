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
  const maps = new Map<string, string>()
  const icons = new Map<number, string | null>()
  const loadIcons = async (ids: number[]) => {
    for (const id of new Set(ids)) {
      if (!icons.has(id))
        icons.set(id, await request<string | null>('map.icon', { id }))
    }
  }
  const provider: MapDataProvider = {
    getRegion: () => request('map.regions'),
    getMap: async (rowId) => {
      const map = await request<Awaited<ReturnType<MapDataProvider['getMap']>>>(
        'map.get',
        { rowId },
      )
      const url = await request<string | null>('map.image', { id: map.id })
      if (!url) throw new Error('当前客户端地图图片不存在')
      maps.set(map.id, url)
      return map
    },
    getMapKeyById: (id) => request('map.key', { id }),
    getMapMarkers: async (map) => {
      const markers = await request<
        Awaited<ReturnType<MapDataProvider['getMapMarkers']>>
      >('map.markers', { rowId: map.rowId })
      await loadIcons(
        markers.flatMap((marker) => (marker.icon ? [marker.icon] : [])),
      )
      return markers
    },
  }
  return {
    provider,
    loadIcons,
    mapUrl(id: string) {
      const url = maps.get(id)
      if (!url) throw new Error('地图图片尚未加载')
      return url
    },
    iconUrl: (id: number) => icons.get(id) ?? null,
    dispose: () => {
      disposed = true
    },
  }
}
