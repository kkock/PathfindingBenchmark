export class Vertex {
  public readonly neighbors: Vertex[] = []

  addNeighbor (neighbor: Vertex): void {
    this.neighbors.push(neighbor)
  }
}

export class Graph {
  private readonly vertices: Vertex[] = []
}
