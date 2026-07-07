import { manhattanDistance } from "../services/misc"
import type { SearchDomain } from "./Graph"
import type { Point } from "./GridGraph"

export interface VacuumState {
  readonly robotPosition: number // Index
  readonly remaining: number // Bit mask
}

export class VacuumWorld implements SearchDomain<VacuumState> {
  width: number
  height: number
  passable: boolean[]
  dirtPositions: number[]
  dirtAt = new Map<number, number>()

  private seenStates = new Map<string, VacuumState>()
  private cardinalOffsets: number[]

  getIndex (x: number, y: number): number {
    return y * this.width + x
  }

  getPosition (index: number): Point {
    const y = Math.floor(index / this.width)
    const x = index % this.width
    return [x, y]
  }

  addDirt (dirtIndex: number, x:number, y: number): void {
    const pointIndex = this.getIndex(x, y)
    this.dirtPositions[dirtIndex] = pointIndex
    this.dirtAt.set(pointIndex, dirtIndex)
  }

  constructor (width: number, height: number) {
    this.width = width
    this.height = height
    this.passable = new Array(width * height).fill(true)
    this.dirtPositions = []

    this.cardinalOffsets = [
      -1, // left
      1, // right
      width, // down
      -width // up
    ]
  }

  successors (state: VacuumState): Iterable<VacuumState> {
    const result: VacuumState[] = []

    // Already complete
    if (state.robotPosition === -1) return []

    // Movement
    for (const offset of this.cardinalOffsets) {
      const nextPosition = state.robotPosition + offset
      if (this.passable[nextPosition]!) {
        result.push({
          robotPosition: nextPosition,
          remaining: state.remaining
        })
      }
    }

    // Cleaning
    const dirt = this.dirtAt.has(state.robotPosition)
      ? this.dirtAt.get(state.robotPosition)!
      : null

    if (dirt != null && ((state.remaining >> dirt) & 1) !== 0) {
      const nextRemaining = state.remaining & ~(1 << dirt)
      result.push({
        robotPosition: nextRemaining > 0 ? state.robotPosition : -1,
        remaining: nextRemaining
      })
    }

    return result
  }

  private getStateKey (state: VacuumState): string {
    return `${state.robotPosition},${state.remaining}`
  }

  normalize (state: VacuumState): VacuumState {
    const key = this.getStateKey(state)
    if (!this.seenStates.has(key)) {
      this.seenStates.set(key, state)
    }
    return this.seenStates.get(key)!
  }

  getMst (pointIndices: readonly number[]): number[] {
    const n = pointIndices.length
    if (n <= 1) return []

    // Cache positions so they are only looked up once.
    const positions = pointIndices.map(i => this.getPosition(i))

    const inTree = new Array<boolean>(n).fill(false)
    const bestDist = new Array<number>(n).fill(Infinity)
    const parent = new Array<number>(n).fill(-1)

    bestDist[0] = 0

    for (let iter = 0; iter < n; iter++) {
      // Find the unvisited vertex with the smallest connection cost.
      let u = -1
      let minDist = Infinity

      for (let i = 0; i < n; i++) {
        if (!inTree[i]! && bestDist[i]! < minDist) {
          minDist = bestDist[i]!
          u = i
        }
      }

      if (u === -1) break
      inTree[u] = true
      const posU = positions[u]!

      // Update distances to remaining vertices.
      for (let v = 0; v < n; v++) {
        if (inTree[v]!) continue
        const d = manhattanDistance(posU, positions[v]!)
        if (d < bestDist[v]!) {
          bestDist[v] = d
          parent[v] = u
        }
      }
    }

    const mst: number[] = []
    for (let v = 1; v < n; v++) {
      mst.push(bestDist[v]!)
    }
    return mst
  }
}