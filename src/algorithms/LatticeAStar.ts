import type { Algorithm, SearchService } from '../Algorithm'
import { Graph, Vertex } from '../Graph'
import type { InstanceRegistry } from '../Registry'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { BinaryHeap } from '../ds/BinaryHeap'
import { reconstructPath } from '../services/misc'

/**
 * Note that the lattice is reversed, so it starts at the goal of the search.
 */
class LatticeNode {
  public readonly parents: LatticeNode[] = []
  // public readonly children: LatticeNode[] = []
  public readonly children = new Map<LatticeNode, number>()
  public readonly vertex: Vertex
  public willExpand: boolean = true

  // private readonly _costCache: number | null = null
  public bestChildTotalCost: number | null = null
  private bestChild: LatticeNode | null = null

  public h: number | null = null
  public g: number | null = null

  constructor (vertex: Vertex) {
    this.vertex = vertex
  }

  get totalCost (): number {
    const ownCost = this.getOwnCost()
    return ownCost + this.getBestChildTotalCost()
  }

  private getOwnCost (): number {
    if (this.bestChild == null) {
      return 0
    } else {
      return this.children.get(this.getBestChild() as LatticeNode) as number
    }
  }

  private getBestChild (): LatticeNode | null { return this.bestChild }

  /**
   * @returns a list of dirty nodes that may need to be re-added to the open
   * set.
   */
  addChild (node: LatticeNode, segmentCost: number): LatticeNode[] {
    const dirtyNodes: LatticeNode[] = []
    this.children.set(node, segmentCost)
    const newChildTotalCost = node.totalCost
    if (this.bestChildTotalCost == null || this.bestChildTotalCost > newChildTotalCost) {
      this.bestChildTotalCost = newChildTotalCost
      this.bestChild = node
      this.propagateCostChange(dirtyNodes)
    }
    node.parents.push(this)
    return dirtyNodes
  }

  private propagateCostChange (dirtyNodes: LatticeNode[]): void {
    const totalNodeCost = this.totalCost
    for (const parent of this.parents) {
      if (parent.bestChildTotalCost as number > totalNodeCost) {
        parent.bestChildTotalCost = totalNodeCost
        parent.bestChild = this
        parent.propagateCostChange(dirtyNodes)
        dirtyNodes.push(this)
      }
    }
  }

  getBestChildTotalCost (): number {
    return this.bestChildTotalCost == null ? 0 : this.bestChildTotalCost
  }

  /**
   * Clears memory by allowing irrelevant parts of the lattice to be garbage
   * collected.
   */
  clean (): void {
    const bestChild = this.getBestChild()
    if (bestChild != null) {
      this.children.clear()
      bestChild.clean()
    }
  }
}

export const latticeAStar: Algorithm = function * (
  graph: Graph,
  services: InstanceRegistry<SearchService>,
  source: Vertex,
  goal: Vertex,
  opts: { [key: string]: any } = {}
): Generator<Vertex[], undefined, void> {
  const h = services.get(Heuristic)
  const g = services.get(Cost)
  const gScores = new Map<Vertex, number>()
  const epsilon: number = opts['epsilon'] ?? 1

  const sourceNode = new LatticeNode(source)
  sourceNode.willExpand = true

  const goalNode = new LatticeNode(goal)
  goalNode.willExpand = true
  goalNode.bestChildTotalCost = Infinity

  // const latticeNodes = new Map<Vertex, LatticeNode>()
  const openSet = new BinaryHeap<LatticeNode>()

  function addToOpen (node: LatticeNode): void {
    const vertex = node.vertex
    if (!node.willExpand) {
      if (node.h == null) node.h = epsilon * h.get(graph, vertex.x, vertex.y, goal.x, goal.y)
      if (node.h + node.totalCost < goalNode.totalCost) {
        node.willExpand = true
        openSet.insert(node, node.h)
      }
    }
  }

  openSet.insert(sourceNode, epsilon * h.get(graph, source.x, source.y, goal.x, goal.y))
  gScores.set(source, 0)

  while (openSet.size > 0) {
    const node = openSet.pop() as LatticeNode
    const vertex = node.vertex
    const currentCost = gScores.get(vertex) as number

    /* if (node.vertex === goal) {
      yield reconstructPath(cameFrom, goal)
    } else { */
    for (const nextVertex of vertex.neighbors) {
      if (!latticeNodes.has(nextVertex)) latticeNodes.set(nextVertex, new LatticeNode(nextVertex))
      const nextNode = latticeNodes.get(nextVertex) as LatticeNode
      const tentativeCost = currentCost + g.get(graph, vertex.x, vertex.y, nextVertex.x, nextVertex.y)

      /* if (!gScores.has(nextVertex) || gScores.get(nextVertex) as number > tentativeCost) {
          gScores.set(nextVertex, tentativeCost)
          cameFrom.set(nextVertex, vertex)
          openSet.insert(nextVertex, tentativeCost + epsilon * h.get(graph, nextVertex.x, nextVertex.y, goal.x, goal.y))
        } */
      // }
    }
  }
}

latticeAStar.availableOpts = new Set(['epsilon'])
