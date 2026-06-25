import type { Graph, Vertex } from './graph/Graph'
import type { ClassType, InstanceRegistry } from './Registry'
import type { Cost } from './services/Cost'
import type { Heuristic } from './services/Heuristic'

export type SearchService = Cost | Heuristic

export interface AlgorithmResult {
  path: Vertex[]
  searchMetrics: {
    nodesGenerated: number
    nodesExpanded: number
  }
}

export type Algorithm = {
  availableOpts: Set<string>
  availableServices: Set<ClassType<SearchService>>
} & (
  (
    graph: Graph,
    services: InstanceRegistry<SearchService>,
    source: Vertex,
    goal: Vertex,
    opts?: { [key: string]: any }
  ) => Generator<AlgorithmResult, undefined, void>
)
