import { json, write, xivapiTable } from './common.mjs'

export async function updateMap() {
  const rows = await xivapiTable('Map', [
    'PlaceName.Name',
    'SizeFactor',
    'OffsetX',
    'OffsetY',
  ])

  const mapData = {}
  for (const row of rows) {
    const name = row.fields.PlaceName?.fields?.Name
    if (!name) continue

    mapData[row.row_id] = {
      name,
      sizeFactor: +row.fields.SizeFactor,
      offset: [+row.fields.OffsetX, +row.fields.OffsetY],
    }
  }

  const code = `
export interface IMapData {
  name: string
  sizeFactor: number
  offset: [number, number]
}

export const Maps: Record<number, IMapData> = ${json(mapData)}
  `

  await write('maps', code)
}
