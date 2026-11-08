import { expect, it, vi } from 'vitest'

vi.mock('../../../adapter', () => ({ adapter: { name: 'ACT' } }))
vi.mock('../../../components/dialog', () => ({ Dialog: () => null }))
vi.mock('../../../lib/season', () => ({ SeasonContext: {} }))

import { isOutdatedActVersion } from './index'

it('compares only ACT versions against the ACT minimum', () => {
  expect(isOutdatedActVersion('4.0.0-mojito.7', 'Mojito')).toBe(false)
  expect(isOutdatedActVersion('4.0.0-mojito.6', 'Mojito')).toBe(false)
  expect(isOutdatedActVersion('22.4.14.1906', 'ACT')).toBe(true)
  expect(isOutdatedActVersion('22.4.15.1906', 'ACT')).toBe(false)
  expect(isOutdatedActVersion('22.4.16.1906', 'ACT')).toBe(false)
  expect(isOutdatedActVersion(undefined, 'ACT')).toBe(false)
})
