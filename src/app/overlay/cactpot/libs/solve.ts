import { useMemo } from 'react'
import { GameState } from '../interface'
import { suggestOpening } from './opening'
import { calcExpection, solveAny } from './yuryu'

export interface CactpotState {
  count: number
  input: GameState
  scores: number[]
  lines: number[]
  suggestion: number[]
}

export function useCactpot(input: GameState): CactpotState {
  return useMemo(() => {
    const visible = input.map((v, i) => (v ? i : -1)).filter((i) => i !== -1)
    const count = visible.length
    let suggestion: number[] = []
    let scores: number[] = []
    let lines: number[] = []

    switch (count) {
      case 1: {
        const index = visible[0]
        suggestion = suggestOpening(index, input[index])
        break
      }
      case 2:
      case 3:
        suggestion = solveAny(input)
        break
      case 4: {
        const [expection, option] = calcExpection(input)
        scores = expection
        lines = option
        break
      }
    }

    return {
      count,
      input,
      scores,
      lines,
      suggestion,
    }
  }, [input])
}
