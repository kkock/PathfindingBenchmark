export function strTo2DArr (str: string): string[][] {
  return str.trim().split('\n').map(str => str.trim().split(''))
}

export const diagonalNeighborPolicy: Array<[number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
]

export function getSeededPrng (seed = 0x12345678): () => number {
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0
    return seed / 0x100000000
  }
}
