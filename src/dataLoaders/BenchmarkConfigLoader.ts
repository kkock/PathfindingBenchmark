/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { Algorithm, SearchService } from '../Algorithm'
import { GridGraph, type Point } from '../graph/GridGraph'
import { VacuumWorld } from '../graph/VacuumWorldGraph'

import algorithms from '../algorithms/algorithms'
import { Heuristic, InadmissibleHeuristic, euclideanHeuristic, getWeightedHeuristic, heavyVacuumHeuristic, vacuumHeuristic } from '../services/Heuristic'
import { ApproximateCost, Cost, euclideanCost, getWeightedCost, guardsCost, heavyVacuumCost } from '../services/Cost'
import { ActionEstimate, chebyshevActionEstimate, euclideanActionEstimate, getWeightedActionEstimate, InadmissibleActionEstimate, manhattanActionEstimate, vacuumActionEstimate } from '../services/ActionEstimate'
import { generateCombinations } from '../utils'
import { readScenFiles } from './ScenLoader'
import { getMapFiles } from './MapLoader'
import { prepareSuites, prepareVacuumSuites, runSuites } from '../benchmark/Suite'
import { InstanceRegistry } from '../Registry'

import fs from 'node:fs'
import path from 'node:path'

interface ScenBenchmarkConfig<S> {
  type: 'movingai' | 'guards'
  mapPath: string
  scenPath: string
  outPath: string
  algorithms: Algorithm[]
  services: Map<new (...args: any[]) => SearchService<S>, SearchService<S>[]>
  opts: { [key: string]: any[] }
}

interface ScenlessBenchmarkConfig<S> {
  type: 'vacuum'
  mapPath: string
  scenPath: null | undefined
  outPath: string
  algorithms: Algorithm[]
  services: Map<new (...args: any[]) => SearchService<S>, SearchService<S>[]>
  opts: { [key: string]: any[] }
}

/*interface BenchmarkConfig<S> {
  type: 'guards' | 'movingai' | 'vacuum'
  mapPath: string
  scenPath?: string
  outPath: string
  algorithms: Algorithm[]
  services: Map<new (...args: any[]) => SearchService<S>, SearchService<S>[]>
  opts: { [key: string]: any[] }
}*/

type BenchmarkConfig<S> = ScenlessBenchmarkConfig<S> | ScenBenchmarkConfig<S>

