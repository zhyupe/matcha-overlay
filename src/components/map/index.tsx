import { lazy, Suspense, useCallback, useEffect, useRef } from 'react'
import { mojitoSource } from '../../source'

const MojitoMap = lazy(() => import('./mojito'))

import type { Marker } from '../../map/interface'

export interface MapInfo {
  map: number
  markers?: Marker[]
}

export function EorzeaMap(value: MapInfo) {
  return mojitoSource ? (
    <Suspense fallback={null}>
      <MojitoMap {...value} />
    </Suspense>
  ) : (
    <LegacyMap {...value} />
  )
}
function LegacyMap({ map, markers }: MapInfo) {
  const ref = useRef<HTMLIFrameElement>(null)
  const notify = useCallback(() => {
    const iframe = ref.current
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ map, markers }, '/')
    }
  }, [map, markers])

  useEffect(() => {
    notify()
  }, [notify])

  return (
    <iframe
      ref={ref}
      title="map"
      style={{
        border: 0,
        background: 'transparent',
        height: '100%',
        width: '100%',
      }}
      src="map.html"
      onLoad={notify}
    />
  )
}
