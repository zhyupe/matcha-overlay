import { useState } from 'react'
import type { OverlayProps } from '../../interface'
import type { GameState, MiniCactpotDTO } from './interface'
import { InputBody, Table } from './mods/table'
import './index.scss'
import { Empty } from '#components/ui/controls'
import { useEvent } from '../../../lib/event'
import { makeEmptyState } from './libs/constant'

export function CactpotOverlay({
  eventEmitter,
  active,
  setActive,
}: OverlayProps) {
  const [table, setTable] = useState(makeEmptyState)

  useEvent(eventEmitter, 'Reset', () => setTable(makeEmptyState()))

  useEvent<MiniCactpotDTO>(eventEmitter, 'MiniCactpot', (info) => {
    if (!active) {
      setActive()
    }

    const index = 3 * info.y + info.x
    setTable((table) => {
      if (info.isNewGame) {
        table = makeEmptyState()
      }

      return [
        ...table.slice(0, index),
        info.value,
        ...table.slice(index + 1),
      ] as GameState
    })
  })

  if (!active) return null

  if (table.every((item) => item === 0)) {
    return (
      <div className="overlay">
        <Empty>请与 NPC 对话参加“仙人微彩”有奖竞猜，翻开第一格后显示推荐</Empty>
      </div>
    )
  }

  return (
    <div className="overlay overlay-cactpot">
      <Table input={table} />
      <ul className="cactpot-legend">
        <li>
          <InputBody unknown /> 未翻开
        </li>
        <li>
          <InputBody value={1} /> 已翻开
        </li>
        <li>
          <InputBody suggested unknown /> 推荐翻开
        </li>
        <li>
          <span className="cactpot-legend-sum">72</span> 期望奖励最高的连线
        </li>
      </ul>
    </div>
  )
}