export function parseBenchmarkConfig<S> (source: string): BenchmarkConfig<S> {
  const result = JSON.parse(source)

  
  if (result.type == null) throw new RangeError('\'type\' is a required property in a benchmark config file!')
  else if (typeof result.type !== 'string') throw new RangeError('\'type\' must be a string!')

  const requiresScen = ['guards', 'movingai'].includes(result.type)

  if (result.mapPath == null) throw new RangeError('\'mapPath\' is a required property in a benchmark config file!')
  else if (typeof result.mapPath !== 'string') throw new RangeError('\'mapPath\' must be a string!')
  else if (requiresScen && result.scenPath == null) throw new RangeError('\'scenPath\' is a required property in a benchmark config file for this scenario type!')
  else if (requiresScen && typeof result.scenPath !== 'string') throw new RangeError('\'scenPath\' must be a string!')
  else if (result.outPath == null) throw new RangeError('\'outPath\' is a required property in a benchmark config file!')
  else if (typeof result.outPath !== 'string') throw new RangeError('\'outPath\' must be a string!')
  else if (result.algorithms == null) throw new RangeError('\'algorithms\' is a required property in a benchmark config file!')
  else if (!(result.algorithms instanceof Array)) throw new RangeError('\'algorithms\' must be an array!')
  else if (result.services == null) throw new RangeError('\'services\' is a required property in a benchmark config file!')
  else if (!(result.services instanceof Object)) throw new RangeError('\'services\' must be an object!')
  else if (result.opts == null) throw new RangeError('\'opts\' is a required property in a benchmark config file!')
  else if (!(result.opts instanceof Object)) throw new RangeError('\'opts\' must be an object!')

  const services = new Map<new (...args: any[]) => SearchService<S>, SearchService<S>[]>([
    [Heuristic, []],
    [InadmissibleHeuristic, []],
    [Cost, []],
    [ApproximateCost, []],
    [ActionEstimate, []],
    [InadmissibleActionEstimate, []]
  ])

  const _euclideanHeuristic = euclideanHeuristic as unknown as Heuristic<S>
  const _euclideanCost = euclideanCost as unknown as Cost<S>
  const _guardsCost = guardsCost as unknown as Cost<S>
  const _chebyshevActionEstimate = chebyshevActionEstimate  as unknown as ActionEstimate<S>
  const _manhattanActionEstimate = manhattanActionEstimate  as unknown as ActionEstimate<S>
  const _euclideanActionEstimate = euclideanActionEstimate  as unknown as ActionEstimate<S>
  const _vacuumActionEstimate = vacuumActionEstimate as unknown as ActionEstimate<S>
  const _heavyVacuumCost = heavyVacuumCost as unknown as Cost<S>
  const _vacuumHeuristic = vacuumHeuristic as unknown as Heuristic<S>
  const _heavyVacuumHeuristic = heavyVacuumHeuristic as unknown as Heuristic<S>

  for (const [serviceKey, serviceValues] of Object.entries(result.services as { [key: string]: string })) {
    for (const serviceValue of serviceValues) {
      switch (serviceKey) {
        case Heuristic.name:
          if (serviceValue === 'euclidean') {
            services.get(Heuristic)!.push(_euclideanHeuristic)
          } else if (/^euclidean\([\d.]+\)$/.test(serviceValue)) {
            const match = /^euclidean\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(Heuristic)!.push(getWeightedHeuristic(weight, _euclideanHeuristic))
          } else if (serviceValue === 'vacuum') {
            services.get(Heuristic)!.push(_vacuumHeuristic)
          } else if (/^vacuum\([\d.]+\)$/.test(serviceValue)) {
            const match = /^vacuum\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(Heuristic)!.push(getWeightedHeuristic(weight, _vacuumHeuristic))
          } else if (serviceValue === 'vacuum-heavy') {
            services.get(Heuristic)!.push(_heavyVacuumHeuristic)
          } else if (/^vacuum-heavy\([\d.]+\)$/.test(serviceValue)) {
            const match = /^vacuum-heavy\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(Heuristic)!.push(getWeightedHeuristic(weight, _heavyVacuumHeuristic))
          } else {
            throw new RangeError(`Unknown heuristic '${serviceValue}'`)
          }
          break

        case InadmissibleHeuristic.name:
          if (serviceValue === 'euclidean') {
            services.get(InadmissibleHeuristic)!.push(_euclideanHeuristic)
          } else if (/^euclidean\([\d.]+\)$/.test(serviceValue)) {
            const match = /^euclidean\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(InadmissibleHeuristic)!.push(getWeightedHeuristic(weight, _euclideanHeuristic))
          } else if (serviceValue === 'vacuum') {
            services.get(InadmissibleHeuristic)!.push(_vacuumHeuristic)
          } else if (/^vacuum\([\d.]+\)$/.test(serviceValue)) {
            const match = /^vacuum\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(InadmissibleHeuristic)!.push(getWeightedHeuristic(weight, _vacuumHeuristic))
          } else if (serviceValue === 'vacuum-heavy') {
            services.get(InadmissibleHeuristic)!.push(_heavyVacuumHeuristic)
          } else if (/^vacuum-heavy\([\d.]+\)$/.test(serviceValue)) {
            const match = /^vacuum-heavy\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(InadmissibleHeuristic)!.push(getWeightedHeuristic(weight, _heavyVacuumHeuristic))
          } else {
            throw new RangeError(`Unknown heuristic '${serviceValue}'`)
          }
          break

        case Cost.name:
          if (serviceValue === 'euclidean') {
            services.get(Cost)!.push(_euclideanCost)
          } else if (/^euclidean\([\d.]+\)$/.test(serviceValue)) {
            const match = /^euclidean\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(Cost)!.push(getWeightedCost(weight, _euclideanCost))
          } else if (serviceValue === 'euclidean-guards') {
            services.get(Cost)!.push(_guardsCost)
          } else if (/^euclidean-guards\([\d.]+\)$/.test(serviceValue)) {
            const match = /^euclidean-guards\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(Cost)!.push(getWeightedCost(weight, _guardsCost))
          } else if (serviceValue === 'heavy-vacuum') {
            services.get(Cost)!.push(_heavyVacuumCost)
          } else if (/^vacuum-heavy\([\d.]+\)$/.test(serviceValue)) {
            const match = /^vacuum-heavy\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(Cost)!.push(getWeightedCost(weight, _heavyVacuumCost))
          } else {
            throw new RangeError(`Unknown cost '${serviceValue}'`)
          }
          break

        case ApproximateCost.name:
          if (serviceValue === 'euclidean') {
            services.get(ApproximateCost)!.push(_euclideanCost)
          } else if (/^euclidean\([\d.]+\)$/.test(serviceValue)) {
            const match = /^euclidean\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(ApproximateCost)!.push(getWeightedCost(weight, _euclideanCost))
          } else if (serviceValue === 'euclidean-guards') {
            services.get(ApproximateCost)!.push(_guardsCost)
          } else if (/^euclidean-guards\([\d.]+\)$/.test(serviceValue)) {
            const match = /^euclidean-guards\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(ApproximateCost)!.push(getWeightedCost(weight, _guardsCost))
          } else if (serviceValue === 'heavy-vacuum') {
            services.get(ApproximateCost)!.push(_heavyVacuumCost)
          } else if (/^heavy-vacuum\([\d.]+\)$/.test(serviceValue)) {
            const match = /^heavy-vacuum\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(ApproximateCost)!.push(getWeightedCost(weight, _heavyVacuumCost))
          } else {
            throw new RangeError(`Unknown cost '${serviceValue}'`)
          }
          break

        case ActionEstimate.name:
          if (serviceValue === 'chebyshev') {
            services.get(ActionEstimate)!.push(_chebyshevActionEstimate)
          } else if (/^chebyshev\([\d.]+\)$/.test(serviceValue)) {
            const match = /^chebyshev\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(ActionEstimate)!.push(getWeightedActionEstimate(weight, _chebyshevActionEstimate))
          } else if (serviceValue === 'manhattan') {
            services.get(ActionEstimate)!.push(_manhattanActionEstimate)
          } else if (/^manhattan\([\d.]+\)$/.test(serviceValue)) {
            const match = /^manhattan\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(ActionEstimate)!.push(getWeightedActionEstimate(weight, _manhattanActionEstimate))
          } else if (serviceValue === 'euclidean') {
            services.get(ActionEstimate)!.push(_euclideanActionEstimate)
          } else if (/^euclidean\([\d.]+\)$/.test(serviceValue)) {
            const match = /^euclidean\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(ActionEstimate)!.push(getWeightedActionEstimate(weight, _euclideanActionEstimate))
          } else if (serviceValue === 'vacuum') {
            services.get(ActionEstimate)!.push(_vacuumActionEstimate)
          } else if (/^vacuum\([\d.]+\)$/.test(serviceValue)) {
            const match = /^vacuum\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(ActionEstimate)!.push(getWeightedActionEstimate(weight, _vacuumActionEstimate))
          } else {
            throw new RangeError(`Unknown heuristic '${serviceValue}'`)
          }
          break

        case InadmissibleActionEstimate.name:
          if (serviceValue === 'chebyshev') {
            services.get(InadmissibleActionEstimate)!.push(_chebyshevActionEstimate)
          } else if (/^chebyshev\([\d.]+\)$/.test(serviceValue)) {
            const match = /^chebyshev\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(InadmissibleActionEstimate)!.push(getWeightedHeuristic(weight, _chebyshevActionEstimate))
          } else if (serviceValue === 'manhattan') {
            services.get(InadmissibleActionEstimate)!.push(_manhattanActionEstimate)
          } else if (/^manhattan\([\d.]+\)$/.test(serviceValue)) {
            const match = /^manhattan\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(InadmissibleActionEstimate)!.push(getWeightedHeuristic(weight, _manhattanActionEstimate))
          } else if (serviceValue === 'euclidean') {
            services.get(InadmissibleActionEstimate)!.push(_euclideanActionEstimate)
          } else if (/^euclidean\([\d.]+\)$/.test(serviceValue)) {
            const match = /^euclidean\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(InadmissibleActionEstimate)!.push(getWeightedActionEstimate(weight, _euclideanActionEstimate))
          } else if (serviceValue === 'vacuum') {
            services.get(InadmissibleActionEstimate)!.push(_vacuumActionEstimate)
          } else if (/^vacuum\([\d.]+\)$/.test(serviceValue)) {
            const match = /^vacuum\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(InadmissibleActionEstimate)!.push(getWeightedActionEstimate(weight, _vacuumActionEstimate))
          } else {
            throw new RangeError(`Unknown heuristic '${serviceValue}'`)
          }
          break

        default:
          throw new RangeError(`Unknown service '${serviceKey}'`)
      }
    }
  }

  const config: BenchmarkConfig<S> = {
    type: result.type as 'movingai' | 'guards' | 'vacuum',
    mapPath: result.mapPath as string,
    scenPath: result.scenPath,
    outPath: result.outPath as string,
    algorithms: (result.algorithms as string[]).map(algorithmName => {
      const algorithm = algorithms.find(algorithm => algorithm.name === algorithmName)
      if (algorithm == null) throw new RangeError(`Algorithm '${algorithmName}' is not a known algorithm!`)
      return algorithm
    }),
    services,
    opts: result.opts
  }

  return config
}

