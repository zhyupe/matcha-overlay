/* eslint-disable no-redeclare */
import * as L from 'leaflet'

interface IRegion {
  regionName: string
  maps: Array<{
    id: string
    key: number
    hierarchy: number
    name: string
    subName: string
  }>
}

export declare namespace loader {
  export declare const CDN_SERVER: string
  export declare const NULL_ICON_GROUP = '000000'
  export declare function setUrlFunction(key: string, func: any): void
  export declare function getMapUrl(id: string): any
  export declare function getBgUrl(): any
  export declare function getTileUrl(id: string): any
  export declare function getIconUrl(icon: string): any
  export declare function parseIcon(icon: string): IIconParseResult
  export declare function setBaseUrl(url: string): void
  export interface IIconParseResult {
    group: string
    id: string
  }
  export interface IMapInfo {
    ['#']: string
    id: string
    sizeFactor: number
    ['placeName{Region}']: string
    ['placeName{Sub}']: string
    ['offset{X}']: number
    ['offset{Y}']: number
    territoryType: string
    placeName: string
    mapMarkerRange: number
  }
  export interface IMapMarker {
    ['#']: string
    x: number
    y: number
    icon: string
    ['placeName{Subtext}']: string
    subtextOrientation: number
    mapMarkerRegion: string
    type: number
    ['data{Type}']: number
    ['data{Key}']: string
  }
}

export declare class EoMap extends L.Map {
  mapInfo: loader.IMapInfo
  private markers
  private overlays
  private tileLayer
  private debugLayer
  private markersLayerGroup
  private tooltipsLayerGroup
  private gridOverlay
  private layersControl
  private previousMapInfo
  private updateInfoHandlers
  private el
  init(regions: IRegion[], el: HTMLElement): void
  private onZoomEnd
  private loadMapLayer
  loadMapInfo(mapInfo: loader.IMapInfo): Promise<this>
  loadMapKey(mapKey: number): Promise<this>
  loadMapId(mapId: string): Promise<this>
  addMaker(marker: L.Marker): L.Marker<any>
  addMarker(marker: L.Marker): L.Marker<any>
  onUpdateInfo(handler: (info: loader.IMapInfo) => void): void
  offUpdateInfo(handler: (info: loader.IMapInfo) => void): void
  /**
   * 从解包数据的 2D 坐标点数据换算成 UI 用的地图坐标 XY 数据
   * @param x X 坐标
   * @param y Y 坐标
   */
  toMapXY2D(x: number, y: number): [number, number]
  /**
   * 从解包数据的 2D 坐标换算成经纬度
   * @param x X 坐标
   * @param y Y 坐标
   */
  mapToLatLng2D(x: number, y: number): [number, number]
  /**
   * 从解包数据的 3D 坐标点换算成 UI 用的地图坐标 XY 数据
   * @param x X 坐标
   * @param z Y 坐标
   */
  toMapXY3D(x: number, z: number): [number, number]
  /**
   * 从 UI 上的坐标 XY 数据换算成解包数据的 2D 坐标点
   * @param x X 坐标
   * @param y Y 坐标
   */
  fromMapXY2D(x: number, y: number): [number, number]
  /**
   * 从解包的 3D 数据换算为解包数据的 2D 坐标点
   * @param x X 坐标
   * @param z Z 坐标
   */
  from3D(x: number, z: number): [number, number]
}

export declare class AdvancedTileLayer extends L.TileLayer {
  getTileUrl(o: any): any
}

export declare function isMinimap(icon: string): boolean
export declare function getIcon(icon: string): L.Icon
export declare function createMarker(markerInfo: loader.IMapMarker): L.Marker
export { L }
export declare function xy(xy: [number, number]): [number, number]
export declare function xy(x: number, y: number): [number, number]
export declare function create(mapEl: HTMLElement): Promise<EoMap>
export declare function simpleMarker(x: number, y: number, iconUrl: string, mapInfo: loader.IMapInfo): L.Marker<any>
export declare function setCdnUrl(url: string): void
export declare function setApiUrl(url: string): void
export declare const getRegion: (() => Promise<IRegion[]>) & import('lodash').MemoizedFunction
export declare const version: string

// import crel from 'crel';
// export { crel };

// export * from './markers';
export declare function iconMarker(
  x: number,
  y: number,
  iconUrl: string,
  mapInfo: loader.IMapInfo,
  axisType?: string,
  w?: number,
  h?: number,
): L.Marker<any>
