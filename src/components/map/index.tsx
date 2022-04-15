import { useCallback, useEffect, useRef } from 'react'
import { Marker } from '../../map/interface'

export interface MapInfo {
  map: number
  markers?: Marker[]
}

export function EorzeaMap({ map, markers }: MapInfo) {
  const ref = useRef<HTMLIFrameElement>(null)
  const notify = useCallback(() => {
    const iframe = ref.current
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ map, markers }, '/')
    }
  }, [map, markers])

  useEffect(notify, [notify, ref.current])

  return (
    <iframe
      ref={ref}
      title="map"
      style={{ border: 0, background: 'transparent', height: '100%', width: '100%' }}
      src="map.html"
      onLoad={notify}
    />
  )
}
