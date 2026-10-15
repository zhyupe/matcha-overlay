import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const folder = mkdtempSync(join(tmpdir(), 'matcha-statistics-'))
try {
  const file = join(folder, 'model.mjs')
  await build({
    entryPoints: ['src/app/overlay/fishing/model.ts'],
    outfile: file,
    bundle: true,
    platform: 'node',
    format: 'esm',
  })
  const { predict, emptyArchive, parseArchive, recordCatch } = await import(
    pathToFileURL(file).href
  )
  const cast = {
    action: 'cast',
    time: 10000,
    castId: 'synthetic',
    castTime: 10000,
    biteTime: null,
    hookTime: null,
    baitId: 10,
    baseBaitId: 10,
    placeId: 20,
    tug: null,
    fishId: null,
    mooch: false,
    chum: true,
    snagging: false,
    statuses: [],
  }
  const online = {
    version: 1,
    enabled: true,
    session: 'service',
    revision: 1,
    cast,
    state: 'ready',
    cachedAt: 10000,
    distributions: [
      {
        fish_id: 30,
        bait_id: 10,
        is_chum: true,
        tug_type: 1,
        count: 40,
        range: {
          min: 5000,
          max: 10000,
          effective_min: 6000,
          effective_max: 9000,
        },
        percentiles: { p50: 7500 },
      },
    ],
  }
  let row = predict(cast, emptyArchive(), 16000, 1500, undefined, online)[0]
  assert.equal(row.source, 'community')
  assert.equal(row.minMs, 6000)
  assert.equal(row.maxMs, 9000)
  assert.equal(row.count, 40)
  assert.equal(row.medianMs, 7500)
  const noChum = { ...online, distributions: online.distributions.map(d => ({ ...d, is_chum: false })) }
  row = predict(cast, emptyArchive(), 16000, 1500, undefined, noChum)[0]
  assert.equal(row.source, 'community')
  assert.equal(row.minMs, 3000); assert.equal(row.maxMs, 4500)
  assert.equal(row.medianMs, 3750); assert.equal(row.sampleMinMs, 2500); assert.equal(row.sampleMaxMs, 5000)
  assert.equal(row.count, 40); assert.match(row.note, /50%/)
  row = predict(cast, emptyArchive(), 16000, 1500, undefined,
    { ...online, distributions: [...noChum.distributions, ...online.distributions] })[0]
  assert.equal(row.minMs, 6000); assert.equal(row.maxMs, 9000) // exact state wins, no double scaling
  const unknownCast = { ...cast, chum: null }
  row = predict(unknownCast, emptyArchive(), 16000, 1500, undefined, { ...noChum, cast: unknownCast })[0]
  assert.equal(row.minMs, 6000); assert.equal(row.result, 'unknown')
  const archive = emptyArchive()
  archive.profiles.push({ fishId: 30, baitId: 10, minMs: 8000, maxMs: 12000 })
  row = predict(cast, archive, 16000, 1500, undefined, online)[0]
  assert.equal(row.source, 'manual')
  assert.equal(row.minMs, 4000)
  assert.equal(row.count, 0)
  assert.equal(
    predict(
      { ...cast, placeId: 21 },
      emptyArchive(),
      16000,
      1500,
      undefined,
      online,
    ).length,
    0,
  )
  assert.equal(
    predict(cast, emptyArchive(), 16000, 1500, undefined, {
      ...online,
      enabled: false,
    }).length,
    0,
  )
  row = predict(cast, emptyArchive(), 16000, 1500, undefined, {
    ...online,
    state: 'stale',
  })[0]
  assert.equal(row.minMs, 6000)
  const caught = {
    ...cast,
    action: 'catch',
    fishId: 30,
    tug: 1,
    time: 17000,
    biteTime: 16000,
    actorId: 42,
    unexpected: 'discard',
  }
  const saved = recordCatch(emptyArchive(), caught)
  assert.equal('actorId' in saved.catches[0], false)
  assert.equal('unexpected' in saved.catches[0], false)
  const legacy = parseArchive(
    JSON.stringify({ ...emptyArchive(), catches: [caught] }),
  )
  assert.equal('actorId' in legacy.catches[0], false)
  assert.equal('unexpected' in legacy.catches[0], false)
  assert.equal(
    'actorId' in parseArchive(JSON.stringify(legacy)).catches[0],
    false,
  )
  console.log(
    'PASS: online ranges, source precedence, stale fallback, exact chum times, privacy migration',
  )
} finally {
  rmSync(folder, { recursive: true, force: true })
}
