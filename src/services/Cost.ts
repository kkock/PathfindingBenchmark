import type { Graph, Vertex } from '../Graph'
import { euclideanDistance } from './misc'

type CostCallback = (graph: Graph, x1: number, y1: number, x2: number, y2: number) => number

export class Cost {
  public readonly get: CostCallback
  constructor (cb: CostCallback) { this.get = cb }
}

/**
 * MovingAI defines movement costs to be 1 for orthogonal movements, sqrt2 for
 * diagonal movements, and infinity otherwise.
 * This benchmark calculates valid neighbors ahead of time so using euclidean
 * distance is satisfactory here.
 */
export const euclideanCost = new Cost((_, ...args) => euclideanDistance(...args))

/**
 * Guards cost takes the amount of guards that see a tile (encoded as a
 * base-36 integer), and takes that power of two as the base tile cost.
 * The cost to move between two tiles is the average of both tiles, or,
 * if the movement is diagonal, of all 4 tiles neighboring the grid
 * corner the movement passes over, multiplied by the distance.
 * Impassable tiles are `@` in guards, but since valid neighbors are
 * calculated ahead of time, no cost call should ever result in `NaN`.
 */
export const guardsCost = new Cost((graph, x1, y1, x2, y2) => {
  const vertices = x1 === x2 || y1 === y2
    ? [
        graph.getVertex(`${x1},${y1}`),
        graph.getVertex(`${x2},${y2}`)
      ]
    : [
        graph.getVertex(`${x1},${y1}`),
        graph.getVertex(`${x1},${y2}`),
        graph.getVertex(`${x2},${y1}`),
        graph.getVertex(`${x2},${y2}`)
      ]

  return euclideanDistance(x1, y1, x2, y2) * (vertices as Vertex[]).reduce((acc, vertex, _, a) => acc + (2 ** parseInt(vertex.value, 36)) / a.length, 0)
})
