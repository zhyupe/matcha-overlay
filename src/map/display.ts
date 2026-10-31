import type { EoMap } from '@thewakingsands/eorzea-interactive-map'
import type { MapInfo } from '../components/map'

type Library = typeof import('@thewakingsands/eorzea-interactive-map')
export async function displayMap(
  instance: EoMap,
  { map, markers }: MapInfo,
  library: Pick<Library, 'loader' | 'simpleMarker'>,
  title: HTMLElement,
) {
  await instance.loadMapKey(map)
  title.textContent = instance.mapInfo.placeName ?? ''
  if (!markers?.length) return
  for (const { x, y, icon, title } of markers) {
    const iconUrl = library.loader.getIconUrl(
      `ui/icon/${icon.substring(0, 3)}000/${icon}.tex`,
    )
    if (!iconUrl) continue
    const marker = library.simpleMarker(x, y, iconUrl, instance.mapInfo)
    if (title)
      marker
        .bindTooltip(
          title.replace(
            /\[icon:(\d+)\]/g,
            (_, i) => `<i class="icon">&#${i};</i>`,
          ),
          {
            permanent: true,
            direction: 'top',
            className: 'marker-tooltip',
          },
        )
        .openTooltip()
    instance.addMarker(marker)
  }
  const main = markers[0]
  setTimeout(() => {
    if (instance.getContainer().isConnected)
      instance.setView(instance.mapToLatLng2D(main.x, main.y), -1)
  }, 10)
}
