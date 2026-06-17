import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { Graph, Vertex } from '../Graph'
import type { InstanceRegistry } from '../Registry'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { KeyedBinaryHeap } from '../ds/KeyedBinaryHeap'

function reconstructBidirectionalPath (
  forwardCameFrom: Map<Vertex, Vertex>,
  backwardCameFrom: Map<Vertex, Vertex>,
  source: Vertex,
  goal: Vertex,
  meeting: Vertex
): Vertex[] {
  const forwardPath: Vertex[] = []

  let current: Vertex | undefined = meeting
  while (current !== undefined) {
    forwardPath.push(current)
    if (current === source) break
    current = forwardCameFrom.get(current)
  }

  forwardPath.reverse()

  const backwardPath: Vertex[] = []

  current = backwardCameFrom.get(meeting)
  while (current !== undefined) {
    backwardPath.push(current)
    if (current === goal) break
    current = backwardCameFrom.get(current)
  }

  return forwardPath.concat(backwardPath)
}

export const anytimeBidirectionalAStar: Algorithm = function * (
  graph: Graph,
  services: InstanceRegistry<SearchService>,
  source: Vertex,
  goal: Vertex,
  opts: { [key: string]: any } = {}
): Generator<AlgorithmResult, undefined, void> {
  const h = services.get(Heuristic)
  const g = services.get(Cost)
  const epsilon: number = opts['epsilon'] ?? 1

  const forwardG = new Map<Vertex, number>()
  const backwardG = new Map<Vertex, number>()
  const forwardCameFrom = new Map<Vertex, Vertex>()
  const backwardCameFrom = new Map<Vertex, Vertex>()
  const forwardOpen = new KeyedBinaryHeap<Vertex>()
  const backwardOpen = new KeyedBinaryHeap<Vertex>()

  forwardG.set(source, 0)
  backwardG.set(goal, 0)

  forwardOpen.insert(source, epsilon * h.get(graph, source.x, source.y, goal.x, goal.y))
  backwardOpen.insert(goal, epsilon * h.get(graph, goal.x, goal.y, source.x, source.y))

  let nodesGenerated = 2
  let nodesExpanded = 0

  let bestCost = Infinity
  let meetingVertex: Vertex | undefined

  while (forwardOpen.size > 0 && backwardOpen.size > 0) {
    // Forward expansion
    const fwdVertex = forwardOpen.pop() as Vertex
    const fwdCost = forwardG.get(fwdVertex) as number

    if (fwdCost < bestCost) {
      nodesExpanded++

      if (backwardG.has(fwdVertex)) {
        const candidate = fwdCost + (backwardG.get(fwdVertex) as number)

        if (candidate < bestCost) {
          bestCost = candidate
          meetingVertex = fwdVertex

          yield {
            path: reconstructBidirectionalPath(
              forwardCameFrom,
              backwardCameFrom,
              source,
              goal,
              meetingVertex
            ),
            searchMetrics: { nodesExpanded, nodesGenerated }
          }
        }
      }

      for (const nextVertex of fwdVertex.neighbors) {
        const tentativeCost = fwdCost + g.get(graph, fwdVertex.x, fwdVertex.y, nextVertex.x, nextVertex.y)

        if (tentativeCost >= bestCost) continue

        if (!forwardG.has(nextVertex) || (forwardG.get(nextVertex) as number) > tentativeCost) {
          forwardG.set(nextVertex, tentativeCost)
          forwardCameFrom.set(nextVertex, fwdVertex)

          forwardOpen.insertOrUpdate(
            nextVertex,
            tentativeCost + epsilon * h.get(graph, nextVertex.x, nextVertex.y, goal.x, goal.y)
          )

          nodesGenerated++

          if (backwardG.has(nextVertex)) {
            const candidate = tentativeCost + (backwardG.get(nextVertex) as number)

            if (candidate < bestCost) {
              bestCost = candidate
              meetingVertex = nextVertex

              yield {
                path: reconstructBidirectionalPath(
                  forwardCameFrom,
                  backwardCameFrom,
                  source,
                  goal,
                  meetingVertex
                ),
                searchMetrics: { nodesExpanded, nodesGenerated }
              }
            }
          }
        }
      }
    }

    // Backward expansion
    const bwdVertex = backwardOpen.pop() as Vertex
    const bwdCost = backwardG.get(bwdVertex) as number

    if (bwdCost < bestCost) {
      nodesExpanded++

      if (forwardG.has(bwdVertex)) {
        const candidate = bwdCost + (forwardG.get(bwdVertex) as number)

        if (candidate < bestCost) {
          bestCost = candidate
          meetingVertex = bwdVertex

          yield {
            path: reconstructBidirectionalPath(
              forwardCameFrom,
              backwardCameFrom,
              source,
              goal,
              meetingVertex
            ),
            searchMetrics: { nodesExpanded, nodesGenerated }
          }
        }
      }

      for (const nextVertex of bwdVertex.neighbors) {
        const tentativeCost = bwdCost + g.get(graph, bwdVertex.x, bwdVertex.y, nextVertex.x, nextVertex.y)

        if (tentativeCost >= bestCost) continue

        if (!backwardG.has(nextVertex) || (backwardG.get(nextVertex) as number) > tentativeCost) {
          backwardG.set(nextVertex, tentativeCost)
          backwardCameFrom.set(nextVertex, bwdVertex)

          backwardOpen.insertOrUpdate(
            nextVertex,
            tentativeCost + epsilon * h.get(graph, nextVertex.x, nextVertex.y, source.x, source.y)
          )

          nodesGenerated++

          if (forwardG.has(nextVertex)) {
            const candidate = tentativeCost + (forwardG.get(nextVertex) as number)

            if (candidate < bestCost) {
              bestCost = candidate
              meetingVertex = nextVertex

              yield {
                path: reconstructBidirectionalPath(
                  forwardCameFrom,
                  backwardCameFrom,
                  source,
                  goal,
                  meetingVertex
                ),
                searchMetrics: { nodesExpanded, nodesGenerated }
              }
            }
          }
        }
      }
    }
  }
}

anytimeBidirectionalAStar.availableOpts = new Set(['epsilon'])
anytimeBidirectionalAStar.availableServices = new Set([
  Cost,
  Heuristic
])