export function runConfig (configPath: string): void {
  const config = parseBenchmarkConfig(fs.readFileSync(configPath).toString())

  const { dir, name, ext } = path.parse(config.outPath)
  fs.mkdirSync(dir, { recursive: true })

  let i = 0
  while (fs.existsSync(config.outPath)) {
    config.outPath = path.format({
      dir,
      name: `${name}_${++i}`,
      ext
    })
  }

  for (const algorithm of config.algorithms) {
    const optsSets = generateCombinations(Object.fromEntries(Object.entries(config.opts).filter(([key]) => algorithm.availableOpts.has(key))))
    const serviceSets = generateCombinations(new Map([...config.services].filter(([service]) => algorithm.availableServices.has(service))))
    for (const opts of optsSets) {
      for (const services of serviceSets) {
        const servicesValues = Array.from(services.values())
        if (config.type === 'vacuum') {
          if (servicesValues.some((v) => !VacuumWorld.isPrototypeOf(v.Domain))) continue
          const mapFiles = getMapFiles(config.mapPath)
          const suites = prepareVacuumSuites(mapFiles)
          const result = runSuites(suites, [algorithm], services as InstanceRegistry<SearchService<any>>, opts)
          fs.appendFileSync(config.outPath, result.map(result => JSON.stringify(result)).join('\n') + '\n')
        } else {
          if (servicesValues.some((v) => !GridGraph.isPrototypeOf(v.Domain))) continue
          const scenFiles = readScenFiles(config.scenPath)
          const mapFiles = getMapFiles(config.mapPath)
          for (const [scenName, scenDefs] of scenFiles) {
            const suites = prepareSuites(scenDefs, mapFiles, config.type === 'guards')
            const result = runSuites(suites, [algorithm], services as InstanceRegistry<SearchService<Point>>, opts)
            fs.appendFileSync(config.outPath, result.map(result => JSON.stringify(result)).join('\n') + '\n')
          }
        }
      }
    }
  }
}
