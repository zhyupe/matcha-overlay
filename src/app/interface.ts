import type { EventEmitter } from 'events'

export interface MatchaEvent<T = string> {
  time: Date
  type: string
  version: string
  content: T
}

export interface OverlayProps {
  version?: string
  language: string
  active: boolean
  setActive: () => void
  eventEmitter: EventEmitter
}
