import type { SearchDomain } from '../graph/Graph'
import type { GridGraph, Point } from '../graph/GridGraph'
import { VacuumState, VacuumWorld } from '../graph/VacuumWorldGraph'
import { chebyshevDistance, countSetBits, euclideanDistance, manhattanDistance } from './misc'

type ActionEstimateCallback<
  S,
  G extends SearchDomain<S> = SearchDomain<S>
> = (graph: G, state1: S, state2: S) => number

export class ActionEstimate<
  S,
  G extends SearchDomain<S> = SearchDomain<S>
> {
  private readonly cb: ActionEstimateCallback<S, G>
  public readonly name: string

  constructor (cb: ActionEstimateCallback<S, G>, name: string) {
    this.cb = cb
    this.name = name
  }

  get (graph: G, state1: S, state2: S) {
    return this.cb.apply(this, [graph, state1, state2])
  }
}

export const chebyshevActionEstimate = new ActionEstimate<Point>((_, ...args) => chebyshevDistance(...args), 'chebyshev')
export const manhattanActionEstimate = new ActionEstimate<Point>((_, ...args) => manhattanDistance(...args), 'manhattan')
export const euclideanActionEstimate = new ActionEstimate<Point>((_, ...args) => euclideanDistance(...args), 'euclidean')

export function getWeightedActionEstimate<S> (weight: number, actionEstimate: ActionEstimate<S>): ActionEstimate<S> {
  const cb: ActionEstimateCallback<S> = (...args) => weight * actionEstimate.get(...args)
  return new ActionEstimate(cb, `${actionEstimate.name}(${weight})`)
}

/**
 * Estimates the cost of a greedy traversal of dirt piles.
 */
export const vacuumActionEstimate = new ActionEstimate<VacuumState, VacuumWorld>(function (this: ActionEstimate<VacuumState, VacuumWorld>, graph, state1, _) {
  if (state1.remaining === 0) return 0

  let bestPile = -1
  let bestPileDist = Infinity
  for (let i = 0; i < graph.dirtPositions.length; ++i) {
    if (((state1.remaining >> i) & 1) !== 0) {
      const dist = manhattanDistance(
        graph.getPosition(state1.robotPosition),
        graph.getPosition(graph.dirtPositions[i]!)
      )
      if (dist < bestPileDist) {
        bestPile = i
        bestPileDist = dist
      }
    }
  }

  const maxDirtPileCount = graph.dirtPositions.length
  const setBits = countSetBits(state1.remaining)
  const robotWeight = maxDirtPileCount - setBits

  const nextState = {
    remaining: state1.remaining & ~(1 << bestPile),
    robotPosition: graph.dirtPositions[bestPile]!,
  }
  const remainingCost = this.get(graph, nextState, _)

  return (bestPileDist + 1) * robotWeight + remainingCost
}, 'vacuum')

export class InadmissibleActionEstimate<S> extends ActionEstimate<S> {}
