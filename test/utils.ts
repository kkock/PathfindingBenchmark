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
  [1, 1],
]
