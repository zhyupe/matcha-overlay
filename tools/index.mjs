import { updateMap } from './map.mjs'
import { updateTreasure } from './treasure.mjs'
import { updateWorld } from './world.mjs'

await updateMap()
await updateTreasure()
await updateWorld()
