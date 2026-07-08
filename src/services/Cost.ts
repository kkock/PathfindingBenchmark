import type { SearchDomain } from '../graph/Graph'
import { GridGraph, Point, type GridVertex } from '../graph/GridGraph'
import { VacuumState, VacuumWorld } from '../graph/VacuumWorldGraph'
import { type ClassOf, countSetBits, euclideanDistance } from './misc'

type CostCallback<
  S,
  G extends SearchDomain<S> = SearchDomain<S>
> = (graph: G, state1: S, state2: S) => number

export class Cost<
  S,
  G extends SearchDomain<S> = SearchDomain<S>
> {
  public readonly get: CostCallback<S, G>
  public readonly name: string
  public readonly Domain: ClassOf<G>

  constructor (cb: CostCallback<S, G>, name: string, Domain: ClassOf<G>) {
    this.get = cb
    this.name = name
    this.Domain = Domain
  }
}

/**
 * MovingAI defines movement costs to be 1 for orthogonal movements, sqrt2 for
 * diagonal movements, and infinity otherwise.
 * This benchmark calculates valid neighbors ahead of time so using euclidean
 * distance is satisfactory here.
 */
export const euclideanCost = new Cost<Point>((_, ...args) => euclideanDistance(...args), 'euclidean', GridGraph)

/**
 * Guards cost takes the amount of guards that see a tile (encoded as a
 * base-36 integer), and takes that power of two as the base tile cost.
 * The cost to move between two tiles is the average of both tiles, or,
 * if the movement is diagonal, of all 4 tiles neighboring the grid
 * corner the movement passes over, multiplied by the distance.
 * Impassable tiles are `@` in guards, but since valid neighbors are
 * calculated ahead of time, no cost call should ever result in `NaN`.
 * @see https://github.com/Sajjad-moghadam/Guards
 */
export const guardsCost = new Cost<Point, GridGraph>((graph: GridGraph, [x1, y1], [x2, y2]) => {
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

  return euclideanDistance([x1, y1], [x2, y2]) * (vertices as GridVertex[]).reduce((acc, vertex, _, a) => acc + (2 ** parseInt(vertex.value, 36)) / a.length, 0)
}, 'euclidean-guards', GridGraph)

export function getWeightedCost<S> (weight: number, cost: Cost<S>): Cost<S> {
  const cb: CostCallback<S> = (...args) => weight * cost.get(...args)
  return new Cost(cb, `${cost.name}(${weight})`, cost.Domain)
}

export const unitCost = new Cost<any>(() => 1, 'unit', Object as any)

export const heavyVacuumCost = new Cost<VacuumState, VacuumWorld>((graph, state1, state2) => {
  const maxDirtPileCount = graph.dirtPositions.length
  const setBits = countSetBits(state1.remaining)
  const robotWeight = maxDirtPileCount - setBits

  return 1 + robotWeight
}, 'vacuum-heavy', VacuumWorld)

export class ApproximateCost<S> extends Cost<S> {}
