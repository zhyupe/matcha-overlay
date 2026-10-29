import type * as Leaflet from 'leaflet'
import { imageUrls } from '../transport'

type Library = typeof import('./eorzea-map')
export function mapImages(library: Library) {
  const images = imageUrls()
  const empty = images.data(
    'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
  )
  type Tiles = {
    getTileUrl(coords: Leaflet.Coords): string
    _tileZoom: number
    _tiles: Record<string, { coords: Leaflet.Coords; el: HTMLImageElement }>
  }
  const tiles = library.AdvancedTileLayer.prototype as unknown as {
    createTile(
      this: Tiles,
      coords: Leaflet.Coords,
      done: Leaflet.DoneCallback,
    ): HTMLElement
    _abortLoading(this: Tiles): void
    _removeTile(this: Tiles, key: string): void
  }
  const createTile = tiles.createTile,
    abortLoading = tiles._abortLoading,
    removeTile = tiles._removeTile
  const removeGridTile = (
    library.L.GridLayer.prototype as unknown as {
      _removeTile(this: Tiles, key: string): void
    }
  )._removeTile
  // The original layer uses a data URL to cancel image loads; the host permits owned blob URLs.
  tiles._abortLoading = function () {
    for (const [key, tile] of Object.entries(this._tiles)) {
      if (tile.coords.z === this._tileZoom) continue
      tile.el.onload = () => {}
      tile.el.onerror = () => {}
      if (!tile.el.complete) {
        tile.el.src = empty
        tile.el.remove()
        delete this._tiles[key]
      }
    }
  }
  tiles._removeTile = function (key) {
    const tile = this._tiles[key]
    if (tile) tile.el.src = empty
    removeGridTile.call(this, key)
  }
  tiles.createTile = function (
    coords: Leaflet.Coords,
    done: Leaflet.DoneCallback,
  ) {
    const tile = document.createElement('img')
    tile.alt = ''
    tile.setAttribute('role', 'presentation')
    tile.onload = () => done(undefined, tile)
    tile.onerror = () => done(new Error('Map tile unavailable'), tile)
    void images
      .load(this.getTileUrl(coords))
      .then((url) => {
        tile.src = url
      })
      .catch((error) => done(error, tile))
    return tile
  }
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
      tiles.createTile = createTile
      tiles._abortLoading = abortLoading
      tiles._removeTile = removeTile
      icons._createImg = createImage
      overlays.initialize = initialize
      overlays.setUrl = setUrl
      images.dispose()
    },
  }
}
