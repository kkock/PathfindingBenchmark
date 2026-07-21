import type { Algorithm, AlgorithmResult, SearchService } from '../Algorithm'
import { gridGraphFromMap, parseMap, vacuumWorldFromMap } from '../dataLoaders/MapLoader'
import { type GenericScenDef, parseScen, type ScenDef } from '../dataLoaders/ScenLoader'
//import type { GridGraph, Vertex } from '../graph/GridGraph'
import type { InstanceRegistry } from '../Registry'
import type { SearchDomain } from '../graph/Graph'
import type { GridGraph, Point } from '../graph/GridGraph'
import { Cost } from '../services/Cost'

import { hrtime } from 'node:process'
import fs from 'node:fs'
import chalk from 'chalk'
import { euclideanHeuristic, getWeightedHeuristic } from '../services/Heuristic'
import { VacuumState, VacuumWorld } from '../graph/VacuumWorldGraph'

export class Suite<S, T extends SearchDomain<S> = SearchDomain<S>> {
  private readonly graph: T
  private readonly scenarios: GenericScenDef<S>[]
  public readonly mapName: string

  constructor (graph: T, scenarios: GenericScenDef<S>[], mapName: string) {
    this.graph = graph
    this.scenarios = scenarios
    this.mapName = mapName
  }

  instance (
    algorithm: Algorithm,
    services: InstanceRegistry<SearchService<S>>,
    opts: { [key: string]: any } = {}
  ): SuiteInstance<S> {
    return new SuiteInstance(this.graph, this.scenarios, services, algorithm, opts)
  }
}

export interface ProcessedSingleBenchmarkResult<S> {
  results: Array<{
    path?: Array<S>
    cost: number
    time: number
    searchMetrics: { nodesGenerated: number, nodesExpanded: number }
  }>
  scenario: string
}

interface ProcessedCombinedBenchmarkResult<S> {
  path?: Array<Array<S>>
  cost: number[]
  time: number[]
  searchMetrics: { nodesGenerated: number[], nodesExpanded: number[] }
}

export interface ProcessedBenchmarkResult<S> {
  results: ProcessedCombinedBenchmarkResult<S>[]
  scenario: string
}

export interface BenchmarkResult<S> {
  startTime: bigint
  results: Array<{ result: AlgorithmResult<S>, time: bigint }>
  /**
   * @todo replace this with some sort of ID instead, we can look up which
   * scenario it was with that; e.g. `path/to/file.scen(lineNum)`
   */
  scenario: string // ScenDef
}

export interface SerializedBenchmarkResult<S> {
  algorithm: string
  services: { [key: string]: string }
  opts: { [key: string]: any }
  result: ProcessedBenchmarkResult<S>
}

export class SuiteInstance<S> {
  private readonly graph: SearchDomain<S>
  private readonly scenarios: GenericScenDef<S>[]
  private readonly algorithm: Algorithm
  private readonly services: InstanceRegistry<SearchService<S>>
  private readonly opts: { [key: string]: any }

  constructor (graph: SearchDomain<S>, scenarios: GenericScenDef<S>[], services: InstanceRegistry<SearchService<S>>, algorithm: Algorithm, opts: { [key: string]: any } = {}) {
    this.graph = graph
    this.scenarios = scenarios
    this.algorithm = algorithm
    this.services = services
    this.opts = opts
  }

