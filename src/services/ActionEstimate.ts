import type { GridGraph } from '../graph/GridGraph'
import { chebyshevDistance, euclideanDistance, manhattanDistance } from './misc'

type ActionEstimateCallback = (graph: GridGraph, x1: number, y1: number, x2: number, y2: number) => number

export class ActionEstimate {
  public readonly get: ActionEstimateCallback
  public readonly name: string

  constructor (cb: ActionEstimateCallback, name: string) {
    this.get = cb
    this.name = name
  }
}

export const chebyshevActionEstimate = new ActionEstimate((_, ...args) => chebyshevDistance(...args), 'chebyshev')
export const manhattanActionEstimate = new ActionEstimate((_, ...args) => manhattanDistance(...args), 'manhattan')
export const euclideanActionEstimate = new ActionEstimate((_, ...args) => euclideanDistance(...args), 'euclidean')

export function getWeightedActionEstimate (weight: number, actionEstimate: ActionEstimate): ActionEstimate {
  const cb: ActionEstimateCallback = (...args) => weight * actionEstimate.get(...args)
  return new ActionEstimate(cb, `${actionEstimate.name}(${weight})`)
}

export class InadmissibleActionEstimate extends ActionEstimate {}
