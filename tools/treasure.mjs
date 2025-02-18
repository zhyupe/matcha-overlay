import { json, write } from './common.mjs'

function toMapCoordinate2D(value, sizeFactor, offset) {
  const c = sizeFactor / 100
  const offsetValue = (value + offset) * c

  const val = (41 / c) * ((offsetValue + 1024) / 2048) + 1
  return val.toFixed(1)
}

;(async () => {
  const rankRes = await (await fetch('https://xivapi.com/TreasureHuntRank?columns=ID,KeyItemNameTargetID')).json()
  const map = new Map()

  for (const item of rankRes.Results) {
    map.set(item.ID, item.KeyItemNameTargetID)
  }

  const data = {}
  const columns = [
    'ID',
    'Location.X',
    'Location.Z',
    'Location.Map.ID',
    'Location.Map.SizeFactor',
    'Location.Map.OffsetX',
    'Location.Map.OffsetY',
    'MapOffsetX',
    'MapOffsetY',
  ].join(',')

  let page = 1
  while (page) {
    const url = `https://xivapi.com/TreasureSpot?columns=${columns}&page=${page}`
    console.log(`Loading ${url}`)

    const spotRes = await (await fetch(url)).json()
    page = spotRes.Pagination.PageNext

    for (const item of spotRes.Results) {
      const [rank, index] = item.ID.split('.')
      const itemId = map.get(+rank)

      if (!itemId) continue

      if (!data[itemId]) {
        data[itemId] = []
      }

      const {
        Location: {
          X,
          Z,
          Map: { ID: mapId, SizeFactor, OffsetX, OffsetY },
        },
        MapOffsetX,
        MapOffsetY,
      } = item

      if (MapOffsetX !== OffsetX || MapOffsetY !== OffsetY) {
        console.log('test', item)
      }

      data[itemId][index] = {
        map: mapId,
        x: +toMapCoordinate2D(+X, +SizeFactor, +OffsetX),
        y: +toMapCoordinate2D(+Z, +SizeFactor, +OffsetY),
      }
    }
  }

  const code = `export interface ITreasureData {
  map: number
  x: number
  y: number
}

export const TreasureData: Record<string, ITreasureData[]> = ${json(data)}`

  write('treasures', code)
})()
