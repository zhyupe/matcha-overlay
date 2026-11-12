import { FishingCatalog } from './fishing'
import { Maps } from './maps'
import { submarineMap, submarineParts, submarineRanks } from './submarine'
import { TreasureData } from './treasures'
import { Worlds } from './worlds'

export interface ClientCatalog {
  fishing: typeof FishingCatalog
  maps: typeof Maps
  treasures: typeof TreasureData
  worlds: typeof Worlds
  submarineMap: typeof submarineMap
  submarineParts: typeof submarineParts
  submarineRanks: typeof submarineRanks
}
function replace<T extends object>(target: T, source: T) {
  for (const key of Object.keys(target))
    delete (target as Record<string, unknown>)[key]
  Object.assign(target, source)
}
let revision = 0
const listeners = new Set<() => void>()
export const catalogRevision = () => revision
export const subscribeCatalog = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function applyClientCatalog(catalog: ClientCatalog) {
  replace(FishingCatalog, catalog.fishing)
  replace(Maps, catalog.maps)
  replace(TreasureData, catalog.treasures)
  replace(Worlds, catalog.worlds)
  replace(submarineMap, catalog.submarineMap)
  replace(submarineParts, catalog.submarineParts)
  replace(submarineRanks, catalog.submarineRanks)
  revision++
  for (const listener of listeners) listener()
}
export function clearClientCatalog() {
  applyClientCatalog({
    fishing: { fish: {}, tackle: {}, places: {}, placefish: {} },
    maps: {},
    treasures: {},
    worlds: {},
    submarineMap: {},
    submarineParts: {},
    submarineRanks: {},
  })
}
export async function loadActCatalog() {
  if (import.meta.env.MODE === 'mojito')
    throw new Error('ACT data is unavailable in a Mojito package')
  const [fishing, maps, treasures, worlds, submarine] = await Promise.all([
    import('./act/fishing'),
    import('./act/maps'),
    import('./act/treasures'),
    import('./act/worlds'),
    import('./act/submarine'),
  ])
  applyClientCatalog({
    fishing: fishing.FishingCatalog,
    maps: maps.Maps,
    treasures: treasures.TreasureData,
    worlds: worlds.Worlds,
    submarineMap: submarine.submarineMap,
    submarineParts: submarine.submarineParts,
    submarineRanks: submarine.submarineRanks,
  })
}
