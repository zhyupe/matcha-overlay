import React, { useState, useEffect } from 'react'
import { GearsetDTO, GearsetMateria } from '../interface'
import { HQ, Glamour } from '../../../../components/icon'
import { queryItem, ItemRecord, xivapiRoot } from '../../../../lib/store/item'

const materiaMap = [
  '', // Skip index 0
  '惰性',
  '刚力',
  '耐力',
  '巧力',
  '智力',
  '意力',
  '信力',
  '创火',
  '创冰',
  '创风',
  '创土',
  '创雷',
  '创水',
  '神眼',
  '武略',
  '雄略',
  '刚柔',
  '达识',
  '博识',
  '器识',
  '名匠',
  '魔匠',
  '巨匠',
  '战技',
  '咏唱',
]

const tierNumbers = '壹贰叁肆伍陆柒捌'

function Materias({ materias, slot, overmeld }: { materias: GearsetMateria[]; slot: number; overmeld: boolean }) {
  // 古武魂武会使用此字段存储属性信息
  if (materias.some(({ type }) => type >= materiaMap.length)) {
    return null
  }

  const icons = materias.map(({ type, tier }, index) => ({
    icon: `icon/materia/slot_${index >= slot ? 'overmeld' : 'normal'}_grade0${tier}.png`,
    name: `${materiaMap[type]}魔晶石${tierNumbers[tier]}型`,
  }))

  const maxMateria = overmeld ? 5 : slot
  for (let i = icons.length; i < maxMateria; ++i) {
    icons.push({
      icon: `icon/materia/slot_${i >= slot ? 'overmeld' : 'normal'}_empty.png`,
      name: '未镶嵌',
    })
  }

  if (icons.length > maxMateria) {
    icons.length = maxMateria
  }

  return (
    <>
      {icons.map(({ name, icon }, index) => (
        <img key={`${index}-${name}`} alt={name} src={icon} />
      ))}
    </>
  )
}

export function GearsetPart({ part }: { part?: GearsetDTO }) {
  const [record, setRecord] = useState<ItemRecord | null>()
  const [glamour, setGlamour] = useState<ItemRecord | null>()

  useEffect(() => {
    setRecord(null)
    setGlamour(null)

    if (!part) return

    if (part.item) {
      queryItem(part.item)
        .then((newRecord) => setRecord(newRecord))
        .catch(() => 0)
    }

    if (part.glamour) {
      queryItem(part.glamour)
        .then((newRecord) => setGlamour(newRecord))
        .catch(() => 0)
    }
  }, [part])

  if (!part || !part.item) {
    return <div className="gearset-item gearset-item-empty">空栏位</div>
  }

  if (!record) {
    return <div className="gearset-item gearset-item-empty">载入中，请稍候</div>
  }

  return (
    <div className="gearset-item">
      <div className="gearset-item-icon">{record ? <img alt="" src={`${xivapiRoot}${record.i}`} /> : null}</div>
      {glamour ? (
        <div className="gearset-item-name gearset-item-name-animated">
          <span>
            {record.n} {part.hq ? <HQ /> : null}
          </span>
          <span className="delay">
            <Glamour /> {glamour.n}
          </span>
        </div>
      ) : (
        <div className="gearset-item-name">
          {record.n} {part.hq ? <HQ /> : null}
        </div>
      )}
      <div className="gearset-item-materia">
        <Materias materias={part.materias} slot={record ? record.s : 5} overmeld={record ? !!record.a : false} />
      </div>
    </div>
  )
}
