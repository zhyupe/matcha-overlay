import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] })
try {
  const page = await browser.newPage({ viewport: { width: 620, height: 600 } })
  const errors = [], external = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (request.url().includes('api.ffxiv.cyou')) external.push(request.url()) })
  await page.goto(process.env.FISHING_PREVIEW_URL || 'http://127.0.0.1:5178/')
  await page.waitForFunction(() => typeof window._dev_mock === 'function')
  const emit = (type, event) => page.evaluate(({ type, event }) => window._dev_mock(`00|${new Date().toISOString()}|0|Matcha#test#chs-${type}|${JSON.stringify(event)}`), { type, event })
  const cast = { action: 'cast', time: Date.now(), castTime: Date.now(), biteTime: null, hookTime: null,
    castId: 'artificial-online', baitId: 10, baseBaitId: 10, placeId: 20, chum: true,
    snagging: false, mooch: false, statuses: [], tug: null, fishId: null }
  await emit('Fishing', cast)
  const panel = page.getByRole('region', { name: '钓鱼计时与预测' })
  await panel.waitFor()
  const timer = panel.locator('.fishing-clock > span')
  let revision = 0
  const snapshot = (state, rows = [], enabled = true) => ({ version: 1, session: 'artificial-service', revision: ++revision,
    cast, state, distributions: rows, enabled, cachedAt: Date.now() })
  await emit('FishingStatistics', snapshot('loading'))
  await page.waitForTimeout(350)
  assert.match(await panel.innerText(), /查询中/)
  const elapsed = Number(await timer.innerText())
  const rows = [{ bait_id: 10, fish_id: 30, is_chum: true, tug_type: 1, count: 40,
    range: { min: 4000, max: 10000, effective_min: 5000, effective_max: 9000 }, percentiles: { p50: 7000 } }]
  await emit('FishingStatistics', snapshot('ready', rows))
  await page.waitForTimeout(150)
  assert.match(await panel.innerText(), /5.0–9.0 秒/)
  assert.match(await panel.innerText(), /鱼漂 · 40/)
  assert(Number(await timer.innerText()) >= elapsed, 'HTTP completion never restarts timer')
  await emit('FishingStatistics', snapshot('stale', rows))
  await page.waitForTimeout(50)
  assert.match(await panel.innerText(), /查询失败，暂用缓存/)
  assert.match(await panel.innerText(), /5.0–9.0 秒/)
  const old = snapshot('ready', rows)
  await emit('FishingStatistics', snapshot('disabled', [], false))
  await emit('FishingStatistics', old)
  await page.waitForTimeout(50)
  assert(!/鱼漂 · 40/.test(await panel.innerText()), 'late revision cannot restore revoked data')
  assert(Number(await timer.innerText()) >= elapsed, 'consent changes never stop timer')
  assert.deepEqual(external, [], 'browser never queries the external service')
  assert.deepEqual(errors, [])
  console.log('PASS: loading/stale/revoked UI, continuous timer, stale response rejection, no browser HTTP')
} finally { await browser.close() }
