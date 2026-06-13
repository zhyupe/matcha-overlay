import { json, write, xivapiTable } from './common.mjs'

function toMapCoordinate2D(value, sizeFactor, offset) {
  const c = sizeFactor / 100
  const offsetValue = (value + offset) * c

  const val = (41 / c) * ((offsetValue + 1024) / 2048) + 1
  return val.toFixed(1)
}

export async function updateTreasure() {
  const huntRank = await xivapiTable('TreasureHuntRank', ['KeyItemName.row_id'])
  const map = new Map()
  for (const item of huntRank) {
    map.set(item.row_id, item.fields.KeyItemName.value)
  }

  const data = {}
  const spots = await xivapiTable('TreasureSpot', [
    'ID',
    'Location.X',
    'Location.Z',
    'Location.Map.SizeFactor',
    'Location.Map.OffsetX',
    'Location.Map.OffsetY',
    'MapOffsetX',
    'MapOffsetY',
  ])

  for (const row of spots) {
    const itemId = map.get(row.row_id)
    if (!itemId) continue

    if (!data[itemId]) {
      data[itemId] = []
    }

    if (!row.fields.Location.value) continue

    const {
      fields: {
        Location: {
          value,
          fields: {
            X,
            Z,
            Map: {
              value: mapId,
              fields: { SizeFactor, OffsetX, OffsetY },
            },
          },
        },
        MapOffsetX,
        MapOffsetY,
      },
    } = row

    if (MapOffsetX !== OffsetX || MapOffsetY !== OffsetY) {
      console.log('test', item)
    }

    data[itemId][row.subrow_id] = {
      map: mapId,
      x: +toMapCoordinate2D(+X, +SizeFactor, +OffsetX),
      y: +toMapCoordinate2D(+Z, +SizeFactor, +OffsetY),
    }
  }

  const code = `export interface ITreasureData {
  map: number
  x: number
  y: number
}

export const TreasureData: Record<string, ITreasureData[]> = ${json(data)}`

  write('treasures', code)
}
