import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { GridGraph, GridVertex } from '../graph/GridGraph'
import type { InstanceRegistry } from '../Registry'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { KeyedBinaryHeap } from '../ds/KeyedBinaryHeap'

function reconstructBidirectionalPath (
  forwardCameFrom: Map<GridVertex, GridVertex>,
  backwardCameFrom: Map<GridVertex, GridVertex>,
  source: GridVertex,
  goal: GridVertex,
  meeting: GridVertex
): GridVertex[] {
  const forwardPath: GridVertex[] = []

  let current: GridVertex | undefined = meeting
  while (current !== undefined) {
    forwardPath.push(current)
    if (current === source) break
    current = forwardCameFrom.get(current)
  }

  forwardPath.reverse()

  const backwardPath: GridVertex[] = []

  current = backwardCameFrom.get(meeting)
  while (current !== undefined) {
    backwardPath.push(current)
    if (current === goal) break
    current = backwardCameFrom.get(current)
  }

  return forwardPath.concat(backwardPath)
}

export const anytimeBidirectionalAStar: Algorithm = function * (
  graph: GridGraph,
  services: InstanceRegistry<SearchService>,
  source: GridVertex,
  goal: GridVertex,
  opts: { [key: string]: any } = {}
): Generator<AlgorithmResult, undefined, void> {
  const h = services.get(Heuristic)
  const g = services.get(Cost)
  const epsilon: number = opts['epsilon'] ?? 1

  const forwardG = new Map<GridVertex, number>()
  const backwardG = new Map<GridVertex, number>()
  const forwardCameFrom = new Map<GridVertex, GridVertex>()
  const backwardCameFrom = new Map<GridVertex, GridVertex>()
  const forwardOpen = new KeyedBinaryHeap<GridVertex>()
  const backwardOpen = new KeyedBinaryHeap<GridVertex>()

  forwardG.set(source, 0)
  backwardG.set(goal, 0)

  forwardOpen.insert(source, epsilon * h.get(graph, source.x, source.y, goal.x, goal.y))
  backwardOpen.insert(goal, epsilon * h.get(graph, goal.x, goal.y, source.x, source.y))

  let nodesGenerated = 2
  let nodesExpanded = 0

  let bestCost = Infinity
  let meetingVertex: GridVertex | undefined

  while (forwardOpen.size > 0 && backwardOpen.size > 0) {
    // Forward expansion
    const fwdVertex = forwardOpen.pop() as GridVertex
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
    const bwdVertex = backwardOpen.pop() as GridVertex
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
