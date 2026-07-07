import type { SearchDomain } from '../graph/Graph'
import type { Point } from '../graph/GridGraph'
import { euclideanDistance } from './misc'

type HeuristicCallback<S> = (graph: SearchDomain<S>, state1: S, state2: S) => number

export class Heuristic<S> {
  public readonly get: HeuristicCallback<S>
  public readonly name: string

  constructor (cb: HeuristicCallback<S>, name: string) {
    this.get = cb
    this.name = name
  }
}

export const euclideanHeuristic = new Heuristic<Point>((_, ...args) => euclideanDistance(...args), 'euclidean')

export function getWeightedHeuristic<S> (weight: number, heuristic: Heuristic<S>): Heuristic<S> {
  const cb: HeuristicCallback<S> = (...args) => weight * heuristic.get(...args)
  return new Heuristic<S>(cb, `${heuristic.name}(${weight})`)
}

export class InadmissibleHeuristic<S> extends Heuristic<S> {}
