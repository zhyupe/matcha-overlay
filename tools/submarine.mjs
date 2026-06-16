import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  exports,
  item,
  type,
  write,
  xivapiSearch,
  xivapiTable,
} from './common.mjs'

export async function updateSubmarine() {
  const data = JSON.parse(
    readFileSync(
      fileURLToPath(new URL('./submarine.json', import.meta.url)),
      'utf-8',
    ),
  )

  const getSpotParent = (map, spot) => {
    if (!spot || spot === '0') {
      return null
    }

    const parent = data[map].parents[spot]
    return parent || (spot === 'A' ? '0' : null)
  }

  const mapRows = await xivapiTable('SubmarineMap', ['Name', 'Image'])
  const map = Object.fromEntries(
    mapRows
      .map((row) => {
        const {
          row_id,
          fields: { Image: image, Name: name },
        } = row
        if (!name) return null

        return [
          row_id,
          {
            name,
            image: image.path_hr1 || image.path,
            spots: {},
          },
        ]
      })
      .filter((a) => a),
  )

  const exploration = await xivapiTable('SubmarineExploration', ['*'])
  for (const row of exploration) {
    const {
      fields: {
        Map: { value: mapId },
        Destination: destination,
        Location: location,
        RankReq: rank,
        CeruleumTankReq: ceruleum,
        SurveyDistance: distance,
        SurveyDurationmin: duration,
        ExpReward: exp,
        X: x,
        Y: y,
        Z: z,
      },
    } = row

    if (!mapId) continue
    const spots = map[mapId].spots
    const key = location || '0'
    spots[key] = {
      location: key,
      parent: getSpotParent(mapId, key),
      name: destination.split('\u3000').pop(),
      x,
      y,
      z,
      rank,
      ceruleum,
      duration,
      distance,
      exp,
    }
  }

  const rankRows = await xivapiTable('SubmarineRank', ['*'])
  const ranks = Object.fromEntries(
    rankRows
      .map(({ row_id, fields }) => {
        if (!fields.Capacity) return null

        return [
          row_id,
          {
            capacity: fields.Capacity,
            exp: fields.ExpToNext,
            surveillance: fields.SurveillanceBonus,
            retrieval: fields.RetrievalBonus,
            speed: fields.SpeedBonus,
            range: fields.RangeBonus,
            favor: fields.FavorBonus,
          },
        ]
      })
      .filter((a) => a),
  )

  // filterGroup: 36
  const partItemRows = await xivapiSearch(
    'Item',
    ['Name', 'AdditionalData'],
    'FilterGroup=36',
  )
  const partItems = Object.fromEntries(
    partItemRows.map((row) => {
      const {
        fields: {
          AdditionalData: { value: partId },
          Name: name,
        },
        row_id: itemId,
      } = row
      return [partId, { name, itemId }]
    }),
  )

  const partRows = await xivapiTable('SubmarinePart', ['*'])
  const parts = Object.fromEntries(
    partRows
      .map(({ row_id, fields }) => {
        if (!fields.Components) return null

        return [
          row_id,
          {
            ...partItems[row_id],
            slot: fields.Slot,
            rank: fields.Rank,
            components: fields.Components,
            surveillance: fields.Surveillance,
            retrieval: fields.Retrieval,
            speed: fields.Speed,
            range: fields.Range,
            favor: fields.Favor,
            class: fields.Class,
            repairMaterials: fields.RepairMaterials,
          },
        ]
      })
      .filter((a) => a),
  )

  write(
    'submarine',
    exports(
      type('SubmarineSpot', {
        location: 'string',
        parent: 'string | null',
        name: 'string',
        x: 'number',
        y: 'number',
        z: 'number',
        rank: 'number',
        ceruleum: 'number',
        duration: 'number',
        distance: 'number',
        exp: 'number',
      }),
      type('SubmarineMap', {
        name: 'string',
        image: 'string',
        spots: 'Record<string, SubmarineSpot>',
      }),
      type('SubmarinePart', {
        name: 'string',
        itemId: 'number',
        slot: 'number',
        rank: 'number',
        components: 'number',
        surveillance: 'number',
        retrieval: 'number',
        speed: 'number',
        range: 'number',
        favor: 'number',
        class: 'number',
        repairMaterials: 'number',
      }),
      type('SubmarineRank', {
        capacity: 'number',
        exp: 'number',
        surveillance: 'number',
        retrieval: 'number',
        speed: 'number',
        range: 'number',
        favor: 'number',
      }),
      item('submarineMap', `Record<string|number, SubmarineMap>`, map),
      item('submarineParts', 'Record<string|number, SubmarinePart>', parts),
      item('submarineRanks', 'Record<string|number, SubmarineRank>', ranks),
    ),
  )
}
