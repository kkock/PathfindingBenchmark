import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { Graph, Vertex } from '../Graph'
import type { InstanceRegistry } from '../Registry'

import { Cost } from '../services/Cost'
import { Heuristic, InadmissibleHeuristic } from '../services/Heuristic'
import { BinaryHeap } from '../ds/BinaryHeap'
import { reconstructPath } from '../services/misc'
import { InadmissibleActionEstimate } from '../services/ActionEstimate'
// import { RedBlackTree } from '../ds/RedBlackTree'
import { OrderedSet } from '@js-sdsl/ordered-set'

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
  focalList = new BinaryHeap<EESNode<T>>() // Ordered on d-hat
  // openList = new RedBlackTree<EESNode<T>>((a, b) => a.fHat - b.fHat) // Ordered on f-hat
  openList = new OrderedSet<EESNode<T>>([], (a, b) => a.fHat - b.fHat) // Ordered on f-hat
  cleanupList = new BinaryHeap<EESNode<T>>() // Ordered on f
  // private focalBoundary: RedBlackNode<EESNode<T>> | null = null
  // private focalThreshold = -Infinity

  private readonly weight: number

  constructor (weight: number) {
    this.weight = weight
  }

  members = new Set<EESNode<T>>()
  get size (): number { return this.members.size }

  private peekFocal (): EESNode<T> | undefined {
    if (this.focalList.size === 0) return undefined
    this.repairFocal()
    return this.focalList.peek() as EESNode<T>
  }

  private peekOpen (): EESNode<T> | undefined {
    this.repairOpen()
    // this.openList.begin()
    return this.openList.begin().pointer// ?.values[0]
  }

  private peekCleanup (): EESNode<T> | undefined {
    if (this.cleanupList.size === 0) return undefined
    this.repairCleanup()
    return this.cleanupList.peek() as EESNode<T>
  }

  private repairFocal (): void {
    // Step 1: clean invalid nodes from heap
    while (this.focalList.size > 0) {
      const node = this.focalList.peek() as EESNode<T>

      if (!this.members.has(node)) {
        this.focalList.pop()
        continue
      }

      const bestOpen = this.peekOpen()
      if (bestOpen == null) {
        this.focalList.pop()
        continue
      }

      const threshold = this.weight * bestOpen.fHat

      if (node.fHat > threshold) {
        this.focalList.pop()
        continue
      }

      break
    }

    // Step 2: recompute focal membership from scratch boundary-wise
    const bestOpen = this.peekOpen()
    if (bestOpen == null) return

    const threshold = this.weight * bestOpen.fHat
    let current = this.openList.begin()// .pointer
    // this.openList.minimum()

    while (current != null) {
      // const node = current.values[0] as EESNode<T>
      const node = current.pointer
      if (node.fHat > threshold) break
      if (this.members.has(node)) this.focalList.insert(node, node.dHat)
      // current = this.openList.successor(current)
      current = current.next()
    }
  }

  private repairOpen (): void {
    while (true) {
      // const min = this.openList.minimum()
      const min = this.openList.begin()
      if (min == null) return

      // const node = min.values[0] as EESNode<T>
      const node = min.pointer

      if (this.members.has(node)) return

      // this.openList.remove(node)
      this.openList.eraseElementByKey(node)
    }
  }

  private repairCleanup (): void {
    while (!this.members.has(this.cleanupList.peek() as EESNode<T>)) {
      this.cleanupList.pop()
    }
  }

  private popFocal (): EESNode<T> | undefined {
    if (this.focalList.size === 0) return undefined
    this.repairFocal()
    const result = this.focalList.pop() as EESNode<T>
    this.members.delete(result)
    return result
  }

  private popOpen (): EESNode<T> | undefined {
    this.repairOpen()
    // const min = this.openList.minimum()
    const min = this.openList.begin()
    if (min == null) return undefined
    // const node = min.values[0] as EESNode<T>
    const node = min.pointer
    // this.openList.remove(node)
    this.openList.eraseElementByKey(node)
    this.members.delete(node)
    return node
  }

  private popCleanup (): EESNode<T> | undefined {
    if (this.cleanupList.size === 0) return undefined
    this.repairCleanup()
    const result = this.cleanupList.pop() as EESNode<T>
    this.members.delete(result)
    return result
  }

  insert (item: T, g: number, h: number, hHat: number, dHat: number): void {
    const node = new EESNode(item, g, h, hHat, dHat)

    this.members.add(node)
    this.openList.insert(node)
    this.cleanupList.insert(node, node.f)
  }

  pop (): T | undefined {
    const bestCleanup = this.peekCleanup()
    if (bestCleanup == null) return undefined

    const bestFocal = this.peekFocal()
    const bestOpen = this.peekOpen()

    if (bestOpen == null) return undefined

    if (bestFocal != null && bestFocal.fHat <= this.weight * bestCleanup.f) {
      return this.popFocal()?.item
    } else if (bestOpen.fHat <= this.weight * bestCleanup.f) {
      return this.popOpen()?.item
    } else {
      return this.popCleanup()?.item
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
  const hHat = services.get(InadmissibleHeuristic)
  const dHat = services.get(InadmissibleActionEstimate)
  const g = services.get(Cost)
  const gScores = new Map<Vertex, number>()
  const epsilon: number = opts['epsilon'] ?? 1

  const cameFrom = new Map<Vertex, Vertex>()
  const openSet = new EESList<Vertex>(epsilon)
  openSet.insert(
    source,
    0,
    h.get(graph, source.x, source.y, goal.x, goal.y),
    hHat.get(graph, source.x, source.y, goal.x, goal.y),
    dHat.get(graph, source.x, source.y, goal.x, goal.y)
  )
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
        openSet.insert(
          nextVertex,
          tentativeCost,
          h.get(graph, source.x, source.y, goal.x, goal.y),
          hHat.get(graph, source.x, source.y, goal.x, goal.y),
          dHat.get(graph, source.x, source.y, goal.x, goal.y)
        )
        nodesGenerated++
      }
    }
  }
}

explicitEstimationSearch.availableOpts = new Set(['epsilon'])
explicitEstimationSearch.availableServices = new Set([
  Cost,
  Heuristic,
  InadmissibleHeuristic,
  InadmissibleActionEstimate
])
