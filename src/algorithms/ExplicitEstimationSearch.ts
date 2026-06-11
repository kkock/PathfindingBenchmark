import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { Graph, Vertex } from '../Graph'
import type { InstanceRegistry } from '../Registry'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { BinaryHeap } from '../ds/BinaryHeap'
import { reconstructPath } from '../services/misc'

class EESNode<T> {
  public readonly item: T
  public readonly f: number
  public readonly h: number
  public readonly g: number
  public readonly fHat: number
  public readonly dHat: number
  public readonly hHat: number

  /**
   * @param item The item to store
   * @param g The cost of the item
   * @param h Admissible estimate of cost-to-goal 
   * @param hHat Potentially inadmissible estimate of cost-to-goal
   * @param dHat Potentially inadmissible estimate of remaining actions
   */
  constructor (item: T, g: number, h: number, hHat: number, dHat: number) {
    this.item = item
    this.g = g
    this.h = h
    this.f = this.g + this.h
    this.hHat = hHat
    this.fHat = this.g + this.hHat
    this.dHat = dHat
  }
}

class EESList<T> {
  focalList = new BinaryHeap<EESNode<T>> // Ordered on d-hat
  openList = new BinaryHeap<EESNode<T>> // Ordered on f-hat
  cleanupList = new BinaryHeap<EESNode<T>> // Ordered on f
  weight: number = 1

  members = new Set<EESNode<T>>()

  private peekFocal () : EESNode<T> | undefined {
    return
  }

  private peekOpen () : EESNode<T> | undefined {
    return
  }

  private peekCleanup () : EESNode<T> | undefined {
    return
  }

  insert (item: T, g: number, h: number, hHat: number, dHat: number): void {
    this.members.add(new EESNode(item, g, h, hHat, dHat))
    /** @todo Add to the correct lists. */
    // Focal list contains all `f(n) <= w * f(bestF)`
  }

  pop (): T | undefined {
    if (this.cleanupList.size <= 0) return undefined

    const bestFocal = this.peekFocal()!
    const bestOpen = this.peekOpen()!
    const bestCleanup = this.peekCleanup()!

    if (bestFocal.fHat <= this.weight * bestCleanup.f) {
      return this.focalList.pop()?.item
    } else if (bestOpen.fHat <= this.weight * bestCleanup.f) {
      return this.openList.pop()?.item
    } else {
      return this.cleanupList.pop()?.item
    }
  }
}

/**
 * @todo finish implementation
 */
export const explicitEstimationSearch: Algorithm = function * (
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

  const cameFrom = new Map<Vertex, Vertex>()
  const openSet = new BinaryHeap<Vertex>()
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
      return
    }

    for (const nextVertex of vertex.neighbors) {
      const tentativeCost = currentCost + g.get(graph, vertex.x, vertex.y, nextVertex.x, nextVertex.y)

      if (!gScores.has(nextVertex) || gScores.get(nextVertex) as number > tentativeCost) {
        gScores.set(nextVertex, tentativeCost)
        cameFrom.set(nextVertex, vertex)
        openSet.insert(nextVertex, tentativeCost + epsilon * h.get(graph, nextVertex.x, nextVertex.y, goal.x, goal.y))
        nodesGenerated++
      }
    }
  }
}

explicitEstimationSearch.availableOpts = new Set(['epsilon'])
