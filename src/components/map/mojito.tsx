import libraryCss from '@thewakingsands/eorzea-interactive-map/dist/map.css?inline'
import { useEffect, useRef } from 'react'
import { displayMap } from '../../map/display'
import type { EoMap } from '../../map/eorzea-map'
import mapCss from '../../map/index.css?inline'
import { mapImages } from '../../map/transport'
import iconCss from '../icon/index.css?inline'
import type { MapInfo } from './index'

export default function MojitoMap(value: MapInfo) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef(value)
  latest.current = value
  const update = useRef<((value: MapInfo) => void) | undefined>(undefined)
  useEffect(() => {
    let disposed = false
    let instance: EoMap | undefined
    let resources: ReturnType<typeof mapImages> | undefined
    let queued = Promise.resolve()
    const element = host.current
    if (!element) return
    const shadow = element.shadowRoot ?? element.attachShadow({ mode: 'open' })
    shadow.innerHTML =
      '<section class="erozea-map-outer"><div class="eorzea-map-glass"></div><div class="eorzea-map-inner" id="eorzea-map"></div><div class="eorzea-map-resize-handler"></div></section><span id="title" class="info"></span>'
    const syncSize = () => {
      const outer = shadow.querySelector<HTMLElement>(
        '.erozea-map-outer',
      ) as HTMLElement
      outer.style.width = `${element.clientWidth}px`
      outer.style.height = `${element.clientHeight}px`
      instance?.invalidateSize({ debounceMoveend: true })
    }
    const resize = new ResizeObserver(syncSize)
    resize.observe(element)
    const initialize = async () => {
      const library = await import('@thewakingsands/eorzea-interactive-map')
      if (disposed) return
      // Lossless maps can exceed the host's HTTP response limit.
      library.setMapUrlResolver(
        (id) => `https://xivapi-v2.xivcdn.com/api/asset/map/${id}?format=jpg`,
      )
      await library.getRegion()
      if (disposed) return
      resources = mapImages(library)
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(
        resources.css(
          [
            libraryCss,
            mapCss,
            iconCss,
            ':host{all:initial;display:block;position:relative;width:100%;height:100%;overflow:hidden;background:transparent}',
          ].join('\n'),
        ),
      )
      shadow.adoptedStyleSheets = [sheet]
      syncSize()
      const map = await library.create(
        shadow.getElementById('eorzea-map') as HTMLElement,
      )
      instance = map
      if (disposed) {
        instance.remove()
        return
      }
      syncSize()
      update.current = (current) => {
        queued = queued
          .then(async () => {
            if (!disposed)
              await displayMap(
                map,
                current,
                library,
                shadow.getElementById('title') as HTMLElement,
              )
          })
          .catch((error) => {
            if (!disposed) console.error(error)
          })
      }
      update.current(latest.current)
    }
    void initialize().catch((error) => {
      if (!disposed) console.error(error)
    })
    return () => {
      disposed = true
      update.current = undefined
      resize.disconnect()
      instance?.remove()
      resources?.dispose()
    }
  }, [])
  useEffect(() => {
    update.current?.({ map: value.map, markers: value.markers })
  }, [value.map, value.markers])
  return (
    <div
      ref={host}
      style={{
        border: 0,
        background: 'transparent',
        height: '100%',
        width: '100%',
      }}
    />
  )
}
