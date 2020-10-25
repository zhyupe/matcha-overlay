import React, { useState, useEffect } from 'react'
import { MiniCactpotDTO } from './interface'
import { MatchaEvent, OverlayProps } from '../../interface'
import { Table } from './mods/table'
import './index.css'
import { Alert } from '../../../components/alert'

const emptyTable = () => [0, 0, 0, 0, 0, 0, 0, 0, 0]

export function CactpotOverlay({ eventEmitter, active, setActive }: OverlayProps) {
  const [table, setTable] = useState(emptyTable)

  useEffect(() => {
    const handleLog = function (log: MatchaEvent<MiniCactpotDTO>) {
      const info = log.content

      if (!active) {
        setActive()
      }

      const index = 3 * info.y + info.x
      setTable((table) => {
        if (info.isNewGame) {
          table = emptyTable()
        }

        return [...table.slice(0, index), info.value, ...table.slice(index + 1)]
      })
    }

    eventEmitter.on('Cactpot', handleLog)
    eventEmitter.on('MiniCactpot', handleLog)
    return () => {
      eventEmitter.off('Cactpot', handleLog)
      eventEmitter.off('MiniCactpot', handleLog)
    }
  }, [active, eventEmitter, setActive])

  if (!active) return null

  if (table.every((item) => item === 0)) {
    return <Alert title="未检测到仙人微彩">请与 NPC 对话参加“仙人微彩”有奖竞猜</Alert>
  }

  return (
    <div className="overlay overlay-cactpot">
      <Table input={table} />
    </div>
  )
}
