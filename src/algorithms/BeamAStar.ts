import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import { GridGraph, GridVertex } from '../graph/GridGraph'
import type { InstanceRegistry } from '../Registry'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { reconstructPath } from '../services/misc'
import { KeyedIntervalHeap } from '../ds/KeyedIntervalHeap'

/**
 * Global beam search
 */
export const beamAStar: Algorithm = function * (
  graph: GridGraph,
  services: InstanceRegistry<SearchService>,
  source: GridVertex,
  goal: GridVertex,
  opts: { [key: string]: any } = {}
): Generator<AlgorithmResult, undefined, void> {
  const h = services.get(Heuristic)
  const g = services.get(Cost)
  const gScores = new Map<GridVertex, number>()
  const epsilon: number = opts['epsilon'] ?? 1
  const beamSize: number = opts['beamSize'] ?? 10

  const cameFrom = new Map<GridVertex, GridVertex>()
  const openSet = new KeyedIntervalHeap<GridVertex>()
  openSet.insert(source, epsilon * h.get(graph, source.x, source.y, goal.x, goal.y))
  gScores.set(source, 0)

  let nodesGenerated = 1
  let nodesExpanded = 0

  while (openSet.size > 0) {
    const vertex = openSet.min() as GridVertex
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
      for (const nextVertex of vertex.neighbors) {
        const tentativeCost = currentCost + g.get(graph, vertex.x, vertex.y, nextVertex.x, nextVertex.y)

        if (gScores.has(goal) && tentativeCost >= (gScores.get(goal) as number)) continue
        if (!gScores.has(nextVertex) || gScores.get(nextVertex) as number > tentativeCost) {
          gScores.set(nextVertex, tentativeCost)
          cameFrom.set(nextVertex, vertex)
          openSet.insertOrUpdate(nextVertex, tentativeCost + epsilon * h.get(graph, nextVertex.x, nextVertex.y, goal.x, goal.y))
          nodesGenerated++

          if (openSet.size > beamSize) openSet.deleteMax()
        }
      }
    }
  }
}

beamAStar.availableOpts = new Set(['epsilon', 'beamSize'])
beamAStar.availableServices = new Set([Cost, Heuristic])
