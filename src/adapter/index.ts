import { adapter as act } from './act'
import { adapter as mojito } from './mojito'
import type { OverlayAdapter } from './types'

export type { AdapterState, MapSession, OverlayAdapter } from './types'
export const isMojitoSource = (
  location: Pick<Location, 'protocol' | 'search'>,
) =>
  location.protocol === 'mojito-plugin:' ||
  new URLSearchParams(location.search).get('source') === 'mojito'
export const adapter: OverlayAdapter =
  typeof window !== 'undefined' && isMojitoSource(window.location)
    ? mojito
    : act
