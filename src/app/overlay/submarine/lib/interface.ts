export interface PlannerInput {
  // spotName => expectation
  spots: Record<string, number>
  getTime: (a: string, b: string) => number
  getDistance: (a: string, b: string) => number
  rangeLimit: number
  topK: number
  maxVisits: number
}

export interface PlannerOutput {
  path: string[]
  range: number
  time: number
  expectation: number
  score: number
}

export interface Route extends PlannerOutput {
  mapId: string
}
