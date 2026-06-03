import type { Graph, Vertex } from './Graph'
import type { InstanceRegistry } from './Registry'

export type SearchService = any

export type Algorithm = { availableOpts: Set<string> } & (
  (
    graph: Graph,
    services: InstanceRegistry<SearchService>,
    source: Vertex,
    goal: Vertex,
    opts?: { [key: string]: any }
  ) => Generator<Vertex[], undefined, void>
)
