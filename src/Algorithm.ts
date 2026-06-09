import type { Graph, Vertex } from './Graph'
import type { InstanceRegistry } from './Registry'

export type SearchService = any

export interface AlgorithmResult {
  path: Vertex[],
  searchMetrics: {
    nodesGenerated: number
    nodesExpanded: number
  }
}

export type Algorithm = { availableOpts: Set<string> } & (
  (
    graph: Graph,
    services: InstanceRegistry<SearchService>,
    source: Vertex,
    goal: Vertex,
    opts?: { [key: string]: any }
  ) => Generator<AlgorithmResult, undefined, void>
)

