/* eslint-disable 
  @typescript-eslint/no-unsafe-assignment, 
  @typescript-eslint/no-unsafe-call, 
  @typescript-eslint/no-unsafe-member-access, 
  @typescript-eslint/no-unsafe-return */

import { MapInfo } from '../components/map'
import './index.css'

declare let YZWF: any

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement

const title = $('title')
const wrap = $('eorzea-map')

let instance: any = null
let state: MapInfo = { map: 1 }

const nextState = ({ map, markers }: MapInfo) => {
  instance.loadMapKey(map).then(() => {
    title.textContent = instance.mapInfo.placeName

    if (!markers || markers.length === 0) return

    for (const { x, y, icon } of markers) {
      const iconUrl = YZWF.eorzeaMap.loader.getIconUrl(`ui/icon/${icon.substring(0, 2)}0000/${icon}.tex`)
      const marker = YZWF.eorzeaMap.simpleMarker(x, y, iconUrl, instance.mapInfo)
      instance.addMaker(marker)
    }

    const main = markers[0]
    setTimeout(() => instance.setView(instance.mapToLatLng2D(main.x, main.y), -1), 300)
  })
}

YZWF.eorzeaMap.create(wrap).then((_map: any) => {
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
