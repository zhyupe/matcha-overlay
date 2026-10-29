import type { MapInfo } from '../components/map'
import { displayMap } from './display'
import { create, type EoMap, loader, simpleMarker } from './eorzea-map'
import './index.css'
import '../components/icon/index.css'

const $ = (id: string) => document.getElementById(id) as HTMLElement

const title = $('title')
const wrap = $('eorzea-map')

let instance: EoMap
let state: MapInfo = { map: 1 }

const nextState = (value: MapInfo) => {
  void displayMap(instance, value, { loader, simpleMarker }, title)
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
