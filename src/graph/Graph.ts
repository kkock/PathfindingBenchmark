export class Vertex {
  public readonly neighbors: Vertex[] = []
  public readonly x: number
  public readonly y: number
  public value: string

  constructor (x: number, y: number, value: string) {
    this.value = value
    this.x = x
    this.y = y
  }

  addNeighbor (neighbor: Vertex): void {
    this.neighbors.push(neighbor)
  }
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
