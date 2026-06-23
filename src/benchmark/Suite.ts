import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import { graphFromMap, parseMap } from '../dataLoaders/MapLoader'
import { parseScen, type ScenDef } from '../dataLoaders/ScenLoader'
import type { Graph, Vertex } from '../Graph'
import type { InstanceRegistry } from '../Registry'
import { Cost } from '../services/Cost'

import { hrtime } from 'node:process'
import fs from 'node:fs'
import chalk from 'chalk'
import { euclideanHeuristic, getWeightedHeuristic } from '../services/Heuristic'

export class Suite {
  private readonly graph: Graph
  private readonly scenarios: ScenDef[]
  public readonly mapName: string

  constructor (graph: Graph, scenarios: ScenDef[], mapName: string) {
    this.graph = graph
    this.scenarios = scenarios
    this.mapName = mapName
  }

  instance (
    algorithm: Algorithm,
    services: InstanceRegistry<SearchService>,
    opts: { [key: string]: any } = {}
  ): SuiteInstance {
    return new SuiteInstance(this.graph, this.scenarios, services, algorithm, opts)
  }
}

export interface ProcessedSingleBenchmarkResult {
  results: Array<{
    path?: Array<[number, number]>
    cost: number
    time: number
    searchMetrics: { nodesGenerated: number, nodesExpanded: number }
  }>
  scenario: string
}

interface ProcessedCombinedBenchmarkResult {
  path?: Array<Array<[number, number]>>
  cost: number[]
  time: number[]
  searchMetrics: { nodesGenerated: number[], nodesExpanded: number[] }
}

export interface ProcessedBenchmarkResult {
  results: ProcessedCombinedBenchmarkResult[]
  scenario: string
}

export interface BenchmarkResult {
  startTime: bigint
  results: Array<{ result: AlgorithmResult, time: bigint }>
  /**
   * @todo replace this with some sort of ID instead, we can look up which
   * scenario it was with that; e.g. `path/to/file.scen(lineNum)`
   */
  scenario: string // ScenDef
}

export interface SerializedBenchmarkResult {
  algorithm: string
  services: { [key: string]: string }
  opts: { [key: string]: any }
  result: ProcessedBenchmarkResult
}

export class SuiteInstance {
  private readonly graph: Graph
  private readonly scenarios: ScenDef[]
  private readonly algorithm: Algorithm
  private readonly services: InstanceRegistry<SearchService>
  private readonly opts: { [key: string]: any }

  constructor (graph: Graph, scenarios: ScenDef[], services: InstanceRegistry<SearchService>, algorithm: Algorithm, opts: { [key: string]: any } = {}) {
    this.graph = graph
    this.scenarios = scenarios
    this.algorithm = algorithm
    this.services = services
    this.opts = opts
  }

  private collectResult (index: number): ProcessedSingleBenchmarkResult {
    const scenario = this.scenarios[index] as ScenDef
    const source = this.graph.getVertex(`${scenario.start.x},${scenario.start.y}`) as Vertex
    const goal = this.graph.getVertex(`${scenario.goal.x},${scenario.goal.y}`) as Vertex
    const generator = this.algorithm(this.graph, this.services, source, goal, this.opts)

    const resultTimes: bigint[] = []
    const algorithmResults: AlgorithmResult[] = []
    const startTime = hrtime.bigint()
    for (const result of generator) {
      resultTimes.push(hrtime.bigint())
      algorithmResults.push(result)
    }

    return this.processBenchmarkResult({
      startTime,
      results: algorithmResults.map((result, i) => ({ result, time: resultTimes[i] as bigint })),
      scenario: getScenarioId(scenario)
    })
  }

  run (iterations: number = 1): ProcessedBenchmarkResult[] {
    const results: ProcessedBenchmarkResult[] = []
    if (iterations < 1) return results

    for (let i = 0; i < this.scenarios.length; i++) {
      console.info(chalk.cyan(`Running scenario ${i + 1}/${this.scenarios.length}`))
      const iterationResults: ProcessedSingleBenchmarkResult[] = []
      for (let j = 0; j < iterations; j++) {
        iterationResults.push(this.collectResult(i))
      }

      const combinedResults = this.combineResults(iterationResults)
      results.push({
        results: combinedResults,
        scenario: (iterationResults[0] as ProcessedSingleBenchmarkResult).scenario
      })
    }

    return results
  }

