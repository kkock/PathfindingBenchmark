import type { Graph } from '../graph/Graph'
import { euclideanDistance } from './misc'

type HeuristicCallback = (graph: Graph, x1: number, y1: number, x2: number, y2: number) => number

export class Heuristic {
  public readonly get: HeuristicCallback
  public readonly name: string

  constructor (cb: HeuristicCallback, name: string) {
    this.get = cb
    this.name = name
  }
}

export const euclideanHeuristic = new Heuristic((_, ...args) => euclideanDistance(...args), 'euclidean')

export function getWeightedHeuristic (weight: number, heuristic: Heuristic): Heuristic {
  const cb: HeuristicCallback = (...args) => weight * heuristic.get(...args)
  return new Heuristic(cb, `${heuristic.name}(${weight})`)
}

export class InadmissibleHeuristic extends Heuristic {}
