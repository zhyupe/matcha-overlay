import { OverlayProps } from '../../interface'
import { EorzeaMap, MapInfo } from '../../../components/map'
import { useTreasureSpot } from './data-source/treasure'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Maps } from '../../../data/maps'
import { MapIcon } from '../../../map/interface'
import cn from 'classnames'
import './index.scss'
import { MapAction, PointInfo } from './interface'
import { PostMoogleFate, PostMoogleState, usePostMoogle } from './data-source/post-moogle'
import { DC, Worlds } from '../../../data/worlds'
import { FFXIVFate, IFFXIVFate } from '../../../data/fates'
import { useConfig, useConfigBoolean } from '../../../lib/config'
import { Edit, Instance1, Instance2, Instance3, InstanceOffset } from '../../../components/icon'
import { useTimer } from '../../../lib/hook'

function Point({ point, empty = '未知' }: { point: PointInfo | null; empty?: string }) {
  const [name, x, y] = useMemo(() => {
    if (!point) {
      return [null, null, null]
    }

    const mapInfo = Maps[point.map]
    const pos = [point.x, point.y].map((pos, i) => {
      const [a, b] = pos.toFixed(1).split('.')
      return (
        <>
          {a}
          <small>.{b}</small>
        </>
      )
    })

    return [mapInfo.name, ...pos]
  }, [point])

  if (!point) {
    return <span>{empty}</span>
  }

  return (
    <div className="point">
      {name}
      <span className="position">
        ({x}, {y})
      </span>
    </div>
  )
}

function Treasure({ point, onClick }: { point: PointInfo | null; onClick: MapAction }) {
  const showOnMap = () => {
    if (!point) return

    onClick({
      map: point.map,
      markers: [
        {
          icon: MapIcon.Treasure,
          x: point.x,
          y: point.y,
        },
      ],
    })
  }

  useEffect(showOnMap, [point, onClick])

  return (
    <div className={cn('map-treasure space-between', point && 'clickable')} onClick={showOnMap}>
      <span className="tag">[寻宝]</span>
      <Point point={point} empty="未检测到宝图，请尝试切换地图" />
    </div>
  )
}

function PostMoogleStatus({ data, onClick }: { data: PostMoogleState; onClick: () => void }) {
  const statusText = useMemo(() => {
    if (!data.enabled) {
      return '未启用'
    }

    if (data.config.dc === 0) {
      return '未设置大区'
    }

    const count = data.config.fates.length
    if (count === 0) {
      return '未设置关注活动'
    }

    return `正在关注 ${count} 个活动`
  }, [data.enabled, data.config])

  return (
    <div className="status clickable" onClick={onClick}>
      {statusText}
      <Edit />
    </div>
  )
}

function Instance({ value }: { value: number }) {
  switch (value) {
    case 1:
      return <Instance1 />
    case 2:
      return <Instance2 />
    case 3:
      return <Instance3 />
  }

  return null
}

function EventTimer({ from, to }: { from: number; to: number }) {
  const timeString = useMemo(() => {
    const seconds = Math.floor((to - from) / 1000)
    if (seconds < 0) {
      return '--:--'
    }

    const minutes = Math.floor(seconds / 60)
    return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
  }, [from, to])

  return <span>{timeString}</span>
}

function PostMoogle({ data, onClick }: { data: PostMoogleState; onClick: MapAction }) {
  const [setting, setSetting] = useState(false)
  const [enabled, { setTrue, setFalse }] = useConfigBoolean('post-moogle-enabled')
  const [dc, setDC] = useConfig('post-moogle-dc', 0)
  const [time, setTime] = useState(0)

  const updateDC = (next: number) => {
    setDC(next)
    if (next === 0) {
      setFalse()
    } else {
      setTrue()
    }
  }

  const handleFate = (item: PostMoogleFate, fate: IFFXIVFate) => {
    const worldInfo = Worlds[item.world]

    onClick({
      map: fate.map!,
      markers: [
        {
          icon: MapIcon.Fate,
          x: fate.x!,
          y: fate.y!,
          title: `${worldInfo?.name || item.world}${
            item.instance ? `[icon:${InstanceOffset + item.instance}]` : ''
          } - ${fate.name}`,
        },
      ],
    })
  }

  useTimer(1000, data.data.length !== 0, () => {
    setTime(Date.now())
  })

  return (
    <div className="map-post-moogle">
      <div className="space-between">
        <span className="tag">[跨服广播]</span>
        <PostMoogleStatus data={data} onClick={() => setSetting(!setting)} />
      </div>
      {setting ? (
        <div className="map-post-moogle-setting dialog dialog-top-right">
          <div className="button-group">
            <button onClick={() => updateDC(0)}>关闭 {0 === dc ? '〇' : '×'}</button>
            {Object.entries(DC).map(([key, value]) => {
              if (typeof value === 'string') return null

              return (
                <button key={key} onClick={() => updateDC(value)}>
                  {key} {value === dc ? '〇' : '×'}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <ul className="map-post-moogle-list">
          {data.data.map((item) => {
            const fateInfo = FFXIVFate[item.fate]
            const worldInfo = Worlds[item.world]

            const key = `${item.world}-${item.instance}-${item.fate}-${item.receiveTime}`
            const clickable = fateInfo && fateInfo.map && fateInfo.x && fateInfo.y

            return (
              <li
                key={key}
                {...(clickable
                  ? {
                      className: 'clickable',
                      onClick: () => handleFate(item, fateInfo!),
                    }
                  : {})}
              >
                <div className="map-event-name">
                  <span className="map-event-world tag">
                    [{worldInfo?.name || item.world}
                    <Instance value={item.instance} />]
                  </span>
                  {fateInfo?.name || item.fate}
                </div>

                <EventTimer from={item.receiveTime} to={time} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function MapEventOverlay({ eventEmitter, active, setActive }: OverlayProps) {
  const treasure = useTreasureSpot(eventEmitter)
  const [mapInfo, setMapInfo] = useState<MapInfo>({ map: 0 })

  const action = useCallback<MapAction>(
    (nextMapInfo: MapInfo) => {
      setMapInfo(nextMapInfo)
      if (!active) {
        setActive()
      }
    },
    [active, setActive],
  )

  const postMoogle = usePostMoogle(eventEmitter)

  if (!active) return null

  return (
    <div className="overlay overlay-map-event">
      <main className="map-container">{mapInfo.map !== 0 ? <EorzeaMap {...mapInfo} /> : null}</main>
      <aside className="map-points">
        <Treasure point={treasure} onClick={action} />
        <PostMoogle data={postMoogle} onClick={action} />
      </aside>
    </div>
  )
}
