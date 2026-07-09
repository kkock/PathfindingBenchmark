import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { InstanceRegistry } from '../Registry'
import type { SearchDomain } from '../graph/Graph'

import { Cost } from '../services/Cost'
import { Heuristic, InadmissibleHeuristic } from '../services/Heuristic'
import { KeyedBinaryHeap } from '../ds/KeyedBinaryHeap'
import { reconstructPath } from '../services/misc'
import { ActionEstimate, InadmissibleActionEstimate } from '../services/ActionEstimate'
import { RedBlackTree } from '../ds/RedBlackTree2'
//import { appendFileSync } from 'node:fs'

//import {TreeMultiSet} from 'data-structure-typed';

let i=0
//let focalCnt = 0
//let openCnt = 0
//let cleanupCnt = 0

export class EESNode<T> {
  item: T

  //f: number
  g: number
  h: number
  d: number
  //fHat: number
  //dHat: number

  _open?: boolean
  _inFocal?: boolean

  depth: number
  meanHError: number
  meanDError: number

  //constructor (item: T, g: number, h: number, hHat: number, dHat: number) {
  constructor (
    item: T,
    g: number, h: number,d: number,
    depth: number, meanHError: number, meanDError: number
  ) {
    //console.log({ item, g, h, d, depth, meanHError, meanDError })
    this.item = item
    this.g = g
    this.h = h
    this.d = d
    this.depth = depth
    this.meanHError = meanHError
    this.meanDError = meanDError
  }

  get dHat (): number {
    const denom = Math.max(0.1, 1 - this.meanDError)
    return this.d / denom
  }

  get hHat (): number {
    return this.h + this.dHat * this.meanHError
  }

  get f (): number {
    return this.g + this.h
  }

  get fHat (): number {
    return this.g + this.hHat
  }
}

export class EESQueue<T> {
  debug () {
    return {
      focal: this.focal.size,
      open: this.open.size,
      cleanup: this.cleanup.size,
    }
  }

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
    const best = this.open.min()

    if (best != null && node.fHat <= this.weight * best.fHat) {
      node._inFocal = true
      this.focal.insert(node, node.dHat)
    }
    this.updateFocal()
    /*console.log({
      focal:this.focal.size,
      open:this.open.size,
      cleanup:this.cleanup.size,
    })*/
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

  private removeFromSearch(node: EESNode<T>): void {
    if (!node._open) return

    node._open = false

    this.open.remove(node)

    if (node._inFocal) {
      node._inFocal = false
      this.focal.remove(node)
    }

    this.cleanup.remove(node)

    const current = this.nodes.get(node.item)
    if (current === node) {
      this.nodes.delete(node.item)
    }
  }

