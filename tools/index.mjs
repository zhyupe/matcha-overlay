import { updateMap } from './map.mjs'
import { updateMateriaIcons } from './materia-icons.mjs'
import { updateTreasure } from './treasure.mjs'
import { updateWorld } from './world.mjs'

await updateMap()
await updateTreasure()
await updateWorld()
await updateMateriaIcons()
