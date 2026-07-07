export function euclideanDistance ([x1, y1]: [number, number], [x2, y2]: [number, number]): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
}

export function reconstructPath<S> (cameFrom: Map<S, S>, goal: S): S[] {
  const path = [goal]
  let node = goal
  while (cameFrom.has(node)) {
    node = cameFrom.get(node) as S
    path.unshift(node)
  }
  return path
}

export function manhattanDistance ([x1, y1]: [number, number], [x2, y2]: [number, number]): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2)
}

export function chebyshevDistance ([x1, y1]: [number, number], [x2, y2]: [number, number]): number {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2))
}

export function countSetBits (x: number): number {
  x >>>= 0
  let count = 0
  while (x !== 0) {
    x &= x - 1
    count++
  }
  return count
}