  private combineResults (trials: ProcessedSingleBenchmarkResult[]): ProcessedCombinedBenchmarkResult[] {
    if (trials.length === 0) return []

    const maxLength = Math.max(...trials.map(trial => trial.results.length))

    return Array.from({ length: maxLength }, (_, i) => ({
      time: trials.map(trial => (trial.results[i] as any).time),
      cost: trials.map(trial => (trial.results[i] as any).cost),
      searchMetrics: {
        nodesExpanded: trials.map(trial => (trial.results[i] as any).searchMetrics.nodesExpanded),
        nodesGenerated: trials.map(trial => (trial.results[i] as any).searchMetrics.nodesGenerated)
      }
    }))
  }

  private processBenchmarkResult (result: BenchmarkResult, includePath: boolean = false): ProcessedSingleBenchmarkResult {
    const costGetter = this.services.get(Cost)
    return {
      results: result.results.map(value => {
        const time = Number(value.time - result.startTime) / 1000
        const path = value.result.path.map<[number, number]>(vertex => [vertex.x, vertex.y])
        const searchMetrics = value.result.searchMetrics
        let cost = 0

        for (let i = 0; i < path.length - 1; i++) {
          const [x1, y1] = path[i] as [number, number]
          const [x2, y2] = path[i + 1] as [number, number]
          cost += costGetter.get(this.graph, x1, y1, x2, y2)
        }

        return includePath ? { time, path, cost, searchMetrics } : { time, cost, searchMetrics }
      }),
      scenario: result.scenario
    }
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

  //scenFile = scenFile.slice(0, 100)
  scenFile = scenFile.slice(-1)
  //scenFile = scenFile.slice(-20)

  //const gr = [...graphs.values()][0]!
  //console.log(getWeightedHeuristic(0.1, euclideanHeuristic).get(gr, 10, 10, 11, 11))

  for (const scenLine of scenFile) {
    if (!mapFilePaths.has(scenLine.map)) throw new RangeError(`Map '${scenLine.map}' could not be found in the provided map directory`)
    const mapFilePath = mapFilePaths.get(scenLine.map) as string

    if (!graphs.has(scenLine.map)) {
      const map = parseMap(fs.readFileSync(mapFilePath).toString())
      const graph = graphFromMap(map, graphFromMap.diagonalNeighborPolicy, isGuardsMap ? graphFromMap.guardsOpts : fallbackOpts)
      graphs.set(scenLine.map, graph)
    }

    if (!mapScenDefs.has(scenLine.map)) mapScenDefs.set(scenLine.map, [])
    ;(mapScenDefs.get(scenLine.map) as ScenDef[]).push(scenLine)
  }

  for (const [mapName, scenDefs] of mapScenDefs.entries()) {
    const graph = graphs.get(mapName) as Graph
    result.push(new Suite(graph, scenDefs, mapName))
  }

  return result
}

export function runSuites (
  suites: Suite[],
  algorithms: Algorithm[],
  services: InstanceRegistry<SearchService>,
  opts: { [key: string]: any } = {}
): SerializedBenchmarkResult[] {
  const results: SerializedBenchmarkResult[] = []
  for (const suite of suites) {
    for (const algorithm of algorithms) {
      const instance = suite.instance(algorithm, services, opts)
      console.log(services, opts)
      const result = instance.run(5)

      const servicesObj: { [key: string]: string } = {}
      for (const [serviceClass, serviceInstance] of services.entries()) {
        servicesObj[serviceClass.name] = serviceInstance.name
      }
      result.forEach(item => {
        results.push({
          algorithm: algorithm.name,
          services: servicesObj,
          opts,
          result: item
        })
      })
    }
  }

  return results
}

export function getScenarioId ({ fileName, index }: { fileName: string, index: number }): string {
  return `${fileName}(${index})`
}

export function decodeScenarioId (id: string): ScenDef {
  const match = /^(.+?)\((\d+)\)$/.exec(id)
  if (match == null) throw new RangeError(`'${id}' is not a valid scenario ID`)

  const fileName = match[1] as string
  const index = Number(match[2])

  const scen = parseScen(fs.readFileSync(fileName).toString(), fileName)
  return scen[index] as ScenDef
}