  private collectResult (index: number): ProcessedSingleBenchmarkResult<S> {
    const scenario = this.scenarios[index] as GenericScenDef<S>
    const source = this.graph.normalize(scenario.start) //this.graph.getVertex(`${scenario.start},${scenario.start.y}`) as Vertex
    const goal = this.graph.normalize(scenario.goal) //this.graph.getVertex(`${scenario.goal.x},${scenario.goal.y}`) as Vertex
    const generator = this.algorithm(this.graph, this.services, source, goal, this.opts)

    const resultTimes: bigint[] = []
    const algorithmResults: AlgorithmResult<S>[] = []
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

  run (iterations: number = 1): ProcessedBenchmarkResult<S>[] {
    const results: ProcessedBenchmarkResult<S>[] = []
    if (iterations < 1) return results

    for (let i = 0; i < this.scenarios.length; i++) {
      console.info(chalk.cyan(`Running scenario ${i + 1}/${this.scenarios.length}`))
      const iterationResults: ProcessedSingleBenchmarkResult<S>[] = []
      for (let j = 0; j < iterations; j++) {
        iterationResults.push(this.collectResult(i))
      }

      const combinedResults = this.combineResults(iterationResults)
      results.push({
        results: combinedResults,
        scenario: (iterationResults[0] as ProcessedSingleBenchmarkResult<S>).scenario
      })
    }

    return results
  }

  private combineResults (trials: ProcessedSingleBenchmarkResult<S>[]): ProcessedCombinedBenchmarkResult<S>[] {
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

  private processBenchmarkResult (result: BenchmarkResult<S>, includePath: boolean = false): ProcessedSingleBenchmarkResult<S> {
    const costGetter = this.services.get(Cost)
    return {
      results: result.results.map(value => {
        const time = Number(value.time - result.startTime) / 1000
        const path = value.result.path//.map<S>(vertex => [vertex.x, vertex.y])
        const searchMetrics = value.result.searchMetrics
        let cost = 0

        for (let i = 0; i < path.length - 1; i++) {
          cost += costGetter.get(
            this.graph, 
            path[i] as S,
            path[i + 1] as S
          )
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
  fallbackOpts: MapOpts = gridGraphFromMap.movingAiOpts
): Suite<Point, GridGraph>[] {
  const mapScenDefs = new Map<string, ScenDef[]>()
  const graphs = new Map<string, GridGraph>()
  const result: Suite<Point, GridGraph>[] = []

  //scenFile = scenFile.slice(0, 100)
  //scenFile = scenFile.slice(-1)
  //scenFile = scenFile.slice(-20)

  //const gr = [...graphs.values()][0]!
  //console.log(getWeightedHeuristic(0.1, euclideanHeuristic).get(gr, 10, 10, 11, 11))

  for (const scenLine of scenFile) {
    if (!mapFilePaths.has(scenLine.map)) throw new RangeError(`Map '${scenLine.map}' could not be found in the provided map directory`)
    const mapFilePath = mapFilePaths.get(scenLine.map) as string

    if (!graphs.has(scenLine.map)) {
      const map = parseMap(fs.readFileSync(mapFilePath).toString())
      const graph = gridGraphFromMap(map, gridGraphFromMap.diagonalNeighborPolicy, isGuardsMap ? gridGraphFromMap.guardsOpts : fallbackOpts)
      graphs.set(scenLine.map, graph)
    }

    if (!mapScenDefs.has(scenLine.map)) mapScenDefs.set(scenLine.map, [])
    ;(mapScenDefs.get(scenLine.map) as ScenDef[]).push(scenLine)
  }

  for (const [mapName, scenDefs] of mapScenDefs.entries()) {
    const graph = graphs.get(mapName) as GridGraph
    result.push(new Suite(graph, scenDefs, mapName))
  }

  return result
}

export function prepareVacuumSuites (
  mapFilePaths: Map<string, string>,
): Suite<VacuumState, VacuumWorld>[] {
  const result: Suite<VacuumState, VacuumWorld>[] = []

  for (const [mapName, mapFilePath] of mapFilePaths.entries()) {
    const map = parseMap(fs.readFileSync(mapFilePath).toString())
    const { domain, scen } = vacuumWorldFromMap(mapName, map)
    result.push(new Suite(domain, [scen], mapName))
  }

  return result
}

export function runSuites<S> (
  suites: Suite<S>[],
  algorithms: Algorithm[],
  services: InstanceRegistry<SearchService<S>>,
  opts: { [key: string]: any } = {}
): SerializedBenchmarkResult<S>[] {
  const results: SerializedBenchmarkResult<S>[] = []
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
