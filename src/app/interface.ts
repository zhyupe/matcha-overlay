import { EventEmitter } from 'events'
import { NgldMessage } from '../ngld'

export interface LogEvent extends NgldMessage {
  type: string
  line: string[]
  rawLine: string
}

export interface MatchaEvent<T = string> {
  time: Date
  type: string
  version: string
  content: T
}

export interface OverlayProps {
  version?: string
  active: boolean
  setActive: () => void
  eventEmitter: EventEmitter
}
