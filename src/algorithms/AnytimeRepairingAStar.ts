import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import { GridGraph, GridVertex } from '../graph/GridGraph'
import type { InstanceRegistry } from '../Registry'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { KeyedBinaryHeap } from '../ds/KeyedBinaryHeap'
import { reconstructPath } from '../services/misc'

export const anytimeRepairingAStar: Algorithm = function * (
  graph: GridGraph,
  services: InstanceRegistry<SearchService>,
  source: GridVertex,
  goal: GridVertex,
  opts: { [key: string]: any } = {}
): Generator<AlgorithmResult, undefined, void> {
  const h = services.get(Heuristic)
  const g = services.get(Cost)
  const gScores = new Map<GridVertex, number>()
  const hScores = new Map<GridVertex, number>()
  let epsilon: number = opts['epsilon'] ?? 1

  const cameFrom = new Map<GridVertex, GridVertex>()
  const openSet = new KeyedBinaryHeap<GridVertex>()
  const closedSet = new Set<GridVertex>()
  const inconsistentSet = new Set<GridVertex>()

  function improvePath () {
    while (openSet.size > 0 && (gScores.get(goal) as number) > (openSet.peekPriority() as number)) {
      const vertex = openSet.pop() as GridVertex
      nodesExpanded++
      closedSet.add(vertex)
      const currentCost = gScores.get(vertex) as number
      for (const nextVertex of vertex.neighbors) {
        if (!gScores.has(nextVertex)) gScores.set(nextVertex, Infinity)
        const nextCost = gScores.get(nextVertex) as number
        const tentativeCost = currentCost + g.get(graph, vertex.x, vertex.y, nextVertex.x, nextVertex.y)
        if (nextCost > tentativeCost) {
          gScores.set(nextVertex, tentativeCost)
          cameFrom.set(nextVertex, vertex)
          if (!closedSet.has(nextVertex)) {
            if (!hScores.has(nextVertex)) hScores.set(nextVertex, h.get(graph, nextVertex.x, nextVertex.y, goal.x, goal.y))
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

  hScores.set(source, h.get(graph, source.x, source.y, goal.x, goal.y))
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
    while (openSet.size > 0) inconsistentSet.add(openSet.pop() as GridVertex)
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