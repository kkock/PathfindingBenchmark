import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { InstanceRegistry } from '../Registry'
import type { SearchDomain } from '../graph/Graph'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { reconstructPath } from '../services/misc'
import { KeyedIntervalHeap } from '../ds/KeyedIntervalHeap'

/**
 * Global beam search
 */
export const beamAStar: Algorithm = function * <S> (
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
  const beamSize: number = opts['beamSize'] ?? 10

  const cameFrom = new Map<S, S>()
  const openSet = new KeyedIntervalHeap<S>()
  openSet.insert(source, epsilon * h.get(graph, source, goal))
  gScores.set(source, 0)

  let nodesGenerated = 1
  let nodesExpanded = 0

  while (openSet.size > 0) {
    const vertex = openSet.min() as S
    openSet.deleteMin()
    const currentCost = gScores.get(vertex) as number
    nodesExpanded++

    if (vertex === goal) {
      yield {
        path: reconstructPath(cameFrom, goal),
        searchMetrics: { nodesExpanded, nodesGenerated }
      }
      return
    } else {
      for (const nextVertex of graph.successors(vertex)) {
        const tentativeCost = currentCost + g.get(graph, vertex, nextVertex)

        if (gScores.has(goal) && tentativeCost >= (gScores.get(goal) as number)) continue
        if (!gScores.has(nextVertex) || gScores.get(nextVertex) as number > tentativeCost) {
          gScores.set(nextVertex, tentativeCost)
          cameFrom.set(nextVertex, vertex)
          openSet.insertOrUpdate(nextVertex, tentativeCost + epsilon * h.get(graph, nextVertex, goal))
          nodesGenerated++

          if (openSet.size > beamSize) openSet.deleteMax()
        }
      }
    }
  }
}

beamAStar.availableOpts = new Set(['epsilon', 'beamSize'])
beamAStar.availableServices = new Set([Cost, Heuristic])
