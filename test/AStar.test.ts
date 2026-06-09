import { describe, expect, test } from '@jest/globals'
import { diagonalNeighborPolicy, strTo2DArr } from './utils'
import { graphFromMap } from '../src/dataLoaders/MapLoader'
import type { SearchService } from '../src/Algorithm'
import type { Vertex } from '../src/Graph'

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

    const graph = graphFromMap(map, diagonalNeighborPolicy, { passable: new Set(['.']) })
    const services = new Map<new (...args: any[]) => SearchService, SearchService>()
    services.set(Cost, euclideanCost)
    services.set(Heuristic, euclideanHeuristic)

    const startVertex = graph.getVertex('0,0') as Vertex
    const endVertex = graph.getVertex('2,2') as Vertex
    const resultGetter = () => Array.from(aStar(graph, services, startVertex, endVertex))

    expect(resultGetter).not.toThrow()
    
    const result = resultGetter()

    expect(result).toHaveLength(1)
    expect(result[0]).toHaveLength(3)
    expect(result[0][0]).toMatchObject({ x: 0, y: 0 })
    expect(result[0][1]).toMatchObject({ x: 1, y: 1 })
    expect(result[0][2]).toMatchObject({ x: 2, y: 2 })
  })
})