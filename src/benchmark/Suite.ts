import type { Algorithm, AlgorithmResult, SearchService } from "../Algorithm"
import { graphFromMap, parseMap } from "../dataLoaders/MapLoader"
import type { ScenDef } from "../dataLoaders/ScenLoader"
import type { Graph, Vertex } from "../Graph"
import type { InstanceRegistry } from "../Registry"

import { hrtime } from "node:process"
import { readFileSync } from "node:fs"

export class Suite {
  private graph: Graph
  private scenarios: ScenDef[]

  constructor (graph: Graph, scenarios: ScenDef[]) {
    this.graph = graph
    this.scenarios = scenarios
  }

  instance (
    algorithm: Algorithm,
    services: InstanceRegistry<SearchService>,
    opts: { [key: string]: any } = {}
  ): SuiteInstance {
    return new SuiteInstance(this.graph, this.scenarios, services, algorithm, opts)
  }
}

export type BenchmarkResult = {
  startTime: bigint,
  results: ({ result: AlgorithmResult, time: bigint })[],
  scenario: ScenDef
}

export class SuiteInstance {
  private graph: Graph
  private scenarios: ScenDef[]
  private algorithm: Algorithm
  private services: InstanceRegistry<SearchService>
  private opts: { [key: string]: any }

  constructor (graph: Graph, scenarios: ScenDef[], services: InstanceRegistry<SearchService>, algorithm: Algorithm, opts: { [key: string]: any } = {}) {
    this.graph = graph
    this.scenarios = scenarios
    this.algorithm = algorithm
    this.services = services
    this.opts = opts
  }

  run (): BenchmarkResult[] {
    const results: BenchmarkResult[] = []
    for (let i = 0; i < this.scenarios.length; i++) {
      const scenario = this.scenarios[i] as ScenDef
      const source = this.graph.getVertex(`${scenario.start.x},${scenario.start.y}`) as Vertex
      const goal = this.graph.getVertex(`${scenario.goal.x},${scenario.goal.y}`) as Vertex
      const generator = this.algorithm(this.graph, this.services, source, goal, this.opts)

      const resultTimes: bigint[] = []
      const algorithmResults = []
      const startTime = hrtime.bigint()
      for (const result of generator) {
        resultTimes.push(hrtime.bigint())
        algorithmResults.push(result)
      }

      results[i] = {
        startTime,
        results: algorithmResults.map((result, i) => ({result, time: resultTimes[i] as bigint })),
        scenario
      }
    }

    return results
  }
}

type MapOpts = { passable: Set<string> } | { impassable: Set<string> }

export function prepareSuites (
  scenFile: ScenDef[],
  mapFilePaths: Map<string, string>,
  isGuardsMap: boolean = true,
  fallbackOpts: MapOpts = graphFromMap.movingAiOpts
): Suite[] {
  const mapScenDefs = new Map<string, ScenDef[]>()
  const graphs = new Map<string, Graph>()
  const result: Suite[] = []

  for (const scenLine of scenFile) {
    if (!mapFilePaths.has(scenLine.map)) throw new RangeError(`Map '${scenLine.map}' could not be found in the provided map directory`)
    const mapFilePath = mapFilePaths.get(scenLine.map) as string

    if (!graphs.has(scenLine.map)) {
      const map = parseMap(readFileSync(mapFilePath).toString())
      const graph = graphFromMap(map, graphFromMap.diagonalNeighborPolicy, isGuardsMap ? graphFromMap.guardsOpts : fallbackOpts)
      graphs.set(scenLine.map, graph)
    }

    if (!mapScenDefs.has(scenLine.map)) mapScenDefs.set(scenLine.map, [])
    mapScenDefs.get(scenLine.map)!.push(scenLine)
  }

  for (const [mapName, scenDefs] of mapScenDefs.entries()) {
    const graph = graphs.get(mapName) as Graph
    result.push(new Suite(graph, scenDefs))
  }

  return result
}