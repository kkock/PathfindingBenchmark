import type { SearchDomain } from "./Graph"

export type Point = [x: number, y: number]

export class GridVertex {
  public readonly point: Point
  public readonly neighbors: GridVertex[] = []
  public value: string

  constructor (x: number, y: number, value: string) {
    this.point = [x, y]
    this.value = value
  }

  addNeighbor (neighbor: GridVertex): void {
    this.neighbors.push(neighbor)
  }
}

export class GridGraph extends Object implements SearchDomain<Point> {
  private readonly vertices = new Map<string, GridVertex>()

  addVertex (key: string, vertex: GridVertex): void {
    this.vertices.set(key, vertex)
  }

  getVertex (key: string): GridVertex | undefined {
    return this.vertices.get(key)
  }

  hasVertex (key: string): boolean {
    return this.vertices.has(key)
  }

  successors (state: Point): Iterable<Point> {
    const key = `${state[0]},${state[1]}`
    if (this.hasVertex(key)) {
      return this.getVertex(key)!.neighbors.map(vertex => vertex.point)
    } else {
      return []
    }
  }

  normalize (state: Point): Point {
    const key = `${state[0]},${state[1]}`
    if (!this.hasVertex(key)) throw new Error(`State '${key}' does not exist on graph`)
    return this.getVertex(key)!.point
  }
}