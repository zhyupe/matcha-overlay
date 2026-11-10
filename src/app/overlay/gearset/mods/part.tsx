import { useEffect, useState, useSyncExternalStore } from 'react'
import { adapter } from '../../../../adapter'
import { Glamour, HQ, ILvl } from '../../../../components/icon'
import { ItemIcon } from '../../../../components/item-icon'
import {
  type ItemRecord,
  itemName,
  queryItem,
} from '../../../../lib/store/item'
import type { GearsetDTO, GearsetMateria } from '../interface'

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

const tierNumbers = [
  '壹',
  '贰',
  '叁',
  '肆',
  '伍',
  '陆',
  '柒',
  '捌',
  '玖',
  '拾',
  '拾壹',
  '拾贰',
]

function Materias({
  materias,
  slot,
  overmeld,
}: {
  materias: GearsetMateria[]
  slot: number
  overmeld: boolean
}) {
  if (materias.some(({ type }) => type >= materiaMap.length)) {
    return null
  }

  const icons = []
  for (let i = 0; i < materias.length; ++i) {
    const { type, tier } = materias[i]

    if (type >= materiaMap.length) {
      // 古武魂武会使用此字段存储属性信息
      return null
    }

    if (type === 0) {
      break
    }

    icons.push({
      id: `${i}-${type}-${tier}`,
      icon: `icon/materia/slot_${i >= slot ? 'overmeld' : 'normal'}_grade${tier.toString().padStart(2, '0')}.png`,
      name: `${materiaMap[type]}魔晶石${tierNumbers[tier]}型`,
    })
  }

  const maxMateria = overmeld ? 5 : slot
  for (let i = icons.length; i < maxMateria; ++i) {
    icons.push({
      id: `${i}-empty`,
      icon: `icon/materia/slot_${i >= slot ? 'overmeld' : 'normal'}_empty.png`,
      name: '未镶嵌',
    })
  }

  if (icons.length > maxMateria) {
    icons.length = maxMateria
  }

  return (
    <>
      {icons.map(({ id, name, icon }) => (
        <img key={id} alt={name} src={icon} />
      ))}
    </>
  )
}

type Props = {
  part?: GearsetDTO
  language: string
}

export function GearsetPart(props: Props) {
  const { mapGeneration } = useSyncExternalStore(
    adapter.subscribeState,
    adapter.getState,
  )
  return <Part key={mapGeneration} {...props} />
}

function Part({ part, language }: Props) {
  const [record, setRecord] = useState<ItemRecord | null>()
  const [glamour, setGlamour] = useState<ItemRecord | null>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRecord(null)
    setGlamour(null)
    setError(null)

    if (!part) return
    let active = true

    if (part.item) {
      queryItem(part.item, language)
        .then((newRecord) => {
          if (active) setRecord(newRecord)
        })
        .catch((error) => {
          if (active)
            setError(
              String(error).includes('permission_denied')
                ? '需要读取游戏数据权限'
                : '物品读取失败',
            )
        })
    }

    if (part.glamour) {
      queryItem(part.glamour, language)
        .then((newRecord) => {
          if (active) setGlamour(newRecord)
        })
        .catch(() => 0)
    }
    return () => {
      active = false
    }
  }, [language, part])

  if (!part?.item) {
    return (
      <div className="gear-slot gear-slot-empty">
        <span className="item-icon" />
        <span className="gear-name">空栏位</span>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="gear-slot gear-slot-empty">
        <span className="item-icon item-icon-empty" />
        <span className="gear-name">{error ?? '载入中'}</span>
      </div>
    )
  }

  return (
    <div className="gear-slot">
      <ItemIcon record={record} />
      <div className="gear-text">
        <div className={`gear-name ${glamour ? 'gearset-item-animated' : ''}`}>
          <span>
            {itemName(record, language)} {part.hq ? <HQ /> : null}
          </span>
          {glamour ? (
            <span className="delay">
              <Glamour /> {itemName(glamour, language)}
            </span>
          ) : null}
        </div>
        <div className="gear-meta">
          <span className="gear-ilvl">
            <ILvl /> {record.l}
          </span>
          <span className="gear-materia">
            <Materias
              materias={part.materias}
              slot={record ? record.s : 5}
              overmeld={record ? !!record.a : false}
            />
          </span>
        </div>
      </div>
    </div>
  )
}