  /**
   * Synchronize focal with `fHat <= w * best-fHat`
   */
  private updateFocal(): void {
    const best = this.open.min()

    if (best == null) {
      this.focal.clear()
      this.focalThreshold = -Infinity
      return
    }

    const newThreshold = this.weight * best.fHat

    if (newThreshold > this.focalThreshold) {
      // Add newly eligible nodes.
      for (const node of this.open.range(this.focalThreshold, newThreshold)) {
        if (!node._inFocal) {
          node._inFocal = true
          this.focal.insert(node, node.dHat)
        }
      }
    } else if (newThreshold < this.focalThreshold) {
      // Remove newly ineligible nodes.
      for (const node of this.open.range(newThreshold, this.focalThreshold)) {
        if (node._inFocal && node.fHat > newThreshold) {
          node._inFocal = false
          this.focal.remove(node)
        }
      }
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
    return undefined
  }

  private popValidFocal(): EESNode<T> | undefined {
    while (this.focal.size > 0) {
      const node = this.focal.pop()!
      if (node._open) return node
    }
    return undefined
  }

  /*insert (item: T, g: number, h: number, hHat: number, dHat: number): boolean {
    if (this.nodes.has(item)) {
      const existing = this.nodes.get(item)!
      if (g >= existing.g) return false
      this.removeNode(existing)
    }
    this.insertNode(new EESNode(item, g, h, hHat, dHat))
    return true
  }*/

  insert (node: EESNode<T>): boolean {
    if (this.nodes.has(node.item)) {
      const existing = this.nodes.get(node.item)!
      if (node.g >= existing.g) return false
      this.removeNode(existing)
    }
    this.insertNode(node)
    return true
  }

  pop (): EESNode<T> | undefined {
    const bestCleanup = this.peekBestF()
    if (bestCleanup == null) return undefined

    const bestFocal = this.peekBestDHat()
    const bestOpen = this.peekBestFHat()

    if (bestOpen == null) return undefined

    /*if (i++ % 1000 === 0) {
      console.log({
        bestFHat: bestOpen?.fHat,
        bestF: bestCleanup?.f,
        ratio: bestOpen?.fHat! / bestCleanup?.f!
      })
    }*/

    if (bestFocal != null && bestFocal.fHat <= this.weight * bestCleanup.f) {
      //focalCnt++
      return this.popBestDHat()
    } else if (bestOpen.fHat <= this.weight * bestCleanup.f) {
      //openCnt++
      return this.popBestFHat()
    } else {
      //cleanupCnt++
      return this.popBestF()
    }
  }
}

/**
 * @todo finish implementation
 * 
 * This implementation sort of works but performs nowhere near as well as the
 * paper found, so I expect I have made some rather glaring mistakes in this
 * implementation.
 */
export const explicitEstimationSearch: Algorithm = function * <S> (
  graph: SearchDomain<S>,
  services: InstanceRegistry<SearchService<S>>,
  source: S,
  goal: S,
  opts: { [key: string]: any } = {}
): Generator<AlgorithmResult<S>, undefined, void> {
  const h = services.get(Heuristic)
  const d = services.get(ActionEstimate)
  const g = services.get(Cost)
  const gScores = new Map<S, number>()
  const epsilon: number = opts['epsilon'] ?? 1

  const h0 = h.get(graph, source, goal)
  const d0 = d.get(graph, source, goal)

  const cameFrom = new Map<S, S>()
  const openSet = new EESQueue<S>(epsilon)
  openSet.insert(new EESNode<S>(source, 0, h0, d0, 0, 0, 0))
  gScores.set(source, 0)

  let nodesGenerated = 1
  let nodesExpanded = 0

  while (openSet.size > 0) {
    const node = openSet.pop()!
    const vertex = node.item
    const currentCost = gScores.get(vertex) as number
    nodesExpanded++

    /*if (i++ % 10_000 === 0) {
      console.log({
        d: node.d,
        dHat: node.dHat,
        meanDError: node.meanDError
      })
    }*/

    /*appendFileSync('./test.log', JSON.stringify({
      h: node.h,
      d: node.d,
      meanHError: node.meanHError,
      meanDError: node.meanDError,
      hHat: node.hHat,
      dHat: node.dHat,
      f: node.f,
      fHat: node.fHat,
    }) + '\n')*/

    if (vertex === goal) {
      /*console.log({
        focalCnt,
        openCnt,
        cleanupCnt
      })*/
      yield {
        path: reconstructPath(cameFrom, goal),
        searchMetrics: { nodesExpanded, nodesGenerated }
      }
      return
    }

    /*for (const nextVertex of vertex.neighbors) {
      const stepCost = g.get(graph, vertex.x, vertex.y, nextVertex.x, nextVertex.y)
      const tentativeCost = currentCost + stepCost

      if (!gScores.has(nextVertex) || gScores.get(nextVertex) as number > tentativeCost) {
        gScores.set(nextVertex, tentativeCost)
        cameFrom.set(nextVertex, vertex)

        
        const childH = h.get(graph, nextVertex.x, nextVertex.y, goal.x, goal.y)
        const childD = d.get(graph, nextVertex.x, nextVertex.y, goal.x, goal.y)

        const eh = stepCost + childH - node.h
        const ed = childD + 1 - node.d
        const childDepth = node.depth + 1
        const meanHError = (node.meanHError * node.depth + eh) / childDepth
        const meanDError = (node.meanDError * node.depth + ed) / childDepth

        openSet.insert(new EESNode(
          nextVertex,
          tentativeCost,
          childH,
          childD,
          childDepth,
          meanHError,
          meanDError
        ))

        nodesGenerated++
      }
    }*/

    const children = []

    let bestChildH = Infinity
    let bestChildD = Infinity
    let bestStepCost = 0

    for (const nextVertex of graph.successors(vertex)) {
      const stepCost = g.get(graph, vertex, nextVertex)
      const childH = h.get(graph, nextVertex, goal)
      const childD = d.get(graph, nextVertex, goal)
      const tentativeCost = currentCost + stepCost

      if (!gScores.has(nextVertex) || gScores.get(nextVertex) as number > tentativeCost) {
        children.push({
          nextVertex,
          stepCost,
          childH,
          childD,
          tentativeCost
        })
      }

      const value = stepCost + childH

      if (
        value < bestChildH + bestStepCost ||
        (Math.abs(value - (bestChildH + bestStepCost)) < 1e-5 && childD < bestChildD)
      ) {
        bestChildH = childH
        bestChildD = childD
        bestStepCost = stepCost
      }
    }

    const eh = bestStepCost + bestChildH - node.h
    const ed = bestChildD + 1 - node.d
    const childDepth = node.depth + 1
    const meanHError = (node.meanHError * node.depth + eh) / childDepth
    const meanDError = (node.meanDError * node.depth + ed) / childDepth

    for (const child of children) {
      gScores.set(child.nextVertex, child.tentativeCost)
      cameFrom.set(child.nextVertex, vertex)
      /*appendFileSync('./test2.log', JSON.stringify({
        h: node.h,
        tentativeCost: child.tentativeCost,
        childH: child.childH,
        childD: child.childD,
        childDepth: childDepth,
        meanHError: meanHError,
        meanDError: meanDError
      }) + '\n')*/

      const childNode = new EESNode(
        child.nextVertex,
        child.tentativeCost,
        child.childH,
        child.childD,
        childDepth,
        meanHError,
        meanDError
      )

      //console.log(childNode.f,childNode.fHat)
      

      openSet.insert(childNode)
      nodesGenerated++
    }
  }
}

explicitEstimationSearch.availableOpts = new Set(['epsilon'])
explicitEstimationSearch.availableServices = new Set([
  Cost,
  Heuristic,
  ActionEstimate
])
