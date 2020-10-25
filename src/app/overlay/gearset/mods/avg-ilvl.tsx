import React, { useState, useEffect } from 'react'
import { List } from 'immutable'
import { ILvl } from '../../../../components/icon'
import { GearsetDTO } from '../interface'
import { queryItem } from '../../../../lib/store/item'

const InvalidAvgILvl = -1

export function AvgLevel({ list }: { list: List<GearsetDTO> }) {
  const [ilvl, setILvl] = useState(InvalidAvgILvl)

  useEffect(() => {
    if (list.isEmpty()) {
      setILvl(InvalidAvgILvl)
      return
    }

    const itemIds = list.map((item) => (item && item.item ? item.item : 0)).toArray()
    if (itemIds.length > 12) {
      itemIds.length = 12
    }

    Promise.all(itemIds.map((item) => (item ? queryItem(item) : null)))
      .then((items) => {
        const totalLevel = items.reduce((sum, item, i) => {
          if (sum === InvalidAvgILvl || (itemIds[i] && !item)) {
            return InvalidAvgILvl
          }

          return item ? sum + item.l : sum
        }, 0)
        const divider = items[1] ? 13 : 12

        setILvl(Math.floor(totalLevel / divider))
      })
      .catch(() => {
        setILvl(InvalidAvgILvl)
      })
  }, [list])

  if (ilvl === InvalidAvgILvl) return null

  return (
    <small>
      <ILvl /> {ilvl}
    </small>
  )
}
