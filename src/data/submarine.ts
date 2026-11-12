export interface SubmarineSpot {
  location: string
  parent: string | null
  name: string
  x: number
  y: number
  z: number
  rank: number
  ceruleum: number
  duration: number
  distance: number
  exp: number
}

export interface SubmarineMap {
  name: string
  image: string
  spots: Record<string, SubmarineSpot>
}

export interface SubmarinePart {
  name: string
  itemId: number
  slot: number
  rank: number
  components: number
  surveillance: number
  retrieval: number
  speed: number
  range: number
  favor: number
  class: number
  repairMaterials: number
}

export interface SubmarineRank {
  capacity: number
  exp: number
  surveillance: number
  retrieval: number
  speed: number
  range: number
  favor: number
}

export const submarineMap: Record<string | number, SubmarineMap> = {}

export const submarineParts: Record<string | number, SubmarinePart> = {}

export const submarineRanks: Record<string | number, SubmarineRank> = {}
