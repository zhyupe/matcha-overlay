import React, { useState, useEffect } from 'react'
import { List } from 'immutable'
import { GearsetDTO } from './interface'
import { MatchaEvent, OverlayProps } from '../../interface'
import { GearsetPart } from './mods/part'
import { AvgLevel } from './mods/avg-ilvl'
import './index.css'

function Gearset({ title, list, language }: { title: string; list: List<GearsetDTO>; language: string }) {
  return (
    <div className="gearset-wrap">
      <h3>
        {title} <AvgLevel list={list} language={language} />
      </h3>
      {list.isEmpty() ? (
        <div className="gearset-empty">暂无配装数据</div>
      ) : (
        <div className="gearset-container">
          <div className="gearset-left">
            {[0, 2, 3, 4, 6, 7].map((index) => (
              <GearsetPart key={index} part={list.get(index)} language={language} />
            ))}
          </div>
          <div className="gearset-right">
            {[1, 8, 9, 10, 11, 12, 13].map((index) => (
              <GearsetPart key={index} part={list.get(index)} language={language} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

type TimedGearsetDTO = GearsetDTO & {
  time: number
}

export function GearsetOverlay({ language, eventEmitter, active, setActive }: OverlayProps) {
  const [mine, setMine] = useState(List<TimedGearsetDTO>())
  const [others, setOthers] = useState(List<TimedGearsetDTO>())

  useEffect(() => {
    const handleLog = function (log: MatchaEvent<GearsetDTO>) {
      const info = log.content

      if (!active && !info.self) {
        setActive()
      }

      ;(info.self ? setMine : setOthers)((list) => {
        const time = log.time.getTime()
        const isClear = info.item === 0

        if (isClear) {
          const oldItem = list.get(info.slot)
          if (!oldItem || time - oldItem.time < 100) {
            return list
          }
        }

        return list.set(info.slot, {
          ...info,
          time,
        })
      })
    }

    eventEmitter.on('Gearset', handleLog)
    return () => {
      eventEmitter.off('Gearset', handleLog)
    }
  }, [active, eventEmitter, setActive])

  if (!active) return null

  return (
    <div className="overlay overlay-gearset">
      <Gearset title="我的装备" language={language} list={mine} />
      <Gearset title="他人装备" language={language} list={others} />
    </div>
  )
}
