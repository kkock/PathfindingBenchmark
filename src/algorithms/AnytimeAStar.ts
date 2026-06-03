import type { Algorithm, SearchService } from '../Algorithm'
import type { Graph, Vertex } from '../Graph'
import type { InstanceRegistry } from '../Registry'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { BinaryHeap } from '../ds/BinaryHeap'
import { reconstructPath } from '../services/misc'

/**
 * A* implementation that yields each newly found best route as it occurs.
 * This makes it robust when given a heuristic that isn't consistent and/or
 * admissible.
 */
export const anytimeAStar: Algorithm = function * (
  graph: Graph,
  services: InstanceRegistry<SearchService>,
  source: Vertex,
  goal: Vertex,
  opts: { [key: string]: any } = {}
): Generator<Vertex[], undefined, void> {
  const h = services.get(Heuristic)
  const g = services.get(Cost)
  const gScores = new Map<Vertex, number>()
  const epsilon: number = opts['epsilon'] ?? 1

  const cameFrom = new Map<Vertex, Vertex>()
  const openSet = new BinaryHeap<Vertex>()
  openSet.insert(source, epsilon * h.get(graph, source.x, source.y, goal.x, goal.y))
  gScores.set(source, 0)

  while (openSet.size > 0) {
    const vertex = openSet.pop() as Vertex
    const currentCost = gScores.get(vertex) as number

    if (vertex === goal) {
      yield reconstructPath(cameFrom, goal)
    } else {
      for (const nextVertex of vertex.neighbors) {
        const tentativeCost = currentCost + g.get(graph, vertex.x, vertex.y, nextVertex.x, nextVertex.y)
        if (!gScores.has(nextVertex) || gScores.get(nextVertex) as number > tentativeCost) {
          gScores.set(nextVertex, tentativeCost)
          cameFrom.set(nextVertex, vertex)
          openSet.insert(nextVertex, tentativeCost + epsilon * h.get(graph, nextVertex.x, nextVertex.y, goal.x, goal.y))
        }
      }
    }
  }
}

anytimeAStar.availableOpts = new Set(['epsilon'])
