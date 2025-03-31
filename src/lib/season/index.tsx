import { createContext, CSSProperties, PropsWithChildren, useMemo } from 'react'
import './2025.scss'

const matchaIcon = {
  type: 'svg' as const,
  value:
    'M197.64,360c15.85-88.59-111.9-66.21-111.9-204.22,4.87,7.3,23.25,24.28,23.63,24.56,42.09,30,93.87,15.56,93.87,99.47,0-98.85,88.59-103.51,88.59-188.37C370.15,236.91,220,283.53,197.64,360Zm6.53-116.56c0-84.86,52.22-73.67,52.22-125.89C256.39,83,234.94,60,214,60c-30.32,0-30.32,40.76-30.32,74.33,0-28-15.85-65.21-35.28-65.21C123,69.12,123,104.49,123,114.75,123,185.62,204.17,186.55,204.17,243.44Z',
}

const useAprilStyle = (() => {
  const setting = localStorage.getItem('force-april-style')
  if (setting === 'true') {
    return true
  }

  if (setting === 'false') {
    return false
  }

  const now = new Date()
  return now.getMonth() + 1 === 4 && now.getDate() === 1
})()

interface ISeason {
  className?: string
  icon?: {
    type: 'img' | 'svg'
    value: string
  }
  title?: string
  titleEn?: string
  footer?: string
  style?: CSSProperties
}

const createCanvas = (w: number, h: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h

  return canvas
}

const draw = () => {
  if (!useAprilStyle) return null

  const size = 400
  const cycle = 100

  const canvasY = createCanvas(size, size)
  const canvasP = createCanvas(size, size)

  const ctxY = canvasY.getContext('2d')!
  ctxY.strokeStyle = '#ffdc2b'
  ctxY.lineWidth = 2
  ctxY.fillStyle = '#282c34'
  ctxY.fillRect(0, 0, size, size)

  const ctxP = canvasP.getContext('2d')!
  ctxP.strokeStyle = '#952bff'
  ctxP.lineWidth = 20
  ctxP.fillStyle = '#282c34'
  ctxP.fillRect(0, 0, size, size)

  for (let i = 0; i < cycle; ++i) {
    const x = Math.random() * (size * 1.2) - size * 0.2
    const y = Math.random() * (size * 1.2) - size * 0.2
    const w = ((Math.random() * 0.8 + 0.2) * size) / 2
    const h = ((Math.random() * 0.8 + 0.2) * size) / 2

    ctxY.strokeRect(x, y, w, h)
    ctxP.strokeRect(x, y, w, h)
    ctxY.fillRect(x, y, w, h)
    ctxP.fillRect(x, y, w, h)
  }

  const bgCanvas = createCanvas(size, size)
  const bgCtx = bgCanvas.getContext('2d')!
  bgCtx.globalAlpha = 0.3
  bgCtx.strokeStyle = '#ffdc2b'
  bgCtx.drawImage(canvasY, 0, 0)
  bgCtx.strokeRect(0, 0, size, size)

  return {
    bg: bgCanvas.toDataURL(),
    logo: canvasP.toDataURL(),
  }
}

export const SeasonContext = createContext<ISeason>({})
export function SeasonProvider({ children }: PropsWithChildren<{}>) {
  const value = useMemo<ISeason>(() => {
    if (!useAprilStyle) {
      return {
        icon: matchaIcon,
        title: '抹茶 Matcha',
        titleEn: 'Matcha',
      }
    }

    const img = draw()
    return {
      className: 'app-season-2025',
      style: {
        backgroundImage: img ? `url(${img.bg})` : 'none',
      },
      icon: img
        ? {
            type: 'img',
            value: img.logo,
          }
        : matchaIcon,
      title: '雷转质',
      titleEn: 'Electrope',
      footer: " / Aprils' Special",
    }
  }, [])

  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>
}
