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
    isMoochBait,
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
    fishId: 4891,
    baitId: 29717,
    minMs: 14000,
    maxMs: 18000,
  }
  const range = {
    fishId: 4891,
    baitId: 29717,
    biteSeconds: [14, 18],
  }
  const rangeFile = {
    format: 'matcha-fishing-ranges',
    version: 1,
    fish: [],
    ranges: [range],
  }
  const parseRanges = (ranges, fish = []) =>
    parseFishingImport(JSON.stringify({ ...rangeFile, ranges, fish }))
  assert.deepEqual(parseRanges([range]), {
    version: 1,
    fish: [],
    catches: [],
    profiles: [profile],
  })
  assert.deepEqual(parseRanges([]), emptyArchive())
  assert.deepEqual(
    parseFishingImport(JSON.stringify({ ...rangeFile, fish: undefined })),
    parseRanges([range]),
  )
  const fishInfo = { fishId: 4891, tug: 2, snagging: true }
  const fishData = parseRanges([range], [fishInfo])
  const candidate = (event, data = fishData) =>
    predict(event, data, event.time).find((f) => f.fishId === 4891)
  assert.deepEqual(fishData.fish, [fishInfo])
  assert.equal(candidate(bite).result, 'excluded')
  assert.equal(candidate(bite).reason, '需要启用钓组')
  assert.equal(candidate({ ...bite, snagging: true }).result, 'match')
  assert.equal(candidate({ ...bite, snagging: null }).result, 'unknown')
  assert.equal(candidate({ ...bite, baitId: 2585 }).tug, 2)
  assert.equal(candidate({ ...bite, baitId: null }).result, 'excluded')
  assert.equal(candidate({ ...bite, baitId: 2585 }).reason, '需要启用钓组')
  const optionalSnagging = parseRanges(
    [range],
    [{ ...fishInfo, snagging: false }],
  )
  assert.equal(
    candidate({ ...bite, snagging: true }, optionalSnagging).result,
    'match',
  )
  assert.deepEqual(parseFishingImport(JSON.stringify(fishData)), fishData)
  assert.deepEqual(mergeArchives(fishData, parseRanges([])).fish, [fishInfo])
  assert.deepEqual(
    mergeArchives(fishData, parseRanges([], [{ fishId: 4891 }])).fish,
    [{ fishId: 4891 }],
  )
  assert.deepEqual(mergeArchives(fishData, fishData), fishData)
  for (const invalid of [
    null,
    {},
    1,
    [],
    { fishId: '4891' },
    { fishId: 0 },
    { fishId: 4891, tug: 0 },
    { fishId: 4891, tug: null },
    { fishId: 4891, tug: '2' },
    { fishId: 4891, snagging: null },
    { fishId: 4891, snagging: 'true' },
    { fishId: 4891, baitId: 29717 },
    { fishId: 4891, chum: false },
    { fishId: 4891, mooch: false },
    ...[null, 0, 1, true, '', 'Precision', 'unknown'].map((hookset) => ({
      fishId: 4891,
      hookset,
    })),
  ])
    assert.throws(() => parseRanges([], [invalid]), /第 1 条鱼种/)
  assert.throws(() => parseRanges([], [fishInfo, fishInfo]), /重复/)
  assert.throws(() => parseRanges([], null), /fish 必须是数组/)
  assert.throws(() => parseRanges([], Array(10001).fill(fishInfo)), /10000/)
  const baseData = parseRanges([range])
  const chumBite = {
    ...bite,
    chum: true,
    biteTime: cast.time + 7500,
    time: cast.time + 7500,
  }
  assert.equal(candidate(chumBite, baseData).minMs, 7000)
  assert.equal(candidate(chumBite, baseData).maxMs, 9000)
  assert.equal(candidate(chumBite, baseData).result, 'match')
  assert.equal(candidate({ ...bite, chum: null }, baseData).minMs, undefined)
  assert.equal(
    candidate({ ...bite, chum: null }, baseData).allBaitsMaxMs,
    undefined,
  )
  assert.equal(
    candidate({ ...bite, chum: null }, baseData).reason,
    '撒饵状态未知',
  )
  const normalizedSamples = {
    ...emptyArchive(),
    catches: [
      caught,
      { ...caught, ...chumBite, action: 'catch', fishId: 4891, castId: 'chum' },
      {
        ...caught,
        chum: null,
        castId: 'unknown-chum',
        biteTime: cast.time + 90000,
        time: cast.time + 91000,
      },
    ],
  }
  assert.equal(candidate(bite, normalizedSamples).count, 2)
  assert.equal(candidate(bite, normalizedSamples).maxMs, 15000)
  assert.equal(candidate(bite, normalizedSamples).allBaitsMaxMs, 15000)
  assert.equal(candidate(chumBite, normalizedSamples).minMs, 7500)
  assert.equal(candidate(chumBite, normalizedSamples).allBaitsMaxMs, 7500)
  for (const change of [
    { snagging: true },
    { snagging: null },
    { mooch: true },
    { mooch: null },
  ])
    assert.equal(candidate({ ...bite, ...change }, normalizedSamples).count, 2)
  assert.equal(isMoochBait(4891, emptyArchive()), true)
  assert.equal(isMoochBait(29717, emptyArchive()), false)
  assert.equal(isMoochBait(null, emptyArchive()), false)
  assert.equal(isMoochBait(999999, parseRanges([], [{ fishId: 999999 }])), true)
  const moochData = parseRanges([{ ...range, baitId: 4895 }])
  assert.equal(
    candidate({ ...bite, baitId: 4895, mooch: null }, moochData).minMs,
    14000,
  )
  const decimal = parseRanges([{ ...range, biteSeconds: [14.1234, 18.9876] }])
  assert.equal(decimal.profiles[0].minMs, 14123)
  assert.equal(decimal.profiles[0].maxMs, 18988)
  assert.throws(() => parseRanges([range, range]), /重复/)
  for (const invalid of [
    null,
    [],
    { ...range, placeId: 425 },
    { ...range, fishId: undefined },
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
    { ...range, tug: 2 },
    { ...range, tug: 0 },
    { ...range, tug: null },
    ...[null, 0, 1, true, '', 'Precision', 'unknown'].map((hookset) => ({
      ...range,
      hookset,
    })),
    { ...range, chum: false },
    { ...range, chum: true },
    { ...range, chum: null },
    { ...range, snagging: false },
    { ...range, mooch: true },
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
      JSON.stringify({
        version: 1,
        fish: [],
        catches: [caught],
        profiles: [profile],
      }),
    ),
    { version: 1, fish: [], catches: [caught], profiles: [profile] },
    'existing backups remain importable',
  )
  const updated = mergeArchives(
    { version: 1, fish: [], catches: [caught], profiles: [profile] },
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
  for (const hookset of ['precision', 'powerful']) {
    const imported = parseRanges([range], [{ fishId: 4891, tug: 2, hookset }])
    assert.equal(imported.fish[0].hookset, hookset)
    assert.equal(
      predict(bite, imported, bite.time).find((f) => f.fishId === 4891).hookset,
      hookset,
      'hookset is independent of tug strength',
    )
    assert.deepEqual(parseFishingImport(JSON.stringify(imported)), imported)
    assert.deepEqual(
      mergeArchives(imported, parseRanges([range])).fish,
      imported.fish,
    )
    for (const baitId of [2585, null])
      assert.equal(candidate({ ...bite, baitId }, imported).hookset, hookset)
    const replaced = mergeArchives(
      imported,
      parseRanges([], [{ fishId: 4891, tug: 2 }]),
    )
    assert.equal(replaced.fish[0].hookset, undefined)
    assert.equal(
      predict(bite, replaced, bite.time).find((f) => f.fishId === 4891).hookset,
      undefined,
      'omitted hookset is not inferred from tug',
    )
  }
  assert.throws(
    () => parseRanges([range, { ...range, hookset: 'precision' }]),
    /不支持字段 hookset/,
  )
  for (const hookset of [null, 1, 'unknown'])
    assert.throws(
      () =>
        parseArchive(
          JSON.stringify({
            version: 1,
            fish: [],
            catches: [],
            profiles: [{ ...profile, hookset }],
          }),
        ),
      /提勾类型/,
    )
  const legacyProfile = {
    ...profile,
    placeId: 425,
    chum: false,
    snagging: false,
    mooch: false,
    tug: 2,
  }
  const legacyHookset = parseArchive(
    JSON.stringify({
      version: 1,
      catches: [],
      profiles: [
        { ...legacyProfile, hookset: 'precision' },
        { ...profile, baitId: 2585, tug: 3 },
      ],
    }),
  )
  assert.deepEqual(legacyHookset.fish, [
    { fishId: 4891, tug: 3, hookset: 'precision' },
  ])
  assert.equal(legacyHookset.profiles[0].hookset, undefined)
  assert.deepEqual(parseArchive(JSON.stringify(legacyHookset)), legacyHookset)
  const legacyBackup = {
    version: 1,
    catches: [caught],
    profiles: [legacyProfile, { ...legacyProfile, placeId: 978, maxMs: 21000 }],
  }
  const migrated = parseFishingImport(JSON.stringify(legacyBackup))
  const oldChumData = parseArchive(
    JSON.stringify({
      ...legacyBackup,
      profiles: [{ ...legacyProfile, chum: true, minMs: 7000, maxMs: 9000 }],
    }),
  )
  assert.deepEqual(oldChumData.profiles, [profile])
  assert.deepEqual(oldChumData.fish, [{ fishId: 4891, tug: 2 }])
  const explicitFish = parseArchive(
    JSON.stringify({ ...legacyBackup, fish: [fishInfo] }),
  )
  assert.deepEqual(explicitFish.fish, [fishInfo])
  assert.deepEqual(migrated, {
    version: 1,
    catches: [caught],
    profiles: [{ ...profile, maxMs: 21000 }],
    fish: [{ fishId: 4891, tug: 2 }],
  })
  assert.deepEqual(parseArchive(JSON.stringify(migrated)), migrated)
  assert.throws(
    () =>
      parseArchive(
        JSON.stringify({
          ...legacyBackup,
          profiles: [legacyProfile, legacyProfile],
        }),
      ),
    /重复/,
  )
  assert.deepEqual(
    mergeArchives(migrated, parseRanges([range])).profiles,
    [profile],
    'global imports replace migrated legacy combinations',
  )
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
  const imported = {
    version: 1,
    fish: [],
    catches: [caught],
    profiles: [profile],
  }
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
  const otherPlace = { ...bite, placeId: 978 }
  assert(catalog.placefish[978].includes(4891))
  assert.deepEqual(
    fish(otherPlace, parseRanges([range])),
    fish(bite, parseRanges([range])),
  )
  assert.deepEqual(
    fish(otherPlace),
    fish(bite),
    'observations are shared across places',
  )
  assert.equal(fish(otherPlace, migrated).maxMs, 21000)
  const foreignFish = parseRanges([{ ...range, fishId: 999999 }])
  assert(
    !predict(bite, foreignFish, bite.time).some((f) => f.fishId === 999999),
  )
  assert.equal(
    predict({ ...bite, placeId: 999999 }, parseRanges([range]), bite.time)
      .length,
    0,
  )
  assert.equal(
    predict({ ...bite, placeId: null }, parseRanges([range]), bite.time).length,
    0,
  )
  const observedElsewhere = {
    version: 1,
    fish: [],
    profiles: [],
    catches: [
      caught,
      {
        ...caught,
        castId: 'another-place',
        placeId: 978,
        biteTime: cast.time + 20000,
        time: cast.time + 21000,
      },
    ],
  }
  assert.equal(fish(bite, observedElsewhere).count, 2)
  assert.equal(fish(bite, observedElsewhere).maxMs, 20000)
  assert.deepEqual(
    fish(bite, observedElsewhere),
    fish(otherPlace, observedElsewhere),
  )
  const ranges = {
    version: 1,
    fish: [],
    catches: [caught],
    profiles: [
      profile,
      { ...profile, baitId: 2585, minMs: 8000, maxMs: 45000 },
      { ...profile, fishId: 4895, minMs: 1000, maxMs: 80000 },
    ],
  }
  const currentRange = fish(bite, ranges)
  assert.deepEqual([currentRange.minMs, currentRange.maxMs], [14000, 18000])
  assert.deepEqual(
    [currentRange.allBaitsMinMs, currentRange.allBaitsMaxMs],
    [8000, 45000],
    'all-bait envelope stays within this fish',
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
  assert.equal(otherState.minMs, 7000, 'chum scales the current bait range')
  assert.equal(otherState.allBaitsMaxMs, 22500)
  const observedRange = fish(bite, {
    version: 1,
    fish: [],
    profiles: [],
    catches: [
      caught,
      {
        ...caught,
        placeId: 978,
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
  for (const change of [{ baitId: 1 }, { baitId: null }])
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
