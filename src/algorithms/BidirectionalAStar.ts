import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { InstanceRegistry } from '../Registry'
import type { SearchDomain } from '../graph/Graph'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { KeyedBinaryHeap } from '../ds/KeyedBinaryHeap'

function reconstructBidirectionalPath<S> (
  forwardCameFrom: Map<S, S>,
  backwardCameFrom: Map<S, S>,
  source: S,
  goal: S,
  meeting: S
): S[] {
  const forwardPath: S[] = []

  let current: S | undefined = meeting
  while (current !== undefined) {
    forwardPath.push(current)
    if (current === source) break
    current = forwardCameFrom.get(current)
  }

  forwardPath.reverse()

  const backwardPath: S[] = []

  current = backwardCameFrom.get(meeting)
  while (current !== undefined) {
    backwardPath.push(current)
    if (current === goal) break
    current = backwardCameFrom.get(current)
  }

  return forwardPath.concat(backwardPath)
}

export const bidirectionalAStar: Algorithm = function * <S> (
  graph: SearchDomain<S>,
  services: InstanceRegistry<SearchService<S>>,
  source: S,
  goal: S,
  opts: { [key: string]: any } = {}
): Generator<AlgorithmResult<S>, undefined, void> {
  const h = services.get(Heuristic)
  const g = services.get(Cost)
  const epsilon: number = opts['epsilon'] ?? 1

  const forwardG = new Map<S, number>()
  const backwardG = new Map<S, number>()
  const forwardCameFrom = new Map<S, S>()
  const backwardCameFrom = new Map<S, S>()
  const forwardOpen = new KeyedBinaryHeap<S>()
  const backwardOpen = new KeyedBinaryHeap<S>()

  forwardG.set(source, 0)
  backwardG.set(goal, 0)

  forwardOpen.insert(source, epsilon * h.get(graph, source, goal))
  backwardOpen.insert(goal, epsilon * h.get(graph, goal, source))

  let nodesGenerated = 2
  let nodesExpanded = 0

  while (forwardOpen.size > 0 && backwardOpen.size > 0) {
    // Forward expansion
    const fwdVertex = forwardOpen.pop() as S
    const fwdCost = forwardG.get(fwdVertex) as number

    nodesExpanded++

    if (backwardG.has(fwdVertex)) {
      yield {
        path: reconstructBidirectionalPath(
          forwardCameFrom,
          backwardCameFrom,
          source,
          goal,
          fwdVertex
        ),
        searchMetrics: { nodesExpanded, nodesGenerated }
      }
      return
    }

    for (const nextVertex of graph.successors(fwdVertex)) {
      const tentativeCost = fwdCost + g.get(graph, fwdVertex, nextVertex)

      if (!forwardG.has(nextVertex) || (forwardG.get(nextVertex) as number) > tentativeCost) {
        forwardG.set(nextVertex, tentativeCost)
        forwardCameFrom.set(nextVertex, fwdVertex)

        forwardOpen.insertOrUpdate(
          nextVertex,
          tentativeCost + epsilon * h.get(graph, nextVertex, goal)
        )

        nodesGenerated++
      }
    }

    // Backward expansion
    const bwdVertex = backwardOpen.pop() as S
    const bwdCost = backwardG.get(bwdVertex) as number

    nodesExpanded++

    if (forwardG.has(bwdVertex)) {
      yield {
        path: reconstructBidirectionalPath(
          forwardCameFrom,
          backwardCameFrom,
          source,
          goal,
          bwdVertex
        ),
        searchMetrics: { nodesExpanded, nodesGenerated }
      }
      return
    }

    for (const nextVertex of graph.successors(bwdVertex)) {
      const tentativeCost = bwdCost + g.get(graph, bwdVertex, nextVertex)

      if (!backwardG.has(nextVertex) || (backwardG.get(nextVertex) as number) > tentativeCost) {
        backwardG.set(nextVertex, tentativeCost)
        backwardCameFrom.set(nextVertex, bwdVertex)

        backwardOpen.insertOrUpdate(
          nextVertex,
          tentativeCost + epsilon * h.get(graph, nextVertex, source)
        )

        nodesGenerated++
      }
    }
  }
}

bidirectionalAStar.availableOpts = new Set(['epsilon'])
bidirectionalAStar.availableServices = new Set([
  Cost,
  Heuristic
])
