import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { InstanceRegistry } from '../Registry'
import type { SearchDomain } from '../graph/Graph'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { KeyedBinaryHeap } from '../ds/KeyedBinaryHeap'
import { reconstructPath } from '../services/misc'

export const anytimeRepairingAStar: Algorithm = function * <S> (
  graph: SearchDomain<S>,
  services: InstanceRegistry<SearchService<S>>,
  source: S,
  goal: S,
  opts: { [key: string]: any } = {}
): Generator<AlgorithmResult<S>, undefined, void> {
  const h = services.get(Heuristic)
  const g = services.get(Cost)
  const gScores = new Map<S, number>()
  const hScores = new Map<S, number>()
  let epsilon: number = opts['epsilon'] ?? 1

  const cameFrom = new Map<S, S>()
  const openSet = new KeyedBinaryHeap<S>()
  const closedSet = new Set<S>()
  const inconsistentSet = new Set<S>()

  function improvePath () {
    while (openSet.size > 0 && (gScores.get(goal) as number) > (openSet.peekPriority() as number)) {
      const vertex = openSet.pop() as S
      nodesExpanded++
      closedSet.add(vertex)
      const currentCost = gScores.get(vertex) as number
      for (const nextVertex of graph.successors(vertex)) {
        if (!gScores.has(nextVertex)) gScores.set(nextVertex, Infinity)
        const nextCost = gScores.get(nextVertex) as number
        const tentativeCost = currentCost + g.get(graph, vertex, nextVertex)
        if (nextCost > tentativeCost) {
          gScores.set(nextVertex, tentativeCost)
          cameFrom.set(nextVertex, vertex)
          if (!closedSet.has(nextVertex)) {
            if (!hScores.has(nextVertex)) hScores.set(nextVertex, h.get(graph, nextVertex, goal))
            const hScore = hScores.get(nextVertex) as number
            openSet.insertOrUpdate(nextVertex, tentativeCost + hScore * epsilon)
            nodesGenerated++
          } else {
            inconsistentSet.add(nextVertex)
          }
        }
      }
    }
  }

  hScores.set(source, h.get(graph, source, goal))
  gScores.set(source, 0)
  hScores.set(goal, 0)
  gScores.set(goal, Infinity)
  openSet.insert(source, hScores.get(source) as number * epsilon)

  let nodesGenerated = 1
  let nodesExpanded = 0

  improvePath()
  yield {
    path: reconstructPath(cameFrom, goal),
    searchMetrics: { nodesExpanded, nodesGenerated }
  }
  while (epsilon > 1) {
    epsilon = Math.max(1, epsilon - 1)
    while (openSet.size > 0) inconsistentSet.add(openSet.pop() as S)
    for (const vertex of inconsistentSet) {
      const fScore = 
        (gScores.get(vertex) as number) + 
        (hScores.get(vertex) as number) * epsilon
      openSet.insert(vertex, fScore)
    }
    closedSet.clear()
    improvePath()
    yield {
      path: reconstructPath(cameFrom, goal),
      searchMetrics: { nodesExpanded, nodesGenerated }
    }
  }
}

anytimeRepairingAStar.availableOpts = new Set(['epsilon'])
anytimeRepairingAStar.availableServices = new Set([Cost, Heuristic])