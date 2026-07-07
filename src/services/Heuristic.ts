import type { SearchDomain } from '../graph/Graph'
import type { Point } from '../graph/GridGraph'
import type { VacuumState, VacuumWorld } from '../graph/VacuumWorldGraph'
import { euclideanDistance } from './misc'

type HeuristicCallback<
  S,
  G extends SearchDomain<S> = SearchDomain<S>
> = (graph: G, state1: S, state2: S) => number

export class Heuristic<
  S,
  G extends SearchDomain<S> = SearchDomain<S>
> {
  public readonly get: HeuristicCallback<S, G>
  public readonly name: string

  constructor (cb: HeuristicCallback<S, G>, name: string) {
    this.get = cb
    this.name = name
  }
}

export const euclideanHeuristic = new Heuristic<Point>((_, ...args) => euclideanDistance(...args), 'euclidean')

export function getWeightedHeuristic<S> (weight: number, heuristic: Heuristic<S>): Heuristic<S> {
  const cb: HeuristicCallback<S> = (...args) => weight * heuristic.get(...args)
  return new Heuristic<S>(cb, `${heuristic.name}(${weight})`)
}

export const vacuumHeuristic = new Heuristic<VacuumState, VacuumWorld>((graph, state1, _) => {
  const points = [state1.robotPosition]
  for (let i = 0; i < graph.dirtPositions.length; ++i) {
    if (((state1.remaining >> i) & 1) !== 0) {
      points.push(graph.dirtPositions[i]!)
    }
  }

  const mst = graph.getMst(points)
  return mst.reduce((a, b) => a + b)
}, 'vacuum')

export class InadmissibleHeuristic<S> extends Heuristic<S> {}
