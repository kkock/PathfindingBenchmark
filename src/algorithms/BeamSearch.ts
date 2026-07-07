import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { InstanceRegistry } from '../Registry'
import type { SearchDomain } from '../graph/Graph'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { reconstructPath } from '../services/misc'
import { quickSelect } from '../services/QuickSelect'

type BeamNode<S> = {
  vertex: S
  g: number
  f: number
}

/**
 * Layered beam search without backtracking
 */
export const beamSearch: Algorithm = function * <S> (
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
  gScores.set(source, 0)

  let nodesGenerated = 1
  let nodesExpanded = 0

  let beam: BeamNode<S>[] = [{
    vertex: source,
    g: 0,
    f: epsilon * h.get(graph, source, goal)
  }]

  while (beam.length > 0) {
    const nextBeam: BeamNode<S>[] = []
    for (const node of beam) {
      const vertex = node.vertex
      nodesExpanded++

      if (vertex === goal) {
        yield {
          path: reconstructPath(cameFrom, goal),
          searchMetrics: { nodesExpanded, nodesGenerated }
        }
        return
      }
      
      for (const nextVertex of graph.successors(vertex)) {
        const tentativeCost = node.g + g.get(graph, vertex, nextVertex)
        if (!gScores.has(nextVertex) || gScores.get(nextVertex) as number > tentativeCost) {
          gScores.set(nextVertex, tentativeCost)
          cameFrom.set(nextVertex, vertex)
          nextBeam.push({
            vertex: nextVertex,
            g: tentativeCost,
            f: tentativeCost + epsilon * h.get(graph, nextVertex, goal)
          })
          
          nodesGenerated++
        }
      }
    }

    if (nextBeam.length === 0) break

    if (nextBeam.length > beamSize) {
      quickSelect(nextBeam, beamSize, (a, b) => a.f - b.f)
      nextBeam.length = beamSize
    }

    beam = nextBeam
  }
}

beamSearch.availableOpts = new Set(['epsilon', 'beamSize'])
beamSearch.availableServices = new Set([Cost, Heuristic])