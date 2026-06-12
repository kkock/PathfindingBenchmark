import type { Vertex } from '../Graph'

export function euclideanDistance (x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
}

export function reconstructPath (cameFrom: Map<Vertex, Vertex>, goal: Vertex): Vertex[] {
  const path = [goal]
  let node = goal
  while (cameFrom.has(node)) {
    node = cameFrom.get(node) as Vertex
    path.unshift(node)
  }
  return path
}

export function manhattanDistance (x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2)
}

export function chebyshevDistance (x1: number, y1: number, x2: number, y2: number): number {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2))
}