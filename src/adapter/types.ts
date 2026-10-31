import type { MatchaEvent } from '../app/interface'
export type Dispose = () => void
export type MapLibrary = typeof import('@thewakingsands/eorzea-interactive-map')
export interface ViewClock {
  source: string | null
  now: number | null
  paused: boolean
}
export interface AdapterState {
  status: 'connecting' | 'connected' | 'error'
  message: string
  version?: string
  language: string
  clock: ViewClock | null
  mapGeneration: number
  unsupportedActWebSocket: boolean
}
export interface MapSession {
  prepareIcons(ids: number[]): Promise<void>
  dispose: Dispose
}
export interface OverlayAdapter {
  readonly name: 'ACT' | 'Mojito'
  prepare(): Promise<void>
  dispose(): void
  subscribeEvents(
    receive: (event: MatchaEvent<unknown>) => void,
  ): Promise<Dispose>
  getState(): AdapterState
  subscribeState(listener: () => void): Dispose
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> & {
    subscribe(key: string, listener: (value: string | null) => void): Dispose
  }
  speak(text: string): Promise<void>
  fetch(url: string, options?: { signal?: AbortSignal }): Promise<Response>
  resolveImage(url: string): Promise<{ url: string; dispose: Dispose }>
  createMapSession(library: MapLibrary): Promise<MapSession>
}
