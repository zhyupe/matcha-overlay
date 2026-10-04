import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  updateConditionSnapshots,
  readPartCondition,
  formatCondition,
} from '../../src/app/overlay/submarine/lib/condition.ts'

test('partial snapshots, repair and resets preserve unknown versus broken', () => {
  const previous = updateConditionSnapshots([], {
    reset: false,
    index: 2,
    parts: [{ itemId: 700001, condition: 0 }, null, null, null],
  })
  assert.equal(readPartCondition(previous[2][0], 700001), 0)
  assert.equal(readPartCondition(previous[2][1], 700002), null)
  assert.equal(readPartCondition(previous[2][0], 700002), null)
  const repaired = updateConditionSnapshots(previous, {
    reset: false,
    index: 2,
    parts: [{ itemId: 700001, condition: 30000 }, null, null, null],
  })
  assert.equal(readPartCondition(repaired[2][0], 700001), 30000)
  assert.equal(previous[2][0].condition, 0)
  assert.deepEqual(updateConditionSnapshots(repaired, { reset: true }), [])
})

test('invalid entries and changed equipment cannot show stale durability', () => {
  const valid = { reset: false, index: 0, parts: [null, null, null, null] }
  assert.deepEqual(updateConditionSnapshots([], { ...valid, index: 4 }), [])
  assert.deepEqual(updateConditionSnapshots([], { ...valid, index: -1 }), [])
  assert.deepEqual(updateConditionSnapshots([], { ...valid, parts: [] }), [])
  for (const condition of [-1, 30001, NaN, 1.5, '30000']) {
    assert.equal(
      updateConditionSnapshots([], {
        ...valid,
        parts: [{ itemId: 700001, condition }, null, null, null],
      })[0][0],
      null,
    )
  }
  assert.equal(
    readPartCondition({ itemId: 700001, condition: 30000 }, undefined),
    null,
  )
  assert.equal(
    readPartCondition({ itemId: 700001, condition: 30000 }, 700002),
    null,
  )
})

test('presentation distinguishes missing, broken, low and full conditions', () => {
  assert.equal(formatCondition(null), '耐久未知')
  assert.equal(formatCondition(undefined), '耐久未知')
  assert.equal(formatCondition(0), '已损坏')
  assert.equal(formatCondition(1), '<1%')
  assert.equal(formatCondition(14999), '49%')
  assert.equal(formatCondition(30000), '100%')
})
