export interface MiniCactpotDTO {
  isNewGame: boolean
  x: number
  y: number
  value: number
}

type Tuple<T, N extends number> = N extends N ? (number extends N ? T[] : _TupleOf<T, N, []>) : never
type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N ? R : _TupleOf<T, N, [T, ...R]>

type Tuple9<T> = Tuple<T, 9>

export type GameState = Tuple9<number>
export type GameOption = Tuple9<boolean>
