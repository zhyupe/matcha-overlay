import { useState } from 'react'
import { GameState, MiniCactpotDTO } from './interface'
import { OverlayProps } from '../../interface'
import { InputBody, Table } from './mods/table'
import './index.scss'
import { Alert } from '../../../components/alert'
import { useEvent } from '../../../lib/event'
import { makeEmptyState } from './libs/constant'

export function CactpotOverlay({ eventEmitter, active, setActive }: OverlayProps) {
  const [table, setTable] = useState(makeEmptyState)

  useEvent<MiniCactpotDTO>(eventEmitter, 'MiniCactpot', (info) => {
    if (!active) {
      setActive()
    }

    const index = 3 * info.y + info.x
    setTable((table) => {
      if (info.isNewGame) {
        table = makeEmptyState()
      }

      return [...table.slice(0, index), info.value, ...table.slice(index + 1)] as GameState
    })
  })

  if (!active) return null

  if (table.every((item) => item === 0)) {
    return <Alert title="未检测到仙人微彩">请与 NPC 对话参加“仙人微彩”有奖竞猜</Alert>
  }

  return (
    <div className="overlay overlay-cactpot">
      <Table input={table} />
      <ul>
        <li>
          <InputBody unknown /> 未翻开格子
        </li>
        <li>
          <InputBody value={1} /> 已翻开格子
        </li>
        <li>
          <InputBody suggested /> 推荐格子
        </li>
      </ul>
    </div>
  )
}
