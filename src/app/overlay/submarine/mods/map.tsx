import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '#components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#components/ui/select'
import type { SubmarineMap } from '../../../../data/submarine'
import { xivapi } from '../../../../lib/xivapi'
import type { useSpotStatus } from '../lib/ship'

const imageWidth = 880
const imageHeight = 760
const clipLeft = 100
const clipRight = 60
const clipTop = 30
const clipBottom = 0
const offsetX = 155
const offsetY = 96
const scale = 0.6
const radius = 20

const width = imageWidth - clipLeft - clipRight
const height = imageHeight - clipTop - clipBottom
const canvasSize = Math.max(width, height)

const colorStart = '#22b14c'
const colorSpot = '#00a2e8'

const spotToCanvas = ({ x, y }: { x: number; y: number }): [number, number] => [
  x * scale + offsetX - clipLeft,
  y * scale + offsetY,
]

const distance2 = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)

function useImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement>()

  useEffect(() => {
    if (!src) {
      setImage(undefined)
      return
    }

    setImage(undefined)

    const next = new Image()
    next.crossOrigin = 'anonymous'

    const handleLoad = () => setImage(next)
    const handleError = () => setImage(undefined)

    next.addEventListener('load', handleLoad)
    next.addEventListener('error', handleError)
    next.src = src

    return () => {
      next.removeEventListener('load', handleLoad)
      next.removeEventListener('error', handleError)
    }
  }, [src])

  return image
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  const gradient = ctx.createLinearGradient(0, 0, canvasSize, canvasSize)
  gradient.addColorStop(0, '#172634')
  gradient.addColorStop(0.55, '#203e4d')
  gradient.addColorStop(1, '#111821')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvasSize, canvasSize)

  ctx.strokeStyle = '#ffffff12'
  ctx.lineWidth = 1
  for (let x = 0; x < canvasSize; x += 60) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvasSize)
    ctx.stroke()
  }
  for (let y = 0; y < canvasSize; y += 60) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvasSize, y)
    ctx.stroke()
  }
}

function Circle({
  text = ' ',
  color,
  dashed = false,
}: {
  color: string
  text?: string
  dashed?: boolean
}) {
  return (
    <span
      className="mx-[5px] inline-block size-[22px]  box-border rounded-full border-2 border-dashed text-center"
      style={{
        borderColor: color,
        backgroundColor: dashed ? '#fff' : color,
        color: dashed ? color : '#fff',
      }}
    >
      {text}
    </span>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span>
        <Circle color={colorStart} />
        起始点
      </span>
      <span>
        <Circle color={colorSpot} text="A" dashed />
        未探索
      </span>
      <span>
        <Circle color={colorSpot} text="A" />
        已探索
      </span>
    </div>
  )
}

export function VoyageMap({
  maps,
  spotStatus,
  activeMap: mapId,
  setActiveMap,
}: {
  maps: Record<string, SubmarineMap>
  spotStatus: ReturnType<typeof useSpotStatus>
  activeMap: string
  setActiveMap: (key: string) => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const map = maps[mapId]
  const mapImageUrl = useMemo(
    () => (map?.image ? xivapi.formatIconUrl(map.image) : undefined),
    [map?.image],
  )
  const mapImage = useImage(mapImageUrl)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !map) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasSize, canvasSize)
    if (mapImage) {
      ctx.drawImage(mapImage, -clipLeft, -clipTop)
    } else {
      drawBackground(ctx)
    }

    ctx.save()
    ctx.setLineDash([8, 8])
    ctx.lineWidth = 4
    ctx.strokeStyle = '#000'
    ctx.shadowColor = '#fff'
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2

    for (const spot of Object.values(map.spots)) {
      if (!spot.parent) continue

      ctx.beginPath()
      ctx.moveTo(...spotToCanvas(map.spots[spot.parent]))
      ctx.lineTo(...spotToCanvas(spot))
      ctx.stroke()
    }

    ctx.restore()

    const points: Array<[number, number, string, boolean]> = []
    ctx.save()
    ctx.font = '20px Arial'
    ctx.textAlign = 'center'
    for (const spot of Object.values(map.spots)) {
      const [x, y] = spotToCanvas(spot)
      const isStart = spot.location === '0'
      const color = isStart ? colorStart : colorSpot
      const isDiscovered = isStart || spotStatus.get(mapId, spot.location)

      ctx.strokeStyle = color
      ctx.fillStyle = isDiscovered ? color : '#fff'
      ctx.setLineDash(isDiscovered ? [] : [8, 8])
      ctx.lineWidth = 4

      ctx.beginPath()
      ctx.arc(x, y, radius, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()

      if (!isStart) {
        points.push([x, y, spot.location, isDiscovered])
        ctx.fillStyle = isDiscovered ? '#fff' : color
        ctx.fillText(spot.location, x, y + 8)
      }
    }
    ctx.restore()

    const handler = (event: MouseEvent) => {
      const scaleX = canvas.clientWidth / canvasSize
      const scaleY = canvas.clientHeight / canvasSize
      const x = event.offsetX / scaleX
      const y = event.offsetY / scaleY

      for (const [px, py, spot, isDiscovered] of points) {
        if (distance2(x, y, px, py) < radius) {
          spotStatus.update(mapId, spot, !isDiscovered)
          break
        }
      }
    }

    canvas.addEventListener('click', handler)
    return () => {
      canvas.removeEventListener('click', handler)
    }
  }, [mapId, map, mapImage, spotStatus])

  const menu = useMemo(() => Object.entries(maps), [maps])
  const mapItems = useMemo(
    () => menu.map(([key, value]) => ({ value: key, label: value.name })),
    [menu],
  )

  if (!map) return null

  return (
    <>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <Select items={mapItems} value={mapId} onValueChange={setActiveMap}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="选择地图" />
          </SelectTrigger>
          <SelectContent>
            {menu.map(([key, value]) => (
              <SelectItem key={key} value={key}>
                {value.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => spotStatus.updateAll(mapId, true)}
          >
            全选
          </Button>
          <Button
            type="button"
            onClick={() => spotStatus.updateAll(mapId, false)}
          >
            清空
          </Button>
        </div>
      </div>
      <div className="mb-2.5">
        <Legend />
      </div>
      <canvas
        className="mx-auto block aspect-square h-auto w-[min(100%,56vh)] cursor-pointer rounded-[5px]"
        height={canvasSize}
        ref={ref}
        width={canvasSize}
      />
    </>
  )
}
