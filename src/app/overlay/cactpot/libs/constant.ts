import { GameOption, GameState } from '../interface'

export const candidates = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export const payouts = [
  0,
  0,
  0,
  0,
  0,
  0,
  10000,
  36,
  720,
  360,
  80,
  252,
  108,
  72,
  54,
  180,
  72,
  180,
  119,
  36,
  306,
  1080,
  144,
  1800,
  3600,
]

export const tableHeader = [6, 3, 4, 5, 7]
export const tableRow = [0, 1, 2]

export const makeEmptyState = (): GameState => [0, 0, 0, 0, 0, 0, 0, 0, 0]
export const makeEmptyOption = (): GameOption => [false, false, false, false, false, false, false, false, false]
