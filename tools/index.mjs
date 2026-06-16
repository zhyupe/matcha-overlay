import { updateMap } from './map.mjs'
import { updateMateriaIcons } from './materia-icons.mjs'
import { updateSubmarine } from './submarine.mjs'
import { updateTreasure } from './treasure.mjs'
import { updateWorld } from './world.mjs'

const map = {
  map: updateMap,
  treasure: updateTreasure,
  world: updateWorld,
  materiaIcons: updateMateriaIcons,
  submarine: updateSubmarine,
}

const key = process.argv[2]
if (key) {
  await map[key]()
} else {
  for (const handler of Object.values(map)) {
    await handler()
  }
}
