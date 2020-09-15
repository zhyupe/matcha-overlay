export const candidates = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export function solve(input: number[]) {
  // calculate possibilites
  const pendingNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((a) => !input.includes(a))

  if (pendingNumbers.length > 5) {
    throw new Error('请填写 4 个数字')
  }

  const posibilities = permutator(pendingNumbers).map((perm) => {
    let cursor = 0
    return input.map((val) => (val === 0 ? perm[cursor++] : val))
  })

  // calculate payouts
  // for each possibility, get each line of payouts
  return candidates.map((keys) => {
    const sum = posibilities.reduce((sum, p) => sum + getPayout(p, keys), 0)
    return Math.floor(sum / posibilities.length)
  })
}

function permutator(inputArr: number[]) {
  const results: number[][] = []

  function permute(arr: number[], memo: number[] = []) {
    for (let i = 0; i < arr.length; i++) {
      const cur = arr.splice(i, 1)
      if (arr.length === 0) {
        results.push(memo.concat(cur))
      }
      permute(arr.slice(), memo.concat(cur))
      arr.splice(i, 0, cur[0])
    }

    return results
  }

  return permute(inputArr)
}

const payouts = [
  0,
  0,
  0,
  0,
  0,
  0,
  10000,
  36,
  720,
  360,
  80,
  252,
  108,
  72,
  54,
  180,
  72,
  180,
  119,
  36,
  306,
  1080,
  144,
  1800,
  3600,
]

function getPayout(p: number[], keys: number[]) {
  const value = keys.reduce((sum, i) => sum + p[i], 0)
  return payouts[value]
}
