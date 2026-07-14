import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { InstanceRegistry } from '../Registry'
import type { SearchDomain } from '../graph/Graph'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { KeyedBinaryHeap } from '../ds/KeyedBinaryHeap'
import { reconstructPath } from '../services/misc'
import { KeyedIntervalHeap } from '../ds/KeyedIntervalHeap'

class RecoveringBeamQueue<T> {
  private readonly commitList = new KeyedIntervalHeap<T>()
  private readonly staleList = new KeyedBinaryHeap<T>()
  private _beamSize: number
  constructor (beamSize: number) { this._beamSize = beamSize }

  set beamSize (size: number) {
    this._beamSize = size
    this.resetCommit()
  }

  get beamSize (): number {
    return this._beamSize
  }

  insert (item: T, priority: number): void {
    if (this.staleList.has(item)) {
      this.staleList.remove(item)
    }
    this.commitList.insertOrUpdate(item, priority)
    if (this.commitList.size > this._beamSize) {
      const maxItem = this.commitList.max() as T
      const maxPriority = this.commitList.maxPriority() as number
      this.staleList.insertOrUpdate(maxItem, maxPriority)
      this.commitList.deleteMax()
    }
  }

  pop (): T | undefined {
    if (this.commitList.size === 0) this.resetCommit()
    const item = this.commitList.min() as T
    this.commitList.deleteMin()
    return item
  }

  private resetCommit (): void {
    while (this.staleList.size > 0 && this.commitList.size < this._beamSize) {
      const priority = this.staleList.peekPriority() as number
      const item = this.staleList.pop() as T
      this.commitList.insertOrUpdate(item, priority)
    }
  }

  get size (): number { return this.commitList.size + this.staleList.size }
  get commitSize (): number { return this.commitList.size }
}

export const recoveringBeamAStar: Algorithm = function * <S> (
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
  const beamSize: number = opts['beamSize'] ?? 200
  const dynamicBeamSize: number = opts['dynamicBeamSize'] ?? 20

  const cameFrom = new Map<S, S>()
  const openSet = new RecoveringBeamQueue<S>(beamSize)
  openSet.insert(source, epsilon * h.get(graph, source, goal))
  gScores.set(source, 0)

  let nodesGenerated = 1
  let nodesExpanded = 0

  while (openSet.size > 0) {
    const vertex = openSet.pop() as S
    const currentCost = gScores.get(vertex) as number
    nodesExpanded++

    if (vertex === goal) {
      yield {
        path: reconstructPath(cameFrom, goal),
        searchMetrics: { nodesExpanded, nodesGenerated }
      }
      openSet.beamSize += dynamicBeamSize
    } else {
      for (const nextVertex of graph.successors(vertex)) {
        const tentativeCost = currentCost + g.get(graph, vertex, nextVertex)

        if (gScores.has(goal) && tentativeCost >= (gScores.get(goal) as number)) continue
        if (!gScores.has(nextVertex) || gScores.get(nextVertex) as number > tentativeCost) {
          gScores.set(nextVertex, tentativeCost)
          cameFrom.set(nextVertex, vertex)
          openSet.insert(nextVertex, tentativeCost + epsilon * h.get(graph, nextVertex, goal))
          nodesGenerated++
        }
      }
    }
  }
}

recoveringBeamAStar.availableOpts = new Set(['beamSize', 'dynamicBeamSize', 'epsilon'])
recoveringBeamAStar.availableServices = new Set([Cost, Heuristic])
