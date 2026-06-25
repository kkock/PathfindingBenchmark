export class GridVertex {
  public readonly neighbors: GridVertex[] = []
  public readonly x: number
  public readonly y: number
  public value: string

  constructor (x: number, y: number, value: string) {
    this.value = value
    this.x = x
    this.y = y
  }

  addNeighbor (neighbor: GridVertex): void {
    this.neighbors.push(neighbor)
  }

  getNeighbors (): GridVertex[] {
    return this.neighbors
  }
}

export class GridGraph {
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
}