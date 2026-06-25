/*export interface Vertex {
  value: string
  getNeighbors (): Vertex[]
}

export class Graph {
  private readonly vertices = new Map<string, Vertex>()

  addVertex (key: string, vertex: Vertex): void {
    this.vertices.set(key, vertex)
  }

  getVertex (key: string): Vertex | undefined {
    return this.vertices.get(key)
  }

  hasVertex (key: string): boolean {
    return this.vertices.has(key)
  }
}
*/

type HeuristicCallback<S> = (domain: SearchDomain<S>, state: S) => number
type CostCallback<S> = (domain: SearchDomain<S>, state: S) => number
type ActionEstimateCallback<S> = (domain: SearchDomain<S>, state: S) => number

interface Successor<S> {
  state: S
  cost: number
}

interface SearchDomain<S> {
  successors (state: S): Iterable<Successor<S>>
  isGoal (state: S): boolean
  key (state: S): string
}