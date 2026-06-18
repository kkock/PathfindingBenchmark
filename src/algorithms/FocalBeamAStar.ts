import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { Graph, Vertex } from '../Graph'
import type { InstanceRegistry } from '../Registry'

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

export const focalBeamAStar: Algorithm = function * (
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
  const beamSize: number = opts['beamSize'] ?? 200
  const dynamicBeamSize: number = opts['dynamicBeamSize'] ?? 20

  const cameFrom = new Map<Vertex, Vertex>()
  const openSet = new FocalBeamQueue<Vertex>(beamSize)
  openSet.insert(source, epsilon * h.get(graph, source.x, source.y, goal.x, goal.y))
  gScores.set(source, 0)

  let nodesGenerated = 1
  let nodesExpanded = 0

  while (openSet.size > 0) {
    const vertex = openSet.pop() as Vertex
    const currentCost = gScores.get(vertex) as number
    nodesExpanded++

    if (vertex === goal) {
      yield {
        path: reconstructPath(cameFrom, goal),
        searchMetrics: { nodesExpanded, nodesGenerated }
      }
      openSet.beamSize += dynamicBeamSize
    } else {
      for (const nextVertex of vertex.neighbors) {
        const tentativeCost = currentCost + g.get(graph, vertex.x, vertex.y, nextVertex.x, nextVertex.y)

        if (gScores.has(goal) && tentativeCost >= (gScores.get(goal) as number)) continue
        if (!gScores.has(nextVertex) || gScores.get(nextVertex) as number > tentativeCost) {
          gScores.set(nextVertex, tentativeCost)
          cameFrom.set(nextVertex, vertex)
          openSet.insert(nextVertex, tentativeCost + epsilon * h.get(graph, nextVertex.x, nextVertex.y, goal.x, goal.y))
          nodesGenerated++
        }
      }
    }
  }
}

focalBeamAStar.availableOpts = new Set(['beamSize', 'dynamicBeamSize', 'epsilon'])
focalBeamAStar.availableServices = new Set([Cost, Heuristic])
