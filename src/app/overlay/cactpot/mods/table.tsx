import React, { useMemo } from 'react'
import { solve, candidates } from '../libs/solve'

/*
 * 0 1 2
 * 3 4 5
 * 6 7 8
 */

// const openings = [
//   [[3, 2, 6], [7, 4], [9, 2, 4, 6]],
//   [[3, 4], [4, 6, 8], [5, 4, 6, 8], [7, 4], [9, 0, 2]],
//   [[3, 0, 8], [7, 4], [9, 0, 4, 8]],
//   [[3, 4], [4, 2, 8], [5, 2, 4, 8], [7, 4], [9, 0, 6]],
//   [[9, 0, 2, 6, 8]],
// ]

function SumCell({ max, value }: { max?: number; value?: number }) {
  return (
    <th className={max === value ? 'cactpot-max' : ''}>
      <span>{value || '\u00A0'}</span>
    </th>
  )
}

function InputCell({ value, highlight }: { value?: number; highlight?: boolean }) {
  const isUnknown = value === 0
  return (
    <td>
      <span className={`cactpot-input${isUnknown ? ' unknown' : ''}${highlight ? ' highlight' : ''}`}>
        {value || ' '}
      </span>
    </td>
  )
}

export function Table({ input }: { input: number[] }) {
  const count = input.reduce((count, item) => count + (item ? 1 : 0), 0)
  const result = useMemo(() => {
    if (count < 4) return []
    return solve(input)
  }, [count, input])

  const max = useMemo(() => result.reduce((max, cur) => Math.max(max, cur), 0), [result])

  const highlight = useMemo(() => {
    const ret: Array<true | undefined> = []
    result.forEach((item, i) => {
      if (item !== max) return

      candidates[i].forEach((index) => {
        ret[index] = true
      })
    })

    return ret
  }, [result, max])

  return (
    <table>
      <tbody>
        <tr>
          {[6, 3, 4, 5, 7].map((key) => (
            <SumCell key={key} max={max} value={result[key]} />
          ))}
        </tr>
        {[0, 1, 2].map((row) => (
          <tr key={row}>
            <SumCell max={max} value={result[row]} />
            {[0, 1, 2].map((column) => {
              const index = row * 3 + column
              return <InputCell key={column} highlight={highlight[index]} value={input[index]} />
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
