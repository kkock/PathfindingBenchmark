import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { Graph, Vertex } from '../Graph'
import type { InstanceRegistry } from '../Registry'

import { Cost } from '../services/Cost'
import { Heuristic } from '../services/Heuristic'
import { BinaryHeap } from '../ds/BinaryHeap'

class SearchNode {
  public readonly vertex: Vertex
  public children = new Set<SearchNode>()
  public parents  = new Set<SearchNode>()
  public heuristic: number  | undefined
  private expandState = false
  public bestChild: SearchNode | undefined
  public bestChildTotalCost: number | undefined
  public costs = new Map<SearchNode, number>()

  constructor (vertex: Vertex) {
    this.vertex = vertex
  }

  setExpandState (expandState: boolean): void {
    this.expandState = expandState
  }

  getExpandState (): boolean {
    return this.expandState
  }

  getBestChildTotalCost (): number {
    return this.bestChildTotalCost == null ? 0 : this.bestChildTotalCost
  }

  getTotalCost (): number {
    return this.bestChildTotalCost ?? Infinity
  }

  getEdgeCost (graph: Graph, costGetter: Cost, child: SearchNode): number  {
    if (!this.costs.has(child)) {
      this.costs.set(child, costGetter.get(graph,
          this.vertex.x,
          this.vertex.y,
          child.vertex.x,
          child.vertex.y
      ))
    }

    return this.costs.get(child) as number 
  }
}

function reconstructPath (sourceNode: SearchNode): Vertex[] {
  const path = [sourceNode.vertex]
  let node = sourceNode
  while (node.bestChild != null) {
    node = node.bestChild
    path.unshift(node.vertex)
  }
  return path
}

export const latticeAStar: Algorithm = function * (
  graph: Graph,
  services: InstanceRegistry<SearchService>,
  source: Vertex,
  goal: Vertex,
  opts: { [key: string]: any } = {}
): Generator<AlgorithmResult, undefined, void> {
  const h = services.get(Heuristic)
  const g = services.get(Cost)
  const openSet = new BinaryHeap<SearchNode>()
  const nodes = new Map<Vertex, SearchNode>()
  let bestSolutionCost = Infinity

  function addToOpenSet (node: SearchNode) {
    if (!node.getExpandState()) {
      if (node.heuristic == null) {
        node.heuristic = h.get(graph, node.vertex.x, node.vertex.y, goal.x, goal.y)
      }
      if (node.heuristic + node.getTotalCost() < bestSolutionCost) {
        node.setExpandState(true);
        openSet.insert(node, node.heuristic);
      }
    }
  }

  function addChild (parent: SearchNode, child: SearchNode):void {
    parent.children.add(child)
    child.parents.add(parent)

    let tentativeCost = parent.getEdgeCost(graph, g, child) + child.getTotalCost()
    if (parent.bestChildTotalCost == null || tentativeCost < parent.bestChildTotalCost) {
      parent.bestChildTotalCost = tentativeCost
      parent.bestChild = child
      propagateCostChange(parent)
    }
  }

  function propagateCostChange (node: SearchNode) {
    let totalNodeCost = node.getTotalCost()
    for (const parent of node.parents) {
      let tentativeCost = parent.getEdgeCost(graph, g, node) + totalNodeCost
      if (parent.bestChildTotalCost == null || tentativeCost < parent.bestChildTotalCost) {
        parent.bestChildTotalCost = tentativeCost
        parent.bestChild = node
        propagateCostChange(parent)
        addToOpenSet(parent)
      }
    }
  }

  const goalNode = new SearchNode(goal)
  nodes.set(goal, goalNode)
  goalNode.bestChildTotalCost = Infinity

  const sourceNode = new SearchNode(source)
  nodes.set(source, sourceNode)
  sourceNode.bestChildTotalCost = 0
  addToOpenSet(sourceNode)

  let nodesGenerated = 2
  let nodesExpanded = 0

  while (openSet.size > 0) {
    const node = openSet.pop() as SearchNode
    node.setExpandState(false)
    nodesExpanded++
    for (const nextVertex of node.vertex.neighbors) {
      if (!nodes.has(nextVertex)) {
        nodesGenerated++
        const nextNode = new SearchNode(nextVertex)
        nodes.set(nextVertex, nextNode)
        nextNode.setExpandState(true)
        addChild(nextNode, node)
        if (nextNode === goalNode) {
          const goalCost = nextNode.getTotalCost()
          if (goalCost < bestSolutionCost) {
            bestSolutionCost = goalCost
            yield {
              path: reconstructPath(goalNode),
              searchMetrics: { nodesExpanded, nodesGenerated }
            }
          }
        } else {
          nextNode.setExpandState(false)
          addToOpenSet(nextNode)
        }
      } else {
        const nextNode = nodes.get(nextVertex) as SearchNode
        addChild(nextNode, node)
        if (nextNode === goalNode) {
          const goalCost = nextNode.getTotalCost()
          if (goalCost < bestSolutionCost) {
            bestSolutionCost = goalCost
            yield {
              path: reconstructPath(goalNode),
              searchMetrics: { nodesExpanded, nodesGenerated }
            }
          }
        }
      }
    }
  }
}

latticeAStar.availableOpts = new Set([])
