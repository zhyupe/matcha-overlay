export interface GearsetMateria {
  type: number
  tier: number
}

export interface GearsetDTO {
  self: boolean
  slot: number
  item: number
  hq: boolean
  glamour: number
  materias: GearsetMateria[]
}
