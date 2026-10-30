import type * as Leaflet from 'leaflet'
import { imageUrls } from '../transport'

type Library = typeof import('./eorzea-map')
export function mapImages(library: Library) {
  const images = imageUrls()
  const empty = images.data(
    'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
  )
  const icons = library.L.Icon.prototype as unknown as {
    _createImg(url: string, element?: HTMLImageElement): HTMLImageElement
  }
  const createImage = icons._createImg
  icons._createImg = function (url, element) {
    const image = createImage.call(this, empty, element)
    void images
      .load(url)
      .then((value) => {
        image.src = value
      })
      .catch(() => {})
    return image
  }
  const overlays = library.L.ImageOverlay.prototype as unknown as {
    initialize(
      this: Leaflet.ImageOverlay,
      url: string,
      bounds: Leaflet.LatLngBoundsExpression,
      options?: Leaflet.ImageOverlayOptions,
    ): void
    setUrl(this: Leaflet.ImageOverlay, url: string): Leaflet.ImageOverlay
  }
  const initialize = overlays.initialize,
    setUrl = overlays.setUrl
  overlays.initialize = function (url, bounds, options) {
    const local = url.startsWith('data:')
      ? images.data(url)
      : url.startsWith('blob:')
        ? url
        : empty
    initialize.call(this, local, bounds, options)
    if (local === empty)
      void images
        .load(url)
        .then((value) => {
          setUrl.call(this, value)
        })
        .catch(() => {})
  }
  overlays.setUrl = function (url) {
    if (url.startsWith('data:')) return setUrl.call(this, images.data(url))
    if (url.startsWith('blob:')) return setUrl.call(this, url)
    void images
      .load(url)
      .then((value) => {
        setUrl.call(this, value)
      })
      .catch(() => {})
    return this
  }
  return {
    css: (text: string) =>
      text.replace(
        /url\(["']?(data:[^)"']+)["']?\)/g,
        (_, url: string) => `url("${images.data(url)}")`,
      ),
    dispose() {
      icons._createImg = createImage
      overlays.initialize = initialize
      overlays.setUrl = setUrl
      images.dispose()
    },
  }
}
