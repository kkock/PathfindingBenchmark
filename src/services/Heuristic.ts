import type { Graph } from '../Graph'
import { euclideanDistance } from './misc'

type HeuristicCallback = (graph: Graph, x1: number, y1: number, x2: number, y2: number) => number

export class Heuristic {
  public readonly get: HeuristicCallback
  constructor (cb: HeuristicCallback) { this.get = cb }
}

export const euclideanHeuristic = new Heuristic((_, ...args) => euclideanDistance(...args))

export function getWeightedHeuristic (weight: number, heuristic: Heuristic): Heuristic {
  const cb: HeuristicCallback = (...args) => weight * heuristic.get(...args)
  return new Heuristic(cb)
}
