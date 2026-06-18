import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { Graph, Vertex } from '../Graph'
import type { InstanceRegistry } from '../Registry'

import { Cost } from '../services/Cost'
import { Heuristic, InadmissibleHeuristic } from '../services/Heuristic'
import { KeyedBinaryHeap } from '../ds/KeyedBinaryHeap'
import { reconstructPath } from '../services/misc'
import { InadmissibleActionEstimate } from '../services/ActionEstimate'
import { RedBlackTree } from '../ds/RedBlackTree2'

//import {TreeMultiSet} from 'data-structure-typed';

export class EESNode<T> {
  item: T

  f: number
  g: number
  fHat: number
  dHat: number

  _open?: boolean
  _inFocal?: boolean

  constructor (item: T, g: number, h: number, hHat: number, dHat: number) {
    this.item = item
    this.g = g
    this.f = g + h
    this.fHat = g + hHat
    this.dHat = dHat
  }
}

export class EESQueue<T> {
  private readonly weight: number;

  private readonly nodes = new Map<T, EESNode<T>>();

  /** Ordered by fHat */
  private readonly open = new RedBlackTree<EESNode<T>>(a => a.fHat)
  /*private readonly open = new TreeMultiSet<EESNode<T>>(undefined, {
    enableOrderStatistic: true,
    comparator: (a, b) => {
      return a.fHat < b.fHat ? -1 : a.fHat > b.fHat ? 1 : 0
    }
  })*/

  /** Ordered by f */
  private readonly cleanup = new KeyedBinaryHeap<EESNode<T>>()

  /** Ordered by dHat */
  private readonly focal = new KeyedBinaryHeap<EESNode<T>>()

  /** Largest fHat value already transferred from open into focal. */
  private focalThreshold = -Infinity

  constructor (weight: number) {
    this.weight = weight
  }

  get size (): number {
    return this.open.size
  }

  /**
   * Insert a newly generated node.
   */
  private insertNode (node: EESNode<T>): void {
    this.nodes.set(node.item, node)
    node._open = true
    node._inFocal = false
    this.open.insert(node)
    //this.open.add(node)
    this.cleanup.insertOrUpdate(node, node.f)
    this.updateFocal()
  }

  /**
   * Returns node with minimum fHat.
   */
  private peekBestFHat (): EESNode<T> | undefined {
    return this.open.min()
    //return this.open.first()
  }

  /**
   * Returns node with minimum f.
   */
  private peekBestF (): EESNode<T> | undefined {
    return this.peekValidCleanup()
  }

  /**
   * Returns node with minimum dHat among focal nodes.
   */
  private peekBestDHat (): EESNode<T> | undefined {
    this.updateFocal()
    return this.peekValidFocal()
  }

  /**
   * Remove and return best-dHat.
   */
  private popBestDHat (): EESNode<T> | undefined {
    this.updateFocal()
    const node = this.popValidFocal()
    if (!node) return undefined
    this.removeFromSearch(node)
    return node
  }

  /**
   * Remove and return best-fHat.
   */
  private popBestFHat (): EESNode<T> | undefined {
    const node = this.open.min()
    //const node = this.open.first()
    if (!node) return undefined
    this.removeFromSearch(node)
    return node
  }

  /**
   * Remove and return best-f.
   */
  private popBestF (): EESNode<T> | undefined {
    const node = this.popValidCleanup()
    if (!node) return undefined
    this.removeFromSearch(node)
    return node
  }

  /**
   * Explicit removal (duplicate handling, etc.).
   */
  private removeNode (node: EESNode<T>): void {
    if (!node._open) return
    this.removeFromSearch(node)
  }

  private removeFromSearch (node: EESNode<T>): void {
    if (!node._open) return
    node._open = false
    this.open.remove(node)
    //this.open.delete(node)
    const current = this.nodes.get(node.item)
    if (current === node) this.nodes.delete(node.item);
    // Cleanup and focal use lazy deletion.
  }

  /**
   * Synchronize focal with `fHat <= w * best-fHat`
   */
  private updateFocal (): void {
    const bestFHat = this.open.min()
    //const bestFHat = this.open.first()

    if (!bestFHat) {
      // No more nodes, so the threshold is reset
      this.focalThreshold = -Infinity
      return
    }

    // Removal from focal is lazy, so we only need to add nodes.
    const newThreshold = this.weight * bestFHat.fHat
    if (newThreshold <= this.focalThreshold) return

    /**
     * Visit the range of open newly admitted into focal.
     * (focalThreshold, newThreshold]
     */
    const newlyEligible = this.open.range(this.focalThreshold, newThreshold)
    /*const newlyEligible = this.open.rangeSearch([{
      fHat: this.focalThreshold
    }, {
      fHat: newThreshold
    }] as any)*/

    for (const node of newlyEligible) {
      if (!node._open || node._inFocal) continue
      node._inFocal = true
      this.focal.insert(node, node.dHat)
    }

    this.focalThreshold = newThreshold
  }

  private peekValidCleanup (): EESNode<T> | undefined {
    while (this.cleanup.size > 0) {
      const node = this.cleanup.peek()!
      if (node._open) return node
      this.cleanup.pop()
    }
    return undefined
  }

  private popValidCleanup (): EESNode<T> | undefined {
    while (this.cleanup.size > 0) {
      const node = this.cleanup.pop()!
      if (node._open) return node
    }
    return undefined
  }

  private peekValidFocal(): EESNode<T> | undefined {
    while (this.focal.size > 0) {
      const node = this.focal.peek()!
      if (node._open) return node
      this.focal.pop()
    }
    return undefined;
  }

  private popValidFocal(): EESNode<T> | undefined {
    while (this.focal.size > 0) {
      const node = this.focal.pop()!
      if (node._open) return node;
    }
    return undefined
  }

  insert (item: T, g: number, h: number, hHat: number, dHat: number): boolean {
    if (this.nodes.has(item)) {
      const existing = this.nodes.get(item)!
      if (g >= existing.g) return false
      this.removeNode(existing)
    }
    this.insertNode(new EESNode(item, g, h, hHat, dHat))
    return true
  }

  pop (): T | undefined {
    const bestCleanup = this.peekBestF()
    if (bestCleanup == null) return undefined

    const bestFocal = this.peekBestDHat()
    const bestOpen = this.peekBestFHat()

    if (bestOpen == null) return undefined

    if (bestFocal != null && bestFocal.fHat <= this.weight * bestCleanup.f) {
      return this.popBestDHat()?.item
    } else if (bestOpen.fHat <= this.weight * bestCleanup.f) {
      return this.popBestFHat()?.item
    } else {
      return this.popBestF()?.item
    }
  }
}

/**
 * @todo finish implementation
 */
export const explicitEstimationSearch2: Algorithm = function * (
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
  const openSet = new EESQueue<Vertex>(epsilon)
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

explicitEstimationSearch2.availableOpts = new Set(['epsilon'])
explicitEstimationSearch2.availableServices = new Set([
  Cost,
  Heuristic,
  InadmissibleHeuristic,
  InadmissibleActionEstimate
])
