import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { InstanceRegistry } from '../Registry'
import type { SearchDomain } from '../graph/Graph'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { KeyedBinaryHeap } from '../ds/KeyedBinaryHeap'
import { reconstructPath } from '../services/misc'

/**
 * A* implementation that yields each newly found best route as it occurs.
 * This makes it robust when given a heuristic that isn't consistent and/or
 * admissible.
 */
export const anytimeAStar: Algorithm = function * <S> (
  graph: SearchDomain<S>,
  services: InstanceRegistry<SearchService<S>>,
  source: S,
  goal: S,
  opts: { [key: string]: any } = {}
): Generator<AlgorithmResult<S>, undefined, void> {
  const h = services.get(Heuristic)
  const g = services.get(Cost)
  const gScores = new Map<S, number>()
  const epsilon: number = opts['epsilon'] ?? 1

  const cameFrom = new Map<S, S>()
  const openSet = new KeyedBinaryHeap<S>()
  openSet.insert(source, epsilon * h.get(graph, source, goal))
  gScores.set(source, 0)

  let nodesGenerated = 1
  let nodesExpanded = 0

  while (openSet.size > 0) {
    const vertex = openSet.pop() as S
    const currentCost = gScores.get(vertex) as number
    nodesExpanded++

    if (vertex === goal) {
      yield {
        path: reconstructPath(cameFrom, goal),
        searchMetrics: { nodesExpanded, nodesGenerated }
      }
    } else {
      for (const nextVertex of graph.successors(vertex)) {
        const tentativeCost = currentCost + g.get(graph, vertex, nextVertex)
        if (gScores.has(goal) && tentativeCost >= (gScores.get(goal) as number)) continue
        if (!gScores.has(nextVertex) || gScores.get(nextVertex) as number > tentativeCost) {
          gScores.set(nextVertex, tentativeCost)
          cameFrom.set(nextVertex, vertex)
          openSet.insertOrUpdate(nextVertex, tentativeCost + epsilon * h.get(graph, nextVertex, goal))
          nodesGenerated++
        }
      }
    }
  }
}

anytimeAStar.availableOpts = new Set(['epsilon'])
anytimeAStar.availableServices = new Set([Cost, Heuristic])
