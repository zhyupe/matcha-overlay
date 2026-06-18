import { PlannerInput, PlannerOutput } from './interface'
import { getSubmarineScore } from './utils'

export function naivePlanner({
  spots,
  getTime,
  getDistance,
  rangeLimit,
  topK,
  maxVisits,
}: PlannerInput) {
  const routes: PlannerOutput[] = []
  let iterateCount = 0

  const find = (
    path: string[],
    fromSpot: string,
    usedRange = 0,
    totalTime = 0,
    totalExp = 0,
  ) => {
    let hasChild = false
    if (path.length < maxVisits) {
      for (const spot of Object.keys(spots)) {
        if (spot === '0' || path.includes(spot)) {
          continue
        }

        const expection = spots[spot]
        if (!expection) {
          continue
        }

        ++iterateCount

        const requiredRange = getDistance(fromSpot, spot)
        if (requiredRange + usedRange <= rangeLimit) {
          hasChild = true
          find(
            [...path, spot],
            spot,
            usedRange + requiredRange,
            totalTime + getTime(fromSpot, spot),
            totalExp + expection,
          )
        }
      }
    }

    if (!hasChild && path.length > 0) {
      routes.push({
        path,
        range: usedRange,
        time: totalTime,
        expectation: totalExp,
        score: getSubmarineScore(totalExp, totalTime),
      })
    }
  }

  find([], '0')

  console.log(`[naive] iterate ${iterateCount}, routes ${routes.length}`)

  routes.sort((a, b) => b.score - a.score)
  return routes.slice(0, topK)
}

export function dfsPlanner({
  spots,
  getTime,
  getDistance,
  rangeLimit,
  topK,
  maxVisits,
}: PlannerInput) {
  const routes: PlannerOutput[] = []
  function dfs(
    current: string,
    visited: Set<string>,
    path: string[],
    dist: number,
    t: number,
    exp: number,
  ) {
    if (path.length > 0) {
      // 记录当前路线
      if (t > 0) {
        routes.push({
          path: [...path],
          range: dist,
          time: t,
          expectation: exp,
          score: getSubmarineScore(exp, t),
        })
      }
    }

    // 深度限制
    if (path.length >= maxVisits) return

    // 尝试访问未访问的点
    for (const next of Object.keys(spots)) {
      if (visited.has(next)) continue

      const newDist = dist + getDistance(current, next)
      if (newDist > rangeLimit) continue // 超出最大距离则剪枝

      const newTime = t + getTime(current, next)
      const newExp = exp + spots[next]

      visited.add(next)
      dfs(next, visited, [...path, next], newDist, newTime, newExp)
      visited.delete(next)
    }
  }

  dfs('0', new Set<string>(), [], 0, 0, 0)

  // 按得分排序并取前 topK
  routes.sort((a, b) => b.score - a.score)
  return routes.slice(0, topK)
}

type NeighborRanking =
  | 'mixed'
  | 'densityTime'
  | 'densityDist'
  | 'exp'
  | 'distanceDesc'

/**
 * 启发式搜索求单位时间收益最高路线（适用于 N ≈ 30）
 */
