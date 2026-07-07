import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { InstanceRegistry } from '../Registry'
import type { SearchDomain } from '../graph/Graph'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { KeyedBinaryHeap } from '../ds/KeyedBinaryHeap'
import { reconstructPath } from '../services/misc'

/**
 * Anytime dynamically weighted A* implementation.
 * Note that it uses epsilon in a modified way, hence a low-quality epsilon
 * does not universally have the same effect as a low-quality heuristic.
 */
export const anytimeDynamicallyWeightedAStar: Algorithm = function * <S> (
  graph: SearchDomain<S>,
  services: InstanceRegistry<SearchService<S>>,
  source: S,
  goal: S,
  opts: { [key: string]: any } = {}
): Generator<AlgorithmResult<S>, undefined, void> {
  const h = services.get(Heuristic)
  const g = services.get(Cost)
  const N = h.get(graph, source, goal)
  const epsilon: number = opts['epsilon'] ?? 1
  const gScores = new Map<S, number>()
  const dScores = new Map<S, number>()

  const cameFrom = new Map<S, S>()
  const openSet = new KeyedBinaryHeap<S>()
  openSet.insert(source, h.get(graph, source, goal))
  gScores.set(source, 0)
  dScores.set(source, 0)

  let nodesGenerated = 1
  let nodesExpanded = 0

  while (openSet.size > 0) {
    const vertex = openSet.pop() as S
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

    for (const nextVertex of graph.successors(vertex)) {
      const tentativeCost = currentCost + g.get(graph, vertex, nextVertex)

      if (gScores.has(goal) && tentativeCost >= (gScores.get(goal) as number)) continue
      if (!gScores.has(nextVertex) || gScores.get(nextVertex) as number > tentativeCost) {
        const hScore = h.get(graph, nextVertex, goal)
        const dScore = currentDepth + 1
        const wScore = dScore <= N ? 1 - dScore / N : 0
        const fScore = tentativeCost + hScore * (1 + epsilon * wScore)

        gScores.set(nextVertex, tentativeCost)
        dScores.set(nextVertex, dScore)
        cameFrom.set(nextVertex, vertex)
        openSet.insertOrUpdate(nextVertex, fScore)
        nodesGenerated++
      }
    }
  }
}

anytimeDynamicallyWeightedAStar.availableOpts = new Set(['epsilon'])
anytimeDynamicallyWeightedAStar.availableServices = new Set([Cost, Heuristic])
