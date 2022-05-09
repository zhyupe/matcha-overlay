import cn from 'classnames'
import { useMemo } from 'react'
import { GameState } from '../interface'
import { candidates, tableHeader, tableRow } from '../libs/constant'
import { CactpotState, useCactpot } from '../libs/solve'

function SumCell({ state, index }: { state: CactpotState; index: number }) {
  const suggested = state.lines.includes(index)
  const value = state.scores[index]

  return (
    <th className={suggested ? 'cactpot-max' : ''}>
      <span>{value ? value.toFixed() : '\u00A0'}</span>
    </th>
  )
}

function InputCell({ state, index }: { state: CactpotState; index: number }) {
  const value = state.input[index]
  const suggested = useMemo(() => {
    if (state.lines.length) {
      return state.lines.some((key) => candidates[key].includes(index))
    } else {
      return state.suggestion.includes(index)
    }
  }, [state, index])
  const unknown = value === 0

  return (
    <td>
      <InputBody value={value} suggested={suggested} unknown={unknown} />
    </td>
  )
}

export function InputBody({ value, suggested, unknown }: { value?: number; suggested?: boolean; unknown?: boolean }) {
  return <span className={cn('cactpot-input', unknown && 'unknown', suggested && 'suggested')}>{value || ' '}</span>
}

export function Table({ input }: { input: GameState }) {
  const state = useCactpot(input)

  return (
    <table>
      <tbody>
        <tr>
          {tableHeader.map((key) => (
            <SumCell key={key} state={state} index={key} />
          ))}
        </tr>
        {tableRow.map((key, row) => (
          <tr key={row}>
            <SumCell state={state} index={key} />
            {[0, 1, 2].map((column) => {
              const index = row * 3 + column
              return <InputCell key={column} index={index} state={state} />
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
