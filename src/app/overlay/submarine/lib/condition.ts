export interface PartCondition {
  itemId: number
  condition: number
}

export interface SubmarinePartsLog {
  reset: boolean
  index: number
  parts: (PartCondition | null)[]
}

export type ConditionSnapshots = ((PartCondition | null)[] | undefined)[]

export function updateConditionSnapshots(
  previous: ConditionSnapshots,
  event: SubmarinePartsLog,
): ConditionSnapshots {
  if (event.reset) return []
  if (
    !Number.isInteger(event.index) ||
    event.index < 0 ||
    event.index >= 4 ||
    !Array.isArray(event.parts) ||
    event.parts.length !== 4
  )
    return previous
  const next = previous.slice()
  next[event.index] = event.parts.map((part) =>
    part &&
    Number.isInteger(part.itemId) &&
    part.itemId > 0 &&
    part.itemId <= 0xffffffff &&
    Number.isInteger(part.condition) &&
    part.condition >= 0 &&
    part.condition <= 30000
      ? { itemId: part.itemId, condition: part.condition }
      : null,
  )
  return next
}

export function readPartCondition(
  part: PartCondition | null | undefined,
  expectedItemId: number | undefined,
): number | null {
  // Inventory item IDs and SubmarinePart row IDs are different namespaces.
  return part && expectedItemId !== undefined && part.itemId === expectedItemId
    ? part.condition
    : null
}

export function formatCondition(condition: number | null | undefined): string {
  if (condition == null) return '耐久未知'
  if (condition === 0) return '已损坏'
  if (condition < 300) return '<1%'
  return `${Math.floor(condition / 300)}%`
}
