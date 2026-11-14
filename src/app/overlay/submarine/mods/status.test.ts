import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { type Ship, ShipType } from '../lib/ship'
import { VoyageEdit } from './status'

vi.mock('../../../../lib/config', () => ({ useConfig: vi.fn() }))

const ship: Ship = {
  index: 0,
  type: ShipType.Submarine,
  name: '测试潜艇',
  rank: 1,
  parts: [3, 4, 1, 2],
  status: 1,
  returnTime: 0,
}

function render(conditions?: Ship['conditions']) {
  return renderToStaticMarkup(
    createElement(VoyageEdit, {
      ships: [{ ...ship, conditions }],
      activeKey: 0,
      setActiveKey: vi.fn(),
      shipStatus: null,
      onCalculate: vi.fn(),
    }),
  )
}

it('keeps the submarine and equipment visible without unknown durability fields', () => {
  for (const conditions of [undefined, [null, null, null, null]]) {
    const html = render(conditions)
    expect(html).toContain('测试潜艇')
    expect(html).toContain('#3')
    expect(html).toContain('#4')
    expect(html).not.toContain('耐久未知')
    expect(html).not.toContain('class="text-fg-3"')
  }
})

it('still displays broken, low and known conditions', () => {
  const html = render([0, 1, 15000, 30000])
  expect(html).toContain('已损坏')
  expect(html).toContain('&lt;1%')
  expect(html).toContain('50%')
  expect(html).toContain('100%')
  expect(html).toContain('text-danger')
})
