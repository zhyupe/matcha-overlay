import type { SubmarineSpot } from '../../../../data/submarine'

const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60

export const distance3 = (
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
) => Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2 + (z1 - z2) ** 2)

export function getSpotsDistance(a: SubmarineSpot, b: SubmarineSpot) {
  return distance3(a.x, a.y, a.z, b.x, b.y, b.z)
}

export function getSubmarineVoyageDistance(distance: number) {
  return Math.floor(distance * 0.035)
}

export function getSubmarineVoyageTime(
  distance: number,
  duration: number,
  speed: number,
) {
  return (
    (12 * MINUTES_PER_HOUR + (distance * 40 + duration * 70) / speed) *
    SECONDS_PER_MINUTE
  )
}

export function getSubmarineSecondsForSpots(
  a: SubmarineSpot,
  b: SubmarineSpot,
  speed: number,
) {
  const distance = getSpotsDistance(a, b)
  const duration = b.duration
  return ((distance * 40 + duration * 70) / speed) * SECONDS_PER_MINUTE
}

export function getSubmarineScore(expectation: number, seconds: number) {
  // 计算每分钟产出
  return (expectation / (seconds + 12 * 3600)) * SECONDS_PER_MINUTE
}

export const random = (): string =>
  `${Date.now().toString(36)}.${Math.random().toString(36).substr(2, 6)}`
