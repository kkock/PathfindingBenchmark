import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { InstanceRegistry } from '../Registry'
import type { SearchDomain } from '../graph/Graph'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { KeyedBinaryHeap } from '../ds/KeyedBinaryHeap'
import { reconstructPath } from '../services/misc'

export const boundedQualityAnytimeWindowAStar: Algorithm = function * <S>(
  graph: SearchDomain<S>,
  services: InstanceRegistry<SearchService<S>>,
  source: S,
  goal: S,
  opts: { [key: string]: any } = {}
): Generator<AlgorithmResult<S>, undefined, void> {
  const h = services.get(Heuristic)
  const g = services.get(Cost)
  const gScores = new Map<S, number>()
  let epsilon = opts['epsilon'] ?? 2
  const delta = opts['delta'] ?? 1

  const level = new Map<S, number>()
  const parent = new Map<S, S>()

  let openSet = new KeyedBinaryHeap<S>()
  let suspendSet = new KeyedBinaryHeap<S>()
  const closedSet = new Set<S>()

  gScores.set(source, 0)
  level.set(source, 0)
  openSet.insert(source, h.get(graph, source, goal))

  let windowSize = 0
  let bestCost = Infinity

  let nodesExpanded = 0
  let nodesGenerated = 1

  while (true) {
    let currentLevel = -1
    let minSuspendF = suspendSet.size === 0 ? Infinity : suspendSet.peekPriority()!
    while (openSet.size > 0) {
      const fScore = openSet.peekPriority()!
      const vertex = openSet.pop()!

      closedSet.add(vertex)

      if (fScore >= bestCost || fScore >= minSuspendF * epsilon) {
        closedSet.delete(vertex)
        if (fScore < bestCost) openSet.insertOrUpdate(vertex, fScore)
        break
      }

      const vertexLevel = level.get(vertex)!

      if (vertexLevel <= currentLevel - windowSize) {
        closedSet.delete(vertex)
        suspendSet.insertOrUpdate(vertex, fScore)
        minSuspendF = suspendSet.peekPriority()!
        continue
      }

      if (vertexLevel > currentLevel) currentLevel = vertexLevel
      nodesExpanded++

      if (vertex === goal) {
        bestCost = gScores.get(vertex)!
        yield {
          path: reconstructPath(parent, goal),
          searchMetrics: { nodesExpanded, nodesGenerated }
        }
        break
      }

      for (const nextVertex of graph.successors(vertex)) {
        const tentativeCost = gScores.get(vertex)! + g.get(graph, vertex, nextVertex)

        if (!gScores.has(nextVertex) || tentativeCost < gScores.get(nextVertex)!) {
          gScores.set(nextVertex, tentativeCost)
          parent.set(nextVertex, vertex)
          level.set(nextVertex, vertexLevel + 1)

          const nextF = tentativeCost + h.get(graph, nextVertex, goal)

          openSet.insertOrUpdate(nextVertex, nextF)
          suspendSet.remove(nextVertex)
          closedSet.delete(nextVertex)

          nodesGenerated++
        }
      }
    }

    if (suspendSet.size === 0) return

    ;[openSet, suspendSet] = [suspendSet, openSet]
    windowSize++
    epsilon = Math.max(1, epsilon - delta)
  }
}

boundedQualityAnytimeWindowAStar.availableOpts = new Set(['epsilon', 'delta'])
boundedQualityAnytimeWindowAStar.availableServices = new Set([Cost, Heuristic])