export function findTopRoutesOptimized(
  input: PlannerInput,
  opts?: {
    beamWidth?: number
    neighborLimit?: number
    neighborRanking?: NeighborRanking
  },
): PlannerOutput[] {
  const {
    spots: rawSpots,
    getTime,
    getDistance,
    rangeLimit,
    topK,
    maxVisits,
  } = input

  // 不直接修改用户传入对象，复制一份
  const spots: Record<string, number> = { '0': 0, ...rawSpots }
  // 确保起点 "0" 存在
  if (!('0' in spots)) spots['0'] = 0

  const spotNames = Object.keys(spots)
  const N = spotNames.length

  const beamWidth = opts?.beamWidth ?? 200
  const neighborLimit = Math.min(
    opts?.neighborLimit ?? Math.max(12, Math.floor(N / 3)),
    Math.max(1, N - 1),
  )
  const neighborRanking: NeighborRanking = opts?.neighborRanking ?? 'mixed'

  // 生成每个点的邻居候选（基于可选策略）
  const neighbors: Record<string, string[]> = {}

  for (const a of spotNames) {
    // 候选集合（排除自身）
    const info = spotNames
      .filter((b) => b !== a)
      .map((b) => {
        const d = getDistance(a, b)
        const t = getTime(a, b)
        const exp = spots[b] ?? 0
        const densityTime = t > 0 ? exp / t : exp * 1e6
        const densityDist = d > 0 ? exp / d : exp * 1e6
        return { name: b, d, t, exp, densityTime, densityDist }
      })

    // 排序列表
    const byDensityTime = info
      .slice()
      .sort((x, y) => y.densityTime - x.densityTime)
      .map((x) => x.name)
    const byDensityDist = info
      .slice()
      .sort((x, y) => y.densityDist - x.densityDist)
      .map((x) => x.name)
    const byExp = info
      .slice()
      .sort((x, y) => y.exp - x.exp)
      .map((x) => x.name)
    const byDistanceDesc = info
      .slice()
      .sort((x, y) => y.d - x.d)
      .map((x) => x.name) // 远的优先

    let combined: string[] = []

    switch (neighborRanking) {
      case 'densityTime':
        combined = byDensityTime.slice(0, neighborLimit)
        break
      case 'densityDist':
        combined = byDensityDist.slice(0, neighborLimit)
        break
      case 'exp':
        combined = byExp.slice(0, neighborLimit)
        break
      case 'distanceDesc':
        combined = byDistanceDesc.slice(0, neighborLimit)
        break
      case 'mixed':
      default:
        // mixed: 先按密度，再按绝对收益，再按远距离补充（各取 neighborLimit 的一部分）
        const part = Math.max(1, Math.floor(neighborLimit / 3))
        const p1 = byDensityTime.slice(0, part)
        const p2 = byExp.slice(0, part)
        const p3 = byDistanceDesc.slice(
          0,
          neighborLimit - p1.length - p2.length,
        )
        combined = [...p1, ...p2, ...p3]
        break
    }

    // 去重并截断到 neighborLimit
    const seen = new Set<string>()
    const list: string[] = []
    for (const n of combined) {
      if (!seen.has(n)) {
        seen.add(n)
        list.push(n)
      }
      if (list.length >= neighborLimit) break
    }

    // 作为保险：如果列表太短，补充密度最高的直到满
    if (list.length < neighborLimit) {
      for (const n of byDensityTime) {
        if (!seen.has(n)) {
          seen.add(n)
          list.push(n)
        }
        if (list.length >= neighborLimit) break
      }
    }

    neighbors[a] = list
  }

  // Beam search 的状态类型
  interface State {
    path: string[] // 含起点 "0"
    range: number
    time: number
    expectation: number
    score: number
  }

  // 初始 frontier：从 "0" 出发
  let frontier: State[] = [
    { path: ['0'], range: 0, time: 0, expectation: spots['0'] ?? 0, score: 0 },
  ]
  let best: State[] = []

  for (let depth = 0; depth < maxVisits; depth++) {
    const newFrontier: State[] = []

    for (const state of frontier) {
      const last = state.path[state.path.length - 1]
      const candNeighbors = neighbors[last] ?? []

      for (const next of candNeighbors) {
        if (state.path.includes(next)) continue // 不重复访问

        const newRange = state.range + getDistance(last, next)
        if (newRange > rangeLimit) continue // 距离剪枝

        const newTime = state.time + getTime(last, next)
        if (newTime <= 0) continue // 不合理时间跳过

        const newExp = state.expectation + (spots[next] ?? 0)
        const newScore = getSubmarineScore(newExp, newTime)

        newFrontier.push({
          path: [...state.path, next],
          range: newRange,
          time: newTime,
          expectation: newExp,
          score: newScore,
        })
      }
    }

    if (newFrontier.length === 0) break

    // 保留得分最高的 beamWidth 条作为下一层 frontier
    newFrontier.sort((a, b) => b.score - a.score)
    frontier = newFrontier.slice(0, beamWidth)

    // 把有实际访问点（path length > 1）的路径加入 best 候选集
    for (const s of frontier) {
      if (s.path.length > 1) best.push(s)
    }

    // 剪掉 best，保持合理大小（节省内存）
    best.sort((a, b) => b.score - a.score)
    if (best.length > topK * 5) best = best.slice(0, topK * 5)
  }

  // 返回 topK
  best.sort((a, b) => b.score - a.score)
  const out = best.slice(0, topK).map((s) => ({
    path: s.path.slice(1),
    range: s.range,
    time: s.time,
    expectation: s.expectation,
    score: s.score,
  }))

  return out
}
