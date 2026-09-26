import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const temp = mkdtempSync(join(tmpdir(), 'matcha-fishing-'))
try {
  const path = join(temp, 'model.mjs')
  await build({
    entryPoints: ['src/app/overlay/fishing/model.ts'],
    outfile: path,
    bundle: true,
    platform: 'node',
    format: 'esm',
  })
  const {
    predict,
    recordCatch,
    transition,
    emptyArchive,
    parseArchive,
    elapsed,
    catalog,
    mergeArchives,
  } = await import(pathToFileURL(path))
  const clockPath = join(temp, 'clock.mjs')
  await build({
    entryPoints: ['src/app/overlay/fishing/clock.ts'],
    outfile: clockPath,
    bundle: true,
    platform: 'node',
    format: 'esm',
  })
  const { updateClock, clockTime } = await import(pathToFileURL(clockPath))
  const importPath = join(temp, 'import.mjs')
  await build({
    entryPoints: ['src/app/overlay/fishing/import.ts'],
    outfile: importPath,
    bundle: true,
    platform: 'node',
    format: 'esm',
  })
  const { parseFishingImport } = await import(pathToFileURL(importPath))
  const cast = {
    action: 'cast',
    time: 175000 * 23,
    castTime: 175000 * 23,
    biteTime: null,
    hookTime: null,
    castId: 'one',
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
  const bite = {
    ...cast,
    action: 'bite',
    time: cast.time + 15000,
    biteTime: cast.time + 15000,
    tug: 2,
  }
  const caught = {
    ...bite,
    action: 'catch',
    time: bite.time + 10000,
    fishId: 4891,
  }
  const profile = {
    placeId: 425,
    fishId: 4891,
    baitId: 29717,
    chum: false,
    snagging: false,
    mooch: false,
    tug: 2,
    minMs: 14000,
    maxMs: 18000,
  }
  const range = {
    placeId: 425,
    fishId: 4891,
    baitId: 29717,
    biteSeconds: [14, 18],
    tug: 2,
  }
  const rangeFile = {
    format: 'matcha-fishing-ranges',
    version: 1,
    ranges: [range],
  }
  const parseRanges = (ranges) =>
    parseFishingImport(JSON.stringify({ ...rangeFile, ranges }))
  assert.deepEqual(parseRanges([range]), {
    version: 1,
    catches: [],
    profiles: [profile],
  })
  assert.deepEqual(parseRanges([]), emptyArchive())
  const decimal = parseRanges([{ ...range, biteSeconds: [14.1234, 18.9876] }])
  assert.equal(decimal.profiles[0].minMs, 14123)
  assert.equal(decimal.profiles[0].maxMs, 18988)
  const states = parseRanges([
    range,
    { ...range, chum: true, snagging: true, mooch: true, tug: undefined },
  ])
  assert.equal(states.profiles[1].tug, undefined)
  assert.equal(states.profiles[1].chum, true)
  assert.equal(states.profiles[1].snagging, true)
  assert.equal(states.profiles[1].mooch, true)
  assert.equal(
    predict({ ...cast, chum: true }, states, cast.time).find(
      (f) => f.fishId === 4891,
    ).minMs,
    undefined,
    'imported timing only applies to the specified state combination',
  )
  assert.throws(() => parseRanges([range, { ...range, chum: false }]), /重复/)
  for (const invalid of [
    null,
    [],
    { ...range, placeId: undefined },
    { ...range, fishId: '4891' },
    { ...range, baitId: 0 },
    { ...range, baitId: 1.5 },
    { ...range, biteSeconds: [18, 14] },
    { ...range, biteSeconds: [0, 18] },
    { ...range, biteSeconds: [-1, 18] },
    { ...range, biteSeconds: ['14', 18] },
    { ...range, biteSeconds: [14] },
    { ...range, biteSeconds: [14, 18, 20] },
    { ...range, biteSeconds: [0.00001, 18] },
    { ...range, biteSeconds: [14, 1e20] },
    { ...range, tug: 0 },
    { ...range, tug: null },
    { ...range, chum: null },
    { ...range, snagging: 'false' },
    { ...range, mooch: 0 },
    { ...range, minMs: 14000 },
  ])
    assert.throws(() => parseRanges([range, invalid]), /第 2 条区间/)
  assert.throws(() => parseRanges(Array(10001).fill(range)), /10000/)
  for (const invalid of [
    { ...rangeFile, format: 'unknown' },
    { ...rangeFile, version: 2 },
    { ...rangeFile, ranges: null },
    { ...rangeFile, unit: 'milliseconds' },
    { ...rangeFile, catches: [] },
    null,
  ])
    assert.throws(() => parseFishingImport(JSON.stringify(invalid)))
  assert.throws(() => parseFishingImport('{'), /有效的 JSON/)
  assert.deepEqual(
    parseFishingImport(
      JSON.stringify({ version: 1, catches: [caught], profiles: [profile] }),
    ),
    { version: 1, catches: [caught], profiles: [profile] },
    'existing backups remain importable',
  )
  const updated = mergeArchives(
    { version: 1, catches: [caught], profiles: [profile] },
    parseRanges([
      { ...range, biteSeconds: [12, 20] },
      { ...range, baitId: 2585 },
    ]),
  )
  assert.equal(updated.catches.length, 1)
  assert.equal(updated.profiles.length, 2)
  assert.equal(updated.profiles[0].minMs, 12000)
  assert.equal(updated.profiles[0].maxMs, 20000)
  assert.deepEqual(parseArchive(JSON.stringify(updated)), updated)
  let clock = updateClock(null, cast, 100)
  assert.equal(
    elapsed(cast, clockTime(clock, 100)),
    0,
    'new cast starts at zero without comparing different clocks',
  )
  assert.equal(elapsed(cast, clockTime(clock, 1100)), 1000)
  clock = updateClock(
    clock,
    { ...cast, action: 'place', time: cast.time + 200 },
    1200,
  )
  assert.equal(
    elapsed(cast, clockTime(clock, 1200)),
    1100,
    'place snapshot must not rebase the running clock',
  )
  const earlyHook = {
    ...cast,
    action: 'hook',
    time: cast.time + 2000,
    hookTime: cast.time + 2000,
  }
  clock = updateClock(clock, earlyHook, 2200)
  for (const action of ['reel', 'end']) {
    const stopped = { ...earlyHook, action, time: cast.time + 8000 }
    clock = updateClock(clock, stopped, 8300)
    assert.equal(
      elapsed(stopped, clockTime(clock, 20000)),
      2000,
      'reel and end cannot extend an early hook',
    )
  }
  const nextCast = {
    ...cast,
    castId: 'cancel-without-hook',
    time: cast.time + 10000,
    castTime: cast.time + 10000,
  }
  clock = updateClock(clock, nextCast, 21000)
  assert.equal(
    elapsed(nextCast, clockTime(clock, 21000)),
    0,
    'next cast resets a frozen clock',
  )
  const reel = { ...nextCast, action: 'reel', time: nextCast.time + 3000 }
  clock = updateClock(clock, reel, 24000)
  const end = { ...reel, action: 'end', time: reel.time + 4000 }
  clock = updateClock(clock, end, 28000)
  assert.equal(
    elapsed(end, clockTime(clock, 50000)),
    3000,
    'reel without a hook timestamp freezes at first stop',
  )
  const joined = { ...cast, action: 'place', time: cast.time + 10000 }
  clock = updateClock(null, joined, 100)
  assert.equal(
    elapsed(joined, clockTime(clock, 1100)),
    11000,
    'joining an active cast uses snapshot elapsed time',
  )
  clock = updateClock(clock, bite, 5100)
  clock = updateClock(clock, caught, 6100)
  assert.equal(
    elapsed(caught, clockTime(clock, 9000)),
    15000,
    'bite duration remains the captured packet duration',
  )
  assert.equal(updateClock(clock, null, 10000), null)
  assert.equal(
    catalog.places[425],
    '海雾村',
    'catalog is keyed by PlaceName, not FishingSpot row ID',
  )
  assert.equal(catalog.placefish[425].length, 9)
  assert.equal(catalog.tackle[29717], '万能拟饵')
  assert.equal(
    'tugs' in catalog,
    false,
    'client sheets cannot supply tug strength',
  )
  assert(predict(cast, emptyArchive(), cast.time).every((f) => f.tug === null))
  const imported = { version: 1, catches: [caught], profiles: [profile] }
  const merged = mergeArchives(imported, {
    ...imported,
    profiles: [{ ...profile, maxMs: 20000 }],
  })
  assert.equal(merged.catches.length, 1, 'reimport deduplicates catches')
  assert.equal(merged.profiles.length, 1)
  assert.equal(
    merged.profiles[0].maxMs,
    20000,
    'import replaces the same combination',
  )
  assert.equal(
    imported.profiles[0].maxMs,
    18000,
    'merge does not mutate saved data',
  )
  let archive = recordCatch(emptyArchive(), caught)
  assert.equal(archive.catches.length, 1)
  assert.equal(recordCatch(archive, caught), archive, 'duplicate catch ignored')
  assert.equal(
    recordCatch(archive, { ...caught, castId: 'other', biteTime: null }),
    archive,
    'missing bite not trained',
  )
  assert.equal(
    recordCatch(archive, {
      ...caught,
      castId: 'other',
      biteTime: cast.time - 1,
    }),
    archive,
  )
  assert.deepEqual(parseArchive(JSON.stringify(archive)), archive)
  assert.throws(() =>
    parseArchive('{"version":1,"catches":[],"profiles":[{}]}'),
  )
  assert.throws(() =>
    parseArchive(
      JSON.stringify({ ...archive, profiles: [{ ...profile, minMs: 18001 }] }),
    ),
  )
  assert.throws(() =>
    parseArchive(JSON.stringify({ ...archive, profiles: [profile, profile] })),
  )
  assert.equal(elapsed(bite, bite.time + 60000), 15000, 'bite freezes timer')
  assert.equal(transition(bite, cast), bite, 'old events do not regress timer')
  assert.equal(
    transition(bite, { ...cast, time: bite.time + 1 }),
    bite,
    'duplicate cast cannot restart timer',
  )
  assert.equal(
    transition(bite, { ...caught, castId: 'wrong' }),
    bite,
    'different cast cannot steal result',
  )
  assert.equal(transition(caught, { ...bite, time: caught.time + 1 }), caught)
  assert.equal(transition(bite, { ...bite, action: 'reset' }), null)
  const fish = (c, a = archive) =>
    predict(c, a, c.time).find((f) => f.fishId === 4891)
  const ranges = {
    version: 1,
    catches: [caught],
    profiles: [
      profile,
      { ...profile, baitId: 2585, minMs: 8000, maxMs: 45000 },
      { ...profile, placeId: 999999, minMs: 1000, maxMs: 90000 },
      { ...profile, fishId: 4895, minMs: 1000, maxMs: 80000 },
    ],
  }
  const currentRange = fish(bite, ranges)
  assert.deepEqual([currentRange.minMs, currentRange.maxMs], [14000, 18000])
  assert.deepEqual(
    [currentRange.allBaitsMinMs, currentRange.allBaitsMaxMs],
    [8000, 45000],
    'all-bait envelope stays within this fish and place',
  )
  const unknownBait = fish({ ...bite, baitId: 999999 }, ranges)
  assert.equal(
    unknownBait.minMs,
    undefined,
    'all-bait data does not substitute for current bait',
  )
  assert.deepEqual(
    [unknownBait.allBaitsMinMs, unknownBait.allBaitsMaxMs],
    [8000, 45000],
  )
  const otherState = fish({ ...bite, chum: true }, ranges)
  assert.equal(
    otherState.minMs,
    undefined,
    'current range still isolates fishing states',
  )
  assert.equal(otherState.allBaitsMaxMs, 45000)
  const observedRange = fish(bite, {
    version: 1,
    profiles: [],
    catches: [
      caught,
      {
        ...caught,
        baitId: 2585,
        biteTime: cast.time + 40000,
        time: cast.time + 41000,
      },
    ],
  })
  assert.deepEqual([observedRange.minMs, observedRange.maxMs], [15000, 15000])
  assert.deepEqual(
    [observedRange.allBaitsMinMs, observedRange.allBaitsMaxMs],
    [15000, 40000],
  )
  assert.equal(fish(bite, emptyArchive()).allBaitsMinMs, undefined)
  assert.equal(fish(bite).result, 'match')
  assert.equal(fish(bite).count, 1)
  for (const change of [
    { baitId: 1 },
    { chum: true },
    { snagging: true },
    { mooch: true },
    { chum: null },
  ])
    assert.equal(
      fish({ ...bite, ...change }).count,
      0,
      'different or unknown combo must not reuse timing',
    )
  assert.equal(fish({ ...bite, tug: 1 }).result, 'excluded')
  const late = { ...bite, biteTime: cast.time + 45000, time: cast.time + 45000 }
  assert.equal(
    fish(late).result,
    'outside',
    'sparse observed max is not a hard exclusion',
  )
  assert(
    predict(bite, emptyArchive(), bite.time).some(
      (f) => f.tug == null && f.result === 'unknown',
    ),
    'unknown tug stays visible',
  )
  archive = { ...archive, profiles: [profile] }
  assert.equal(fish(bite).source, 'manual')
  assert.equal(
    fish(bite, {
      ...archive,
      profiles: [{ ...profile, requiredStatuses: [568] }],
    }).result,
    'excluded',
  )
  assert.equal(
    fish(
      { ...bite, statuses: null },
      { ...archive, profiles: [{ ...profile, requiredStatuses: [568] }] },
    ).result,
    'unknown',
  )
  assert.equal(
    fish(bite, { ...archive, profiles: [{ ...profile, hours: [22, 2] }] })
      .result,
    'match',
    'cross-midnight window',
  )
  assert.equal(
    fish(bite, { ...archive, profiles: [{ ...profile, hours: [2, 4] }] })
      .result,
    'excluded',
  )
  assert.equal(
    fish(bite, { ...archive, profiles: [{ ...profile, weatherIds: [1] }] })
      .result,
    'unknown',
    'unknown weather is not assumed satisfied',
  )
  assert.equal(
    fish(bite, { ...archive, profiles: [{ ...profile, note: '需鱼识' }] })
      .result,
    'unknown',
  )
  assert.equal(
    predict({ ...cast, placeId: 999999 }, emptyArchive(), cast.time).length,
    0,
  )
  const contradictory = recordCatch(archive, {
    ...caught,
    castId: 'conflict',
    tug: 1,
  })
  assert.equal(
    fish(bite, { ...contradictory, profiles: [] }).tug,
    null,
    'contradictory observed tugs remain unknown',
  )
  if (process.argv[2]) {
    const events = readFileSync(process.argv[2], 'utf8')
      .trim()
      .split('\n')
      .map(JSON.parse)
    let current = null,
      records = emptyArchive()
    for (const e of events) {
      current = transition(current, e)
      if (current === e) records = recordCatch(records, e)
    }
    assert.equal(records.catches.length, 2)
    assert.deepEqual(
      records.catches.map((c) => c.fishId),
      [4891, 4895],
    )
    assert.equal(current.action, 'place')
    assert.equal(current.placeId, 425)
    assert.equal(
      predict(current, records, current.time).find((f) => f.fishId === 4895)
        .count,
      1,
    )
    assert.equal(
      predict(current, records, current.time).find((f) => f.fishId === 4891)
        .count,
      0,
      'capture begins without a status snapshot; do not treat unknown as false',
    )
    console.log(
      'PASS: production C# event stream -> frontend state -> persisted catches -> next cast predictions',
    )
  }
  console.log(
    'PASS: fishing timer, state transitions, deduplication, combo isolation, uncertainty, prerequisites, archive validation',
  )
} finally {
  rmSync(temp, { recursive: true, force: true })
}
