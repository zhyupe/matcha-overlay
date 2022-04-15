import { MapInfo } from '../../../components/map'

export interface PointInfo {
  map: number
  x: number
  y: number
}

export type MapAction = (info: MapInfo) => void
