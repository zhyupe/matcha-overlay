import { json, write } from './common.mjs'

fetch('https://cafemaker.wakingsands.com/map?limit=10000&columns=ID,SizeFactor,OffsetX,OffsetY,PlaceName.Name')
  .then((res) => res.json())
  .then((data) => {
    const mapData = {}
    data.Results.forEach((row) => {
      if (!row.PlaceName.Name) return
      mapData[row.ID] = {
        name: row.PlaceName.Name,
        sizeFactor: +row.SizeFactor,
        offset: [+row.OffsetX, +row.OffsetY],
      }
    })

    const code = `/* eslint-disable */

export interface IMapData {
  name: string
  sizeFactor: number
  offset: [number, number]
}

export const Maps: Record<number, IMapData> = ${json(mapData)}
  `
    write('maps', code)
  })
