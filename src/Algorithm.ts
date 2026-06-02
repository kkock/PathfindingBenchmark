import type { Graph } from './Graph'
import type { Path } from './Path'
import { InstanceRegistry } from './Registry'

export type SearchService = any

export type Algorithm = (graph: Graph, services: InstanceRegistry<SearchService>) => Generator<Path, undefined, void>
