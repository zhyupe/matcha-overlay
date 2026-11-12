export interface IMapData {
  name: string
  sizeFactor: number
  offset: [number, number]
}

export const Maps: Record<number, IMapData> = {}
