import type { SearchDomain } from './graph/Graph'
import type { ClassType, InstanceRegistry } from './Registry'
import type { Cost } from './services/Cost'
import type { Heuristic } from './services/Heuristic'

export type SearchService<S> = Cost<S> | Heuristic<S>

export interface AlgorithmResult<S> {
  path: S[]
  searchMetrics: {
    nodesGenerated: number
    nodesExpanded: number
  }
}

export type Algorithm<S = unknown> = {
  availableOpts: Set<string>
  availableServices: Set<ClassType<SearchService<S>>>
} & (
  <S>(
    graph: SearchDomain<S>,
    services: InstanceRegistry<SearchService<S>>,
    source: S,
    goal: S,
    opts?: { [key: string]: any }
  ) => Generator<AlgorithmResult<S>, undefined, void>
)
