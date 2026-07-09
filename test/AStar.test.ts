import { describe, expect, test } from '@jest/globals'
import { diagonalNeighborPolicy, strTo2DArr } from './utils'
import { gridGraphFromMap } from '../src/dataLoaders/MapLoader'

import type { AlgorithmResult, SearchService } from '../src/Algorithm'
import type { GridVertex, Point } from '../src/graph/GridGraph'
import type { InstanceRegistry } from '../src/Registry'

import { aStar } from '../src/algorithms/AStar'
import { Cost, euclideanCost } from '../src/services/Cost'
import { Heuristic, euclideanHeuristic } from '../src/services/Heuristic'

describe('A* algorithm', () => {
  test('produces the single shortest path', () => {
    const map = strTo2DArr(`
      ...
      ...
      ...
    `)

    const graph = gridGraphFromMap(map, diagonalNeighborPolicy, { passable: new Set(['.']) })
    const services = new Map<new (...args: any[]) => SearchService<Point>, SearchService<Point>>()
    services.set(Cost, euclideanCost)
    services.set(Heuristic, euclideanHeuristic)

    const startVertex = graph.getVertex('0,0') as GridVertex
    const endVertex = graph.getVertex('2,2') as GridVertex
    const resultGetter = (): AlgorithmResult<Point>[] => Array.from(aStar(graph, services as InstanceRegistry<SearchService<Point>>, startVertex.point, endVertex.point))

    expect(resultGetter).not.toThrow()

    const result = resultGetter()

    expect(result).toHaveLength(1)
    expect(result[0]?.path).toHaveLength(3)
    expect(result[0]?.path[0]).toMatchObject({ x: 0, y: 0 })
    expect(result[0]?.path[1]).toMatchObject({ x: 1, y: 1 })
    expect(result[0]?.path[2]).toMatchObject({ x: 2, y: 2 })
  })
})
