import assert from 'node:assert/strict'

// Artificial events only; item IDs below are public catalog entries.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox'],
})
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 720 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(process.env.SUBMARINE_PREVIEW_URL || 'http://127.0.0.1:5178/')
  await page.waitForFunction(() => typeof window._dev_mock === 'function')
  const emit = (type, content) =>
    page.evaluate(
      ({ type, content }) => {
        window._dev_mock(
          `00|${new Date().toISOString()}|0|Matcha#test#chs-${type}|${JSON.stringify(content)}`,
        )
      },
      { type, content },
    )
  const parts = [
    { itemId: 21794, condition: 0 },
    { itemId: 21795, condition: 15000 },
    { itemId: 21792, condition: 30000 },
    null,
  ]
  // Inventory snapshots arrive before the status list in normal workshop entry.
  await emit('SubmarineParts', { reset: false, index: 0, parts })
  const status = {
    index: 0,
    name: '测试潜艇',
    rank: 1,
    status: 1,
    returnTime: 0,
    hull: 3,
    stern: 4,
    bow: 1,
    bridge: 2,
    destination: [],
  }
  await emit('SubmarineStatus', status)
  await page.getByText('已损坏', { exact: true }).waitFor()
  await page.getByText('50%', { exact: true }).waitFor()
  await page.getByText('100%', { exact: true }).waitFor()
  await page.getByText('耐久未知', { exact: true }).waitFor()
  assert.match(
    await page
      .getByText('已损坏', { exact: true })
      .locator('..')
      .getAttribute('class'),
    /text-red-200/,
  )
  await emit('SubmarineParts', {
    reset: false,
    index: 0,
    parts: [{ itemId: 21794, condition: 30000 }, ...parts.slice(1)],
  })
  await page.waitForFunction(() => !document.body.innerText.includes('已损坏'))
  assert.equal(await page.getByText('100%', { exact: true }).count(), 2)
  // Changing to another catalog item invalidates a cached condition.
  await emit('SubmarineStatus', { ...status, hull: 7 })
  await page.waitForFunction(
    () => document.body.innerText.split('耐久未知').length === 3,
  )
  await emit('SubmarineParts', { reset: true, index: -1, parts: [] })
  await page.getByText('请到部队工房管理潜水艇', { exact: true }).waitFor()
  await emit('SubmarineStatus', status)
  await page.waitForFunction(
    () => document.body.innerText.split('耐久未知').length === 5,
  )
  assert.deepEqual(errors, [])
  console.log('Synthetic submarine browser checks passed.')
} finally {
  await browser.close()
}
