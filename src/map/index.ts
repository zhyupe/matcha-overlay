/* eslint-disable 
  @typescript-eslint/no-unsafe-assignment, 
  @typescript-eslint/no-unsafe-call, 
  @typescript-eslint/no-unsafe-member-access, 
  @typescript-eslint/no-unsafe-return */

import './index.css'

declare let YZWF: any

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement
const posHTML = (num: number) => {
  const [a, b] = num.toFixed(1).split('.')
  return `${a}<small>.${b}</small>`
}

const title = $('title')
const pos = $('pos')
const wrap = $('eorzea-map')
const iconUrl = YZWF.eorzeaMap.loader.getIconUrl('ui/icon/060000/060561.tex')

let map: any = null
const onHashChange = () => {
  const [id, x, y] = window.location.hash
    .slice(1)
    .split(',')
    .map((a) => +a)

  if (!map) return
  map.loadMapKey(id).then(() => {
    const marker = YZWF.eorzeaMap.simpleMarker(x, y, iconUrl, map.mapInfo)
    map.addMaker(marker)

    title.textContent = map.mapInfo.placeName
    pos.innerHTML = `X:${posHTML(x)} Y:${posHTML(y)}`

    setTimeout(() => map.setView(map.mapToLatLng2D(x, y), -1), 300)
  })
}

YZWF.eorzeaMap.create(wrap).then((_map: any) => {
  map = _map
  onHashChange()
})

window.addEventListener('hashchange', onHashChange)
