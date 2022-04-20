import { useState, useEffect } from 'react'
import { List } from 'immutable'
import { ILvl } from '../../../../components/icon'
import { GearsetDTO } from '../interface'
import { queryItem } from '../../../../lib/store/item'

const InvalidAvgILvl = -1

export function AvgLevel({ list, language }: { list: List<GearsetDTO>; language: string }) {
  const [ilvl, setILvl] = useState(InvalidAvgILvl)

  useEffect(() => {
    if (list.isEmpty()) {
      setILvl(InvalidAvgILvl)
      return
    }

    const itemIds = list.map((item) => (item && item.item ? item.item : 0)).toArray()
    if (itemIds.length > 13) {
      itemIds.length = 13
    }

    Promise.all(itemIds.map((item) => (item ? queryItem(item, language) : null)))
      .then((items) => {
        let totalLevel = items.reduce((sum, item, i) => {
          if (sum === InvalidAvgILvl || (itemIds[i] && !item)) {
            return InvalidAvgILvl
          }

          return item ? sum + item.l : sum
        }, 0)

        if (totalLevel === InvalidAvgILvl) {
          setILvl(InvalidAvgILvl)
          return
        }

        if (!itemIds[1] && items[0]) {
          totalLevel += items[0].l
        }

        setILvl(Math.floor(totalLevel / 13))
      })
      .catch(() => {
        setILvl(InvalidAvgILvl)
      })
  }, [language, list])

  if (ilvl === InvalidAvgILvl) return null

  return (
    <small>
      <ILvl /> {ilvl}
    </small>
  )
}
