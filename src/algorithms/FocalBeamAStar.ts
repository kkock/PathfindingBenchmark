import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { InstanceRegistry } from '../Registry'
import type { SearchDomain } from '../graph/Graph'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { KeyedBinaryHeap } from '../ds/KeyedBinaryHeap'
import { reconstructPath } from '../services/misc'
import { KeyedIntervalHeap } from '../ds/KeyedIntervalHeap'

class FocalBeamQueue<T> {
  private readonly focalList = new KeyedIntervalHeap<T>()
  private readonly openList = new KeyedBinaryHeap<T>()
  private _beamSize: number
  constructor (beamSize: number) { this._beamSize = beamSize }

  set beamSize (size: number) {
    this._beamSize = size
    this.resetFocal()
  }

  get beamSize (): number {
    return this._beamSize
  }

  insert (item: T, priority: number): void {
    if (this.openList.has(item)) {
      this.openList.remove(item)
    }
    this.focalList.insertOrUpdate(item, priority)
    if (this.focalList.size > this._beamSize) {
      const maxItem = this.focalList.max() as T
      const maxPriority = this.focalList.maxPriority() as number
      this.openList.insertOrUpdate(maxItem, maxPriority)
      this.focalList.deleteMax()
    }
  }

  pop (): T | undefined {
    if (this.focalList.size === 0) this.resetFocal()
    const item = this.focalList.min() as T
    this.focalList.deleteMin()
    return item
  }

  private resetFocal (): void {
    while (this.openList.size > 0 && this.focalList.size < this._beamSize) {
      const priority = this.openList.peekPriority() as number
      const item = this.openList.pop() as T
      this.focalList.insertOrUpdate(item, priority)
    }
  }

  get size (): number { return this.focalList.size + this.openList.size }
  get focalSize (): number { return this.focalList.size }
}

/**
 * @todo consider renaming `focal` to `commit` or `active`, and selecting an
 * apprioriate alternate name for the algorithm.
 * 
 * Also note that it's similar to MSC-KWA*, except this is a non-layered beam
 * search that dynamically adjusts the size of its commit list.
 */
export const focalBeamAStar: Algorithm = function * <S> (
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
  const openSet = new FocalBeamQueue<S>(beamSize)
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

focalBeamAStar.availableOpts = new Set(['beamSize', 'dynamicBeamSize', 'epsilon'])
focalBeamAStar.availableServices = new Set([Cost, Heuristic])
