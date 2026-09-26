import { write, xivapiTable } from './common.mjs'

export async function updateFishing() {
  const spots = await xivapiTable('FishingSpot', [
    'PlaceName.Name',
    'Item[].Name',
  ])
  const search = new URLSearchParams({
    sheets: 'Item',
    fields: 'Name',
    query: 'ItemSearchCategory=30',
    limit: '500',
  })
  const response = await fetch(
    `https://xivapi-v2.xivcdn.com/api/search?${search}`,
  )
  if (!response.ok)
    throw new Error(`Cannot fetch fishing tackle: HTTP ${response.status}`)
  const tackleData = await response.json()
  if (tackleData.next) throw new Error('Fishing tackle query exceeds one page')

  const fish = {}
  const places = {}
  const placefish = {}
  for (const { row_id, fields } of spots) {
    if (row_id >= 10000) continue
    const place = fields.PlaceName
    if (!place?.row_id || !place.fields?.Name) continue
    places[place.row_id] = place.fields.Name
    const ids = new Set(placefish[place.row_id] || [])
    for (const item of fields.Item || []) {
      if (!item.row_id || !item.fields?.Name) continue
      fish[item.row_id] = item.fields.Name
      ids.add(item.row_id)
    }
    placefish[place.row_id] = [...ids].sort((a, b) => a - b)
  }
  const tackle = Object.fromEntries(
    tackleData.results.map((row) => [row.row_id, row.fields.Name]),
  )
  await write(
    'fishing',
    `export const FishingCatalog: {
  fish: Record<string, string>
  tackle: Record<string, string>
  places: Record<string, string>
  placefish: Record<string, number[]>
} = ${JSON.stringify({ fish, tackle, places, placefish }, null, 2)}\n`,
  )
}
