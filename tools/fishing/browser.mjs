import assert from 'node:assert/strict'
import fs from 'node:fs'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox'],
})
try {
  const page = await browser.newPage({ viewport: { width: 620, height: 600 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(process.env.FISHING_PREVIEW_URL || 'http://127.0.0.1:5178/')
  await page.waitForFunction(() => typeof window._dev_mock === 'function')
  const emit = (type, event) =>
    page.evaluate(
      ({ type, event }) => {
        window._dev_mock(
          `00|${new Date(event.time || Date.now()).toISOString()}|0|Matcha#test#chs-${type}|${JSON.stringify(event)}`,
        )
      },
      { type, event },
    )
  const cast = {
    action: 'cast',
    time: Date.now() - 15000,
    castTime: Date.now() - 15000,
    biteTime: null,
    hookTime: null,
    castId: 'browser-example',
    actorId: 1,
    baitId: 29717,
    baseBaitId: 29717,
    placeId: 425,
    chum: false,
    snagging: false,
    mooch: false,
    statuses: [],
    tug: null,
    fishId: null,
  }
  await emit('Fishing', cast)
  const panel = page.getByRole('region', { name: '钓鱼计时与预测' })
  await panel.waitFor()
  const timer = panel.locator('.fishing-clock > span')
  assert(
    Number(await timer.innerText()) < 1,
    'cast starts at zero even when packet time is 15 seconds behind the browser',
  )
  await page.evaluate(() => {
    const originalNow = Date.now
    Date.now = () => originalNow() + 60000
  })
  await page.waitForTimeout(300)
  assert(
    Number(await timer.innerText()) < 2,
    'wall clock adjustments do not change the live timer',
  )
  assert.match(await page.locator('.header').innerText(), /地图事件/)
  assert.match(await panel.innerText(), /海雾村/)
  assert.equal(await panel.locator('.fishing-candidate').count(), 9)
  assert.equal(await page.locator('.map-container').count(), 0)
  assert.equal(await panel.getByRole('button').count(), 2)
  assert.equal(
    await panel.locator('details, select, input[type=number]').count(),
    0,
  )
  assert.equal(
    await panel.locator('.fishing-candidate[data-tug="0"]').count(),
    9,
  )
  const profile = {
    baitId: 29717,
    fishId: 4891,
    minMs: 13000,
    maxMs: 19000,
  }
  const importData = (data) =>
    panel.locator('input[type=file]').setInputFiles({
      name: 'example.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(data)),
    })
  await importData({
    format: 'matcha-fishing-ranges',
    version: 1,
    fish: [{ fishId: 4891, tug: 2, snagging: false, hookset: 'precision' }],
    ranges: [
      {
        fishId: 4891,
        baitId: 29717,
        biteSeconds: [13, 19],
      },
      {
        fishId: 4891,
        baitId: 2585,
        biteSeconds: [8, 45],
      },
    ],
  })
  await page.getByRole('status').filter({ hasText: '已合并' }).waitFor()
  assert.equal(
    await panel.locator('.fishing-candidate[data-tug="2"]').count(),
    1,
  )
  assert.match(await panel.innerText(), /13.0–19.0 秒/)
  const row = panel.locator('.fishing-candidate[data-fish-id="4891"]')
  assert.match(await row.getAttribute('title'), /所有钓饵：8.0–45.0 秒/)
  assert.match(await row.innerText(), /精准提勾/)
  assert.match(await row.getAttribute('title'), /中杆.*精准提勾/)
  const windows = await row.evaluate((element) => {
    const all = element.querySelector('.fishing-window-all')
    const current = element.querySelector('.fishing-window-current')
    return {
      allLeft: parseFloat(all.style.left),
      allWidth: parseFloat(all.style.width),
      currentLeft: parseFloat(current.style.left),
      currentWidth: parseFloat(current.style.width),
      allOpacity: Number(getComputedStyle(all).opacity),
      currentOpacity: Number(getComputedStyle(current).opacity),
    }
  })
  assert(windows.allOpacity > 0 && windows.allOpacity < 1)
  assert.equal(windows.currentOpacity, 1)
  assert(windows.allLeft < windows.currentLeft)
  assert(windows.allWidth > windows.currentWidth)
  assert(
    windows.allLeft + windows.allWidth <= 100,
    'axis includes all-bait maximum',
  )
  assert(
    Math.abs(windows.allWidth / windows.currentWidth - 37 / 6) < 0.001,
    'both intervals share the same time scale',
  )
  const bite = {
    ...cast,
    action: 'bite',
    time: cast.castTime + 15000,
    biteTime: cast.castTime + 15000,
    tug: 2,
  }
  await emit('Fishing', bite)
  await page.waitForTimeout(300)
  assert.equal(await panel.locator('.fishing-clock > span').innerText(), '15.0')
  await page.waitForTimeout(400)
  assert.equal(await panel.locator('.fishing-clock > span').innerText(), '15.0')
  await emit('Fishing', {
    ...bite,
    action: 'catch',
    time: bite.time + 1000,
    fishId: 4891,
  })
  await page.locator('.fishing-caught').waitFor()
  const downloadPromise = page.waitForEvent('download')
  await panel.getByRole('button', { name: '导出', exact: true }).click()
  const download = await downloadPromise
  await download.saveAs('/tmp/matcha-fishing-browser-export.json')
  const exported = JSON.parse(
    fs.readFileSync('/tmp/matcha-fishing-browser-export.json'),
  )
  assert.equal(exported.catches.length, 1)
  assert.equal(exported.profiles.length, 2)
  assert.deepEqual(exported.profiles[0], profile)
  assert.deepEqual(exported.fish, [
    { fishId: 4891, tug: 2, snagging: false, hookset: 'precision' },
  ])
  await importData({
    format: 'matcha-fishing-ranges',
    version: 1,
    fish: [{ fishId: 4891, tug: 2, snagging: false, hookset: 'precision' }],
    ranges: [
      { fishId: 4891, baitId: 29717, biteSeconds: [5, 6] },
      { fishId: 4891, baitId: 2585, biteSeconds: [20, 10] },
    ],
  })
  await page.getByRole('status').filter({ hasText: '第 2 条区间' }).waitFor()
  assert.match(await row.innerText(), /13.0–19.0 秒/)
  assert.deepEqual(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('matcha-fishing-v1')),
    ),
    exported,
    'an invalid file cannot partially replace saved ranges',
  )
  await importData({ version: 2 })
  await page
    .getByRole('status')
    .filter({ hasText: '需要 version: 1' })
    .waitFor()
  assert.equal(
    (
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem('matcha-fishing-v1')),
      )
    ).catches.length,
    1,
  )
  await importData(exported)
  await page.getByRole('status').filter({ hasText: '已合并' }).waitFor()
  assert.equal(
    (
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem('matcha-fishing-v1')),
      )
    ).catches.length,
    1,
  )
  for (const [width, height] of [
    [620, 600],
    [360, 480],
    [360, 360],
  ]) {
    await page.setViewportSize({ width, height })
    const layout = await panel.evaluate((element) => ({
      overflow:
        element.scrollHeight > element.clientHeight + 1 ||
        element.scrollWidth > element.clientWidth + 1,
      rowHeights: [...element.querySelectorAll('.fishing-candidate')].map(
        (row) => row.getBoundingClientRect().height,
      ),
    }))
    assert.equal(
      layout.overflow,
      false,
      `${width}x${height}: no panel scrollbar`,
    )
    assert(
      layout.rowHeights.every((height) => height >= 16),
      `${width}x${height}: every fish has a readable row`,
    )
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    )
    await page.screenshot({
      path: `/tmp/matcha-fishing-${width}x${height}.png`,
    })
  }
  await page.getByRole('button', { name: '寻宝', exact: true }).click()
  await page.locator('.map-container').waitFor()
  assert.equal(await panel.count(), 0)
  await emit('TreasureSpot', { item: 2001087, location: 0, isNew: true })
  await page.locator('.map-container iframe').waitFor()
  await page.getByRole('button', { name: '钓鱼', exact: true }).click()
  await panel.waitFor()
  assert.equal(await page.locator('.map-container iframe').count(), 0)
  await emit('InitZone', {})
  await page.locator('.map-container').waitFor()
  await page.reload()
  await page.waitForFunction(() => typeof window._dev_mock === 'function')
  await emit('Fishing', {
    ...cast,
    castId: 'after-reload',
    time: Date.now(),
    castTime: Date.now(),
  })
  await panel.waitFor()
  assert.equal(
    (
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem('matcha-fishing-v1')),
      )
    ).catches.length,
    1,
  )
  assert.match(await panel.innerText(), /13.0–19.0 秒/)
  assert.match(await row.innerText(), /精准提勾/)
  await emit('Fishing', {
    ...cast,
    castId: 'another-place',
    placeId: 978,
    time: Date.now(),
    castTime: Date.now(),
  })
  await page.waitForTimeout(100)
  assert.match(await row.innerText(), /13.0–19.0 秒/)
  assert.match(await row.innerText(), /精准提勾/)
  await emit('Fishing', {
    ...cast,
    castId: 'unknown-bait',
    baitId: 999999,
    time: Date.now(),
    castTime: Date.now(),
  })
  await page.waitForTimeout(100)
  assert.equal(await row.locator('.fishing-window-all').count(), 1)
  assert.equal(await row.locator('.fishing-window-current').count(), 0)
  assert.match(await row.getAttribute('title'), /当前钓饵：时间未知/)
  assert.match(await row.innerText(), /精准提勾/)
  const cancelCast = {
    ...cast,
    castId: 'early-cancel',
    time: Date.now(),
    castTime: Date.now(),
  }
  await emit('Fishing', cancelCast)
  assert(Number(await timer.innerText()) < 1)
  const earlyHook = {
    ...cancelCast,
    action: 'hook',
    time: cancelCast.time + 2500,
    hookTime: cancelCast.castTime + 2500,
  }
  await emit('Fishing', earlyHook)
  assert.equal(await timer.innerText(), '2.5')
  for (const action of ['reel', 'end']) {
    await emit('Fishing', { ...earlyHook, action, time: earlyHook.time + 4000 })
    await page.waitForTimeout(200)
    assert.equal(
      await timer.innerText(),
      '2.5',
      'early cancellation stays frozen after reel completion',
    )
  }
  const noHookCast = {
    ...cancelCast,
    castId: 'no-hook-cancel',
    time: cancelCast.time + 10000,
    castTime: cancelCast.castTime + 10000,
  }
  await emit('Fishing', noHookCast)
  assert(Number(await timer.innerText()) < 1)
  await emit('Fishing', {
    ...noHookCast,
    action: 'reel',
    time: noHookCast.time + 1500,
  })
  assert.equal(await timer.innerText(), '1.5')
  await emit('Fishing', {
    ...noHookCast,
    action: 'end',
    time: noHookCast.time + 6000,
  })
  assert.equal(await timer.innerText(), '1.5')
  assert.equal(
    (
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem('matcha-fishing-v1')),
      )
    ).catches.length,
    1,
    'cancelled casts are not recorded as catches',
  )
  const chumCast = {
    ...cast,
    castId: 'chum-cast',
    chum: true,
    time: noHookCast.time + 10000,
    castTime: noHookCast.time + 10000,
  }
  await emit('Fishing', chumCast)
  assert.match(await row.innerText(), /6.5–9.5 秒/)
  assert.match(await row.getAttribute('title'), /所有钓饵：4.0–22.5 秒/)
  await importData({
    format: 'matcha-fishing-ranges',
    version: 1,
    fish: [{ fishId: 4891, tug: 2, snagging: true, hookset: 'precision' }],
    ranges: [],
  })
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem('matcha-fishing-v1')).fish[0].snagging ===
      true,
  )
  assert.match(await row.getAttribute('title'), /需要启用钓组/)
  await emit('Fishing', {
    ...chumCast,
    castId: 'snagging-cast',
    snagging: true,
    time: chumCast.time + 1000,
    castTime: chumCast.time + 1000,
  })
  assert.match(await row.getAttribute('class'), /fishing-match/)
  await importData({
    format: 'matcha-fishing-ranges',
    version: 1,
    ranges: [{ fishId: 4891, baitId: 4895, biteSeconds: [10, 20] }],
  })
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem('matcha-fishing-v1')).profiles.length ===
      3,
  )
  await emit('Fishing', {
    ...cast,
    castId: 'fish-bait-cast',
    baitId: 4895,
    mooch: null,
    snagging: true,
    time: chumCast.time + 2000,
    castTime: chumCast.time + 2000,
  })
  assert.match(await panel.locator('.fishing-bait').innerText(), /以小钓大/)
  assert.match(await row.innerText(), /10.0–20.0 秒/)
  assert.match(await row.innerText(), /精准提勾/)
  assert.equal(await row.locator('.fishing-tug').innerText(), '!!')
  assert.deepEqual(errors, [])
  console.log(
    'PASS: integrated fishing mode, XIVAPI candidates, frozen timer, import/export, persistence, compact rows, no scrollbars, treasure map and zone reset',
  )
} finally {
  await browser.close()
}
