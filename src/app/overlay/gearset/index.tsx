import { List } from 'immutable'
import { useState } from 'react'
import { Empty, SegmentedControl } from '#components/ui/controls'
import type { OverlayProps } from '../../interface'
import type { GearsetDTO } from './interface'
import { AvgLevel } from './mods/avg-ilvl'
import { GearsetPart } from './mods/part'
import './index.css'
import { useEvent } from '../../../lib/event'

const leftSlots = [0, 2, 3, 4, 6, 7]
const rightSlots = [1, 8, 9, 10, 11, 12, 13]

function Gearset({
  title,
  list,
  language,
  empty,
}: {
  title: string
  list: List<GearsetDTO>
  language: string
  empty: string
}) {
  return (
    <section className="gearset">
      <header className="gearset-head">
        <h3>{title}</h3>
        <AvgLevel list={list} language={language} />
      </header>
      {list.isEmpty() ? (
        <Empty>{empty}</Empty>
      ) : (
        <div className="gearset-slots">
          {[...leftSlots, ...rightSlots].map((index) => (
            <GearsetPart
              key={index}
              part={list.get(index)}
              language={language}
            />
          ))}
        </div>
      )}
    </section>
  )
}

type TimedGearsetDTO = GearsetDTO & {
  time: number
}

export function GearsetOverlay({
  language,
  eventEmitter,
  active,
  setActive,
}: OverlayProps) {
  const [mine, setMine] = useState(List<TimedGearsetDTO>())
  const [others, setOthers] = useState(List<TimedGearsetDTO>())
  const [view, setView] = useState<'others' | 'mine'>('others')

  useEvent(eventEmitter, 'Reset', () => {
    setMine(List())
    setOthers(List())
  })

  useEvent<GearsetDTO>(eventEmitter, 'Gearset', (info, log) => {
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
  })

  if (!active) return null

  return (
    <div className="overlay overlay-gearset" data-view={view}>
      <SegmentedControl<'others' | 'mine'>
        label="装备"
        className="gearset-switch"
        value={view}
        onValueChange={setView}
        options={[
          { value: 'others', label: '他人装备' },
          { value: 'mine', label: '我的装备' },
        ]}
      />
      <div className="gearset-columns">
        <Gearset
          title="他人装备"
          language={language}
          list={others}
          empty="查看其他玩家的装备后显示在这里"
        />
        <Gearset
          title="我的装备"
          language={language}
          list={mine}
          empty="暂无配装数据"
        />
      </div>
    </div>
  )
}
