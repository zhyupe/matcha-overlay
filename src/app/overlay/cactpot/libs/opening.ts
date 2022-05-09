const openings = [
  [
    [3, 2, 6],
    [7, 4],
    [9, 2, 4, 6],
  ],
  [
    [3, 4],
    [4, 6, 8],
    [5, 4, 6, 8],
    [7, 4],
    [9, 0, 2],
  ],
  [
    [3, 0, 8],
    [7, 4],
    [9, 0, 4, 8],
  ],
  [
    [3, 4],
    [4, 2, 8],
    [5, 2, 4, 8],
    [7, 4],
    [9, 0, 6],
  ],
  [[9, 0, 2, 6, 8]],
]

export const suggestOpening = (index: number, value: number): number[] => {
  if (index > 4) return suggestOpening(8 - index, value).map((i) => 8 - i)

  for (const [max, ...res] of openings[index]) {
    if (value <= max) return res
  }

  return []
}
