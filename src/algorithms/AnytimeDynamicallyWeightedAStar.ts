import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { Graph, Vertex } from '../Graph'
import type { InstanceRegistry } from '../Registry'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { BinaryHeap } from '../ds/BinaryHeap'
import { reconstructPath } from '../services/misc'

/**
 * Anytime dynamically weighted A* implementation.
 * Note that it uses epsilon in a modified way, hence a low-quality epsilon
 * does not universally have the same effect as a low-quality heuristic.
 */
export const anytimeDynamicallyWeightedAStar: Algorithm = function * (
  graph: Graph,
  services: InstanceRegistry<SearchService>,
  source: Vertex,
  goal: Vertex,
  opts: { [key: string]: any } = {}
): Generator<AlgorithmResult, undefined, void> {
  const h = services.get(Heuristic)
  const g = services.get(Cost)
  const N = h.get(graph, source.x, source.y, goal.x, goal.y)
  const epsilon: number = opts['epsilon'] ?? 1
  const gScores = new Map<Vertex, number>()
  const dScores = new Map<Vertex, number>()

  const cameFrom = new Map<Vertex, Vertex>()
  const openSet = new BinaryHeap<Vertex>()
  openSet.insert(source, h.get(graph, source.x, source.y, goal.x, goal.y))
  gScores.set(source, 0)
  dScores.set(source, 0)

  let nodesGenerated = 1
  let nodesExpanded = 0

  while (openSet.size > 0) {
    const vertex = openSet.pop() as Vertex
    const currentCost = gScores.get(vertex) as number
    const currentDepth = dScores.get(vertex) as number
    nodesExpanded++

    if (vertex === goal) {
      yield {
        path: reconstructPath(cameFrom, goal),
        searchMetrics: { nodesExpanded, nodesGenerated }
      }
      return
    }

    for (const nextVertex of vertex.neighbors) {
      const tentativeCost = currentCost + g.get(graph, vertex.x, vertex.y, nextVertex.x, nextVertex.y)

      if (gScores.has(goal) && tentativeCost >= (gScores.get(goal) as number)) continue
      if (!gScores.has(nextVertex) || gScores.get(nextVertex) as number > tentativeCost) {
        const hScore = h.get(graph, nextVertex.x, nextVertex.y, goal.x, goal.y)
        const dScore = currentDepth + 1
        const wScore = dScore <= N ? 1 - dScore / N : 0
        const fScore = tentativeCost + hScore * (1 + epsilon * wScore)

        gScores.set(nextVertex, tentativeCost)
        dScores.set(nextVertex, dScore)
        cameFrom.set(nextVertex, vertex)
        openSet.insert(nextVertex, fScore)
        nodesGenerated++
      }
    }
  }
}

anytimeDynamicallyWeightedAStar.availableOpts = new Set(['epsilon'])
anytimeDynamicallyWeightedAStar.availableServices = new Set([Cost, Heuristic])
