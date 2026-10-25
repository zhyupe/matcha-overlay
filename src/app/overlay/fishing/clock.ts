import type { FishingEvent } from './model'

export interface FishingClock {
  castId: string
  eventTime: number
  receivedAt: number
  stoppedAt: number | null
}

export function updateClock(
  current: FishingClock | null,
  cast: FishingEvent | null,
  receivedAt: number,
): FishingClock | null {
  if (!cast?.castId || cast.castTime == null) return null
  const clock =
    current?.castId === cast.castId
      ? current
      : {
          castId: cast.castId,
          eventTime: cast.action === 'cast' ? cast.castTime : cast.time,
          receivedAt,
          stoppedAt: null,
        }
  if (
    clock.stoppedAt != null ||
    cast.action === 'cast' ||
    cast.action === 'place'
  )
    return clock
  return { ...clock, stoppedAt: cast.biteTime ?? cast.hookTime ?? cast.time }
}

export function clockTime(clock: FishingClock | null, now: number): number {
  if (!clock) return 0
  return (
    clock.stoppedAt ?? clock.eventTime + Math.max(0, now - clock.receivedAt)
  )
}

/** Replay time comes from the host, including pause and seek; never extrapolate wall time at an unknown rate. */
export function displayClockTime(
  clock: FishingClock | null,
  now: number,
  source?: { source: string | null; now: number | null },
) {
  if (!clock) return 0
  if (clock.stoppedAt !== null) return clock.stoppedAt
  if (source?.source === 'replay') return Math.max(clock.eventTime, source.now ?? clock.eventTime)
  return clockTime(clock, now)
}
