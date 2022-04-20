import { create, EoMap, loader, simpleMarker } from './eorzea-map'
import { MapInfo } from '../components/map'
import './index.css'
import '../components/icon/index.css'

const $ = (id: string) => document.getElementById(id)!

const title = $('title')
const wrap = $('eorzea-map')

let instance: EoMap
let state: MapInfo = { map: 1 }

const nextState = ({ map, markers }: MapInfo) => {
  void instance.loadMapKey(map).then(() => {
    title.textContent = instance.mapInfo.placeName

    if (!markers || markers.length === 0) return

    for (const { x, y, icon, title } of markers) {
      const iconUrl = loader.getIconUrl(`ui/icon/${icon.substring(0, 2)}0000/${icon}.tex`)
      const marker = simpleMarker(x, y, iconUrl, instance.mapInfo)

      if (title) {
        marker
          .bindTooltip(
            title.replace(/\[icon:(\d+)\]/g, (_, i) => `<i class="icon">&#${i};</i>`),
            {
              permanent: true,
              direction: 'top',
              className: 'marker-tooltip',
            },
          )
          .openTooltip()
      }

      instance.addMarker(marker)
    }

    const main = markers[0]
    setTimeout(() => instance.setView(instance.mapToLatLng2D(main.x, main.y), -1), 10)
  })
}

void create(wrap).then((_map) => {
  instance = _map
  nextState(state)
})

window.addEventListener('error', (e) => {
  e.preventDefault()
})

window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin) return

  if (instance) {
    nextState(e.data)
  } else {
    state = e.data
  }
})
