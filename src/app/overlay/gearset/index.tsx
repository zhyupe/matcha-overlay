import React, { useState, useEffect } from 'react'
import { List } from 'immutable'
import { GearsetMateria, GearsetDTO } from './interface'
import { MatchaEvent, OverlayProps } from '../../interface'
import { GearsetPart } from './mods/part'
import { AvgLevel } from './mods/avg-ilvl'
import './index.css'

function parseLog(logData: number[]): GearsetDTO {
  const [type, slot, itemId, , hq, glamourId, , ...rawMaterias] = logData

  const materias: GearsetMateria[] = []

  for (let i = 0; i < 5; ++i) {
    if (!rawMaterias[i * 2]) break
    materias.push({ type: rawMaterias[i * 2], tier: rawMaterias[i * 2 + 1] })
  }

  return {
    self: type === 0,
    slot,
    item: itemId,
    hq: hq === 1,
    glamour: glamourId,
    materias,
  }
}

function Gearset({ title, list }: { title: string; list: List<GearsetDTO> }) {
  return (
    <div className="gearset-wrap">
      <h3>
        {title} <AvgLevel list={list} />
      </h3>
      {list.isEmpty() ? (
        <div className="gearset-empty">暂无配装数据</div>
      ) : (
        <div className="gearset-container">
          <div className="gearset-left">
            {[0, 2, 3, 4, 5, 6, 7].map((index) => (
              <GearsetPart key={index} part={list.get(index)} />
            ))}
          </div>
          <div className="gearset-right">
            {[1, 8, 9, 10, 11, 12, 13].map((index) => (
              <GearsetPart key={index} part={list.get(index)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function GearsetOverlay({ eventEmitter, active, setActive }: OverlayProps) {
  const [mine, setMine] = useState(List<GearsetDTO>())
  const [others, setOthers] = useState(List<GearsetDTO>())

  useEffect(() => {
    const handleLog = function (log: MatchaEvent<GearsetDTO | number[]>) {
      const info = Array.isArray(log.content) ? parseLog(log.content) : log.content

      if (!active && !info.self) {
        setActive()
      }

      ;(info.self ? setMine : setOthers)((list) => list.set(info.slot, info))
    }

    eventEmitter.on('Gearset', handleLog)
    return () => {
      eventEmitter.off('Gearset', handleLog)
    }
  }, [active, eventEmitter, setActive])

  if (!active) return null

  return (
    <div className="overlay overlay-gearset">
      <Gearset title="我的装备" list={mine} />
      <Gearset title="他人装备" list={others} />
    </div>
  )
}
