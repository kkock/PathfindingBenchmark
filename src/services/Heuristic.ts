import type { SearchDomain } from '../graph/Graph'
import { GridGraph, type Point } from '../graph/GridGraph'
import { VacuumState, VacuumWorld } from '../graph/VacuumWorldGraph'
import { type ClassOf, countSetBits, euclideanDistance } from './misc'

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
  public readonly Domain: ClassOf<G>

  constructor (cb: HeuristicCallback<S, G>, name: string, Domain: ClassOf<G>) {
    this.get = cb
    this.name = name
    this.Domain = Domain
  }
}

export const euclideanHeuristic = new Heuristic<Point>((_, ...args) => euclideanDistance(...args), 'euclidean', GridGraph)

export function getWeightedHeuristic<S> (weight: number, heuristic: Heuristic<S>): Heuristic<S> {
  const cb: HeuristicCallback<S> = (...args) => weight * heuristic.get(...args)
  return new Heuristic<S>(cb, `${heuristic.name}(${weight})`, heuristic.Domain)
}

export const vacuumHeuristic = new Heuristic<VacuumState, VacuumWorld>((graph, state1, _) => {
  const points = [state1.robotPosition]
  for (let i = 0; i < graph.dirtPositions.length; ++i) {
    if (((state1.remaining >> i) & 1) !== 0) {
      points.push(graph.dirtPositions[i]!)
    }
  }

  const mst = graph.getMst(points)
  return mst.reduce((a, b) => a + b, 0)
}, 'vacuum', VacuumWorld)

export const heavyVacuumHeuristic = new Heuristic<VacuumState, VacuumWorld>((graph, state1, _) => {
  const points = [state1.robotPosition]
  for (let i = 0; i < graph.dirtPositions.length; ++i) {
    if (((state1.remaining >> i) & 1) !== 0) {
      points.push(graph.dirtPositions[i]!)
    }
  }

  const maxDirtPileCount = graph.dirtPositions.length
  const setBits = countSetBits(state1.remaining)
  const robotWeight = maxDirtPileCount - setBits

  const mst = graph.getMst(points).sort((a, b) => b - a)
  let h = 0
  for (let i = 0; i < mst.length; ++i) {
    h += mst[i]! * (i + robotWeight)
  }
  return h
}, 'vacuum-heavy', VacuumWorld)

export class InadmissibleHeuristic<S> extends Heuristic<S> {}
