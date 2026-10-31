import type { EoMap } from '@thewakingsands/eorzea-interactive-map'
import libraryCss from '@thewakingsands/eorzea-interactive-map/dist/map.css?inline'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { mapDataProvider } from '../../map/data-provider'
import { displayMap } from '../../map/display'
import mapCss from '../../map/index.css?inline'
import { mapStyles } from '../../map/styles'
import {
  getMapDataGeneration,
  getSourceStatus,
  mojitoSource,
  watchMapDataGeneration,
} from '../../source'
import iconCss from '../icon/index.css?inline'
import type { MapInfo } from './index'

export default function EmbeddedMap(value: MapInfo) {
  const dataGeneration = useSyncExternalStore(
    watchMapDataGeneration,
    getMapDataGeneration,
  )
  return <MapInstance key={mojitoSource ? dataGeneration : 0} {...value} />
}

function MapInstance(value: MapInfo) {
  const [error, setError] = useState<string>()
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef(value)
  latest.current = value
  const update = useRef<((value: MapInfo) => void) | undefined>(undefined)
  useEffect(() => {
    let disposed = false
    const source = mojitoSource ? mapDataProvider() : undefined
    let clearProvider: (() => void) | undefined
    let instance: EoMap | undefined
    let resources: ReturnType<typeof mapStyles> | undefined
    let queued = Promise.resolve()
    const failed = (error: unknown) => {
      if (disposed) return
      console.error(error)
      setError(
        mojitoSource && getSourceStatus().state === 'error'
          ? getSourceStatus().message
          : mojitoSource
            ? '当前客户端地图资料不可用'
            : '地图资料不可用',
      )
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
      if (source) {
        library.setDataProvider(source.provider)
        library.setMapUrlResolver(source.mapUrl)
        library.setIconUrlResolver(source.iconUrl)
        clearProvider = () => {
          library.setDataProvider()
          library.setMapUrlResolver()
          library.setIconUrlResolver()
        }
        await source.loadIcons([60561])
      }
      await library.getRegion()
      if (disposed) return
      if (mojitoSource) resources = mapStyles()
      const sheet = new CSSStyleSheet()
      const css = [
        libraryCss,
        mapCss,
        iconCss,
        ':host{all:initial;display:block;position:relative;width:100%;height:100%;overflow:hidden;background:transparent}',
      ].join('\n')
      sheet.replaceSync(resources ? resources.css(css) : css)
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
            await source?.loadIcons(
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
      source?.dispose()
      clearProvider?.()
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
