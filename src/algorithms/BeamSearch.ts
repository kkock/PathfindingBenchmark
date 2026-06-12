import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { Graph, Vertex } from '../Graph'
import type { InstanceRegistry } from '../Registry'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { reconstructPath } from '../services/misc'
import { quickSelect } from '../services/QuickSelect'

type BeamNode = {
  vertex: Vertex
  g: number
  f: number
}

/**
 * Layered beam search without backtracking
 */
export const beamSearch: Algorithm = function * (
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
  gScores.set(source, 0)

  let nodesGenerated = 1
  let nodesExpanded = 0

  let beam: BeamNode[] = [{
    vertex: source,
    g: 0,
    f: epsilon * h.get(graph, source.x, source.y, goal.x, goal.y)
  }]

  while (beam.length > 0) {
    const nextBeam: BeamNode[] = []
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
      
      for (const nextVertex of vertex.neighbors) {
        const tentativeCost = node.g + g.get(graph, vertex.x, vertex.y, nextVertex.x, nextVertex.y)
        if (!gScores.has(nextVertex) || gScores.get(nextVertex) as number > tentativeCost) {
          gScores.set(nextVertex, tentativeCost)
          cameFrom.set(nextVertex, vertex)
          nextBeam.push({
            vertex: nextVertex,
            g: tentativeCost,
            f: tentativeCost + epsilon * h.get(graph, nextVertex.x, nextVertex.y, goal.x, goal.y)
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