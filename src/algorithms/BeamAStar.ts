import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { Graph, Vertex } from '../Graph'
import type { InstanceRegistry } from '../Registry'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { reconstructPath } from '../services/misc'
import { IntervalHeap } from '../ds/IntervalHeap'

/**
 * Global beam search
 */
export const beamAStar: Algorithm = function * (
  graph: Graph,
  services: InstanceRegistry<SearchService>,
  source: Vertex,
  goal: Vertex,
  opts: { [key: string]: any } = {}
): Generator<AlgorithmResult, undefined, void> {
  const h = services.get(Heuristic)
  const g = services.get(Cost)
  const gScores = new Map<Vertex, number>()
  const epsilon: number = opts['epsilon'] ?? 1
  const beamSize: number = opts['beamSize'] ?? 10

  const cameFrom = new Map<Vertex, Vertex>()
  const openSet = new IntervalHeap<Vertex>()
  openSet.insert(source, epsilon * h.get(graph, source.x, source.y, goal.x, goal.y))
  gScores.set(source, 0)

  let nodesGenerated = 1
  let nodesExpanded = 0

  while (openSet.size > 0) {
    const vertex = openSet.min() as Vertex
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
          openSet.insert(nextVertex, tentativeCost + epsilon * h.get(graph, nextVertex.x, nextVertex.y, goal.x, goal.y))
          nodesGenerated++

          if (openSet.size > beamSize) openSet.deleteMax()
        }
      }
    }
  }
}

beamAStar.availableOpts = new Set(['epsilon', 'beamSize'])
