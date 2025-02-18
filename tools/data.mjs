const mapData = {}
for (const row of db('Map')) {
  const name = db('Placename.chs').findById(row.PlaceName).Name
  if (!name) continue

  mapData[row['#']] = {
    name,
    sizeFactor: +row.SizeFactor,
    offset: [+row['Offset{X}'], +row['Offset{Y}']],
  }
}

const json = (v) =>
  JSON.stringify(v, null, 2)
    .replace(/"(\d+|\w+)":/g, '$1:')
    .replace(/"(.+?)"/g, "'$1'")
    .replace(/'(\n\s+)\}/g, "',$1}")

fs.writeFileSync(
  path.join(output, 'treasures.ts'),
  `/* eslint-disable */

export interface ITreasureData {
  map: number
  x: number
  y: number
}

export const TreasureData: Record<string, ITreasureData[]> = ${json(treasure.map)};`,
)

fs.writeFileSync(
  path.join(output, 'maps.ts'),
  `
`,
)
