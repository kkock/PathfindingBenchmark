import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { InstanceRegistry } from '../Registry'
import type { SearchDomain } from '../graph/Graph'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { KeyedBinaryHeap } from '../ds/KeyedBinaryHeap'
import { reconstructPath } from '../services/misc'

export const anytimeNonparametricAStar: Algorithm = function * <S> (
  graph: SearchDomain<S>,
  services: InstanceRegistry<SearchService<S>>,
  source: S,
  goal: S,
  opts: { [key: string]: any } = {}
): Generator<AlgorithmResult<S>, undefined, void> {
  const h = services.get(Heuristic)
  const g = services.get(Cost)
  let bestCost = 1e100
  const gScores = new Map<S, number>()
  
  const e = (node: S) => (bestCost - gScores.get(node)!) / h.get(graph, node, goal)

  const cameFrom = new Map<S, S>()
  const openSet = new KeyedBinaryHeap<S>()
  gScores.set(source, 0)
  openSet.insert(source, -e(source))

  let nodesGenerated = 1
  let nodesExpanded = 0

  while (openSet.size > 0) {
    while (openSet.size > 0) {
      const vertex = openSet.pop() as S
      const currentCost = gScores.get(vertex) as number
      nodesExpanded++

      if (vertex === goal) {
        bestCost = currentCost
        yield {
          path: reconstructPath(cameFrom, goal),
          searchMetrics: { nodesExpanded, nodesGenerated }
        }
        break
      } else {
        for (const nextVertex of graph.successors(vertex)) {
          const hScore = h.get(graph, nextVertex, goal)
          const tentativeCost = currentCost + g.get(graph, vertex, nextVertex)
          if (tentativeCost + hScore >= bestCost) continue
          if (!gScores.has(nextVertex) || gScores.get(nextVertex)! > tentativeCost) {
            gScores.set(nextVertex, tentativeCost)
            cameFrom.set(nextVertex, vertex)
            if (tentativeCost + hScore < bestCost) {
              openSet.insertOrUpdate(nextVertex, -e(nextVertex))
              nodesGenerated++
            }
          }
        }
      }
    }

    for (const [vertex, _] of Array.from(openSet.entries())) {
      if (gScores.get(vertex)! + h.get(graph, vertex, goal) >= bestCost) {
        openSet.remove(vertex)
      } else {
        openSet.update(vertex, -e(vertex))
      }
    }
  }
}

anytimeNonparametricAStar.availableOpts = new Set()
anytimeNonparametricAStar.availableServices = new Set([Cost, Heuristic])
