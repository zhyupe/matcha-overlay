import type { EoMap } from '@thewakingsands/eorzea-interactive-map'
import libraryCss from '@thewakingsands/eorzea-interactive-map/dist/map.css?inline'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { adapter, type MapSession } from '../../adapter'
import { displayMap } from '../../map/display'
import mapCss from '../../map/index.css?inline'
import iconCss from '../icon/index.css?inline'
import type { MapInfo } from './index'

export default function EmbeddedMap(value: MapInfo) {
  const { mapGeneration } = useSyncExternalStore(
    adapter.subscribeState,
    adapter.getState,
  )
  return <MapInstance key={mapGeneration} {...value} />
}

function MapInstance(value: MapInfo) {
  const [error, setError] = useState<string>()
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef(value)
  latest.current = value
  const update = useRef<((value: MapInfo) => void) | undefined>(undefined)
  useEffect(() => {
    let disposed = false
    let session: MapSession | undefined
    let instance: EoMap | undefined
    let queued = Promise.resolve()
    const failed = (error: unknown) => {
      if (disposed) return
      console.error(error)
      const state = adapter.getState()
      setError(state.status === 'error' ? state.message : '地图资料不可用')
    }
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
      session = await adapter.createMapSession(library)
      if (disposed) {
        session.dispose()
        return
      }
      await library.getRegion()
      if (disposed) return
      const sheet = new CSSStyleSheet()
      const css = [
        libraryCss,
        mapCss,
        iconCss,
        ':host{all:initial;display:block;position:relative;width:100%;height:100%;overflow:hidden;background:transparent}',
      ].join('\n')
      sheet.replaceSync(css)
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
            if (disposed) return
            await session?.prepareIcons(
              current.markers?.map(({ icon }) => Number(icon)) ?? [],
            )
            if (!disposed)
              await displayMap(
                map,
                current,
                library,
                shadow.getElementById('title') as HTMLElement,
              )
          })
          .catch(failed)
      }
      update.current(latest.current)
    }
    void initialize().catch(failed)
    return () => {
      disposed = true
      session?.dispose()
      update.current = undefined
      resize.disconnect()
      instance?.remove()
    }
  }, [])
  useEffect(() => {
    update.current?.({ map: value.map, markers: value.markers })
  }, [value.map, value.markers])
  return (
    <>
      {error && <div role="status">{error}</div>}
      <div
        ref={host}
        style={{
          display: error ? 'none' : undefined,
          border: 0,
          background: 'transparent',
          height: '100%',
          width: '100%',
        }}
      />
    </>
  )
}
