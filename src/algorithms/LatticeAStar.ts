import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import type { InstanceRegistry } from '../Registry'
import type { SearchDomain } from '../graph/Graph'

import { Cost } from '../services/Cost'
import { InadmissibleHeuristic } from '../services/Heuristic'
import { BinaryHeap } from '../ds/BinaryHeap'

class SearchNode<S> {
  public readonly vertex: S
  public children = new Set<SearchNode<S>>()
  public parents = new Set<SearchNode<S>>()
  public heuristic: number | undefined
  private expandState = false
  public bestChild: SearchNode<S> | undefined
  public bestChildTotalCost: number | undefined
  public costs = new Map<SearchNode<S>, number>()

  constructor (vertex: S) {
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

  getEdgeCost (graph: SearchDomain<S>, costGetter: Cost<S>, child: SearchNode<S>): number {
    if (!this.costs.has(child)) {
      this.costs.set(child, costGetter.get(graph,
        this.vertex,
        child.vertex
      ))
    }

    return this.costs.get(child) as number
  }
}

function reconstructPath<S> (sourceNode: SearchNode<S>): S[] {
  const path = [sourceNode.vertex]
  let node = sourceNode
  while (node.bestChild != null) {
    node = node.bestChild
    path.unshift(node.vertex)
  }
  return path
}

export const latticeAStar: Algorithm = function * <S> (
  graph: SearchDomain<S>,
  services: InstanceRegistry<SearchService<S>>,
  source: S,
  goal: S,
  opts: { [key: string]: any } = {}
): Generator<AlgorithmResult<S>, undefined, void> {
  const h = services.get(InadmissibleHeuristic) as InadmissibleHeuristic<S>
  const g = services.get(Cost) as Cost<S>
  const openSet = new BinaryHeap<SearchNode<S>>()
  const nodes = new Map<S, SearchNode<S>>()
  
  let bestSolutionCost = Infinity

  function addToOpenSet (node: SearchNode<S>): void {
    if (!node.getExpandState()) {
      if (node.heuristic == null) {
        node.heuristic = h.get(graph, node.vertex, goal)
      }
      if (node.heuristic + node.getTotalCost() < bestSolutionCost) {
        node.setExpandState(true)
        openSet.insert(node, node.heuristic)
      }
    }
  }

  function addChild (parent: SearchNode<S>, child: SearchNode<S>): void {
    parent.children.add(child)
    child.parents.add(parent)

    const tentativeCost = parent.getEdgeCost(graph, g, child) + child.getTotalCost()
    if (parent.bestChildTotalCost == null || tentativeCost < parent.bestChildTotalCost) {
      parent.bestChildTotalCost = tentativeCost
      parent.bestChild = child
      propagateCostChange(parent)
    }
  }

  function propagateCostChange (node: SearchNode<S>): void {
    const totalNodeCost = node.getTotalCost()
    for (const parent of node.parents) {
      const tentativeCost = parent.getEdgeCost(graph, g, node) + totalNodeCost
      if (parent.bestChildTotalCost == null || tentativeCost < parent.bestChildTotalCost) {
        parent.bestChildTotalCost = tentativeCost
        parent.bestChild = node
        propagateCostChange(parent)
        addToOpenSet(parent)
      }
    }
  }

  const goalNode = new SearchNode<S>(goal)
  nodes.set(goal, goalNode)
  goalNode.bestChildTotalCost = Infinity

  const sourceNode = new SearchNode<S>(source)
  nodes.set(source, sourceNode)
  sourceNode.bestChildTotalCost = 0
  addToOpenSet(sourceNode)

  let nodesGenerated = 2
  let nodesExpanded = 0

  while (openSet.size > 0) {
    const node = openSet.pop() as SearchNode<S>
    node.setExpandState(false)
    nodesExpanded++
    for (const nextVertex of graph.successors(node.vertex)) {
      if (!nodes.has(nextVertex)) {
        nodesGenerated++
        const nextNode = new SearchNode<S>(nextVertex)
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
        const nextNode = nodes.get(nextVertex) as SearchNode<S>
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
latticeAStar.availableServices = new Set([Cost, InadmissibleHeuristic])
