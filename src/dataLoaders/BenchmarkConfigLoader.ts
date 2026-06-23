/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { Algorithm, SearchService } from '../Algorithm'

import algorithms from '../algorithms/algorithms'
import { Heuristic, InadmissibleHeuristic, euclideanHeuristic, getWeightedHeuristic } from '../services/Heuristic'
import { ApproximateCost, Cost, euclideanCost, getWeightedCost, guardsCost } from '../services/Cost'
import { ActionEstimate, chebyshevActionEstimate, euclideanActionEstimate, getWeightedActionEstimate, InadmissibleActionEstimate, manhattanActionEstimate } from '../services/ActionEstimate'
import { generateCombinations } from '../utils'
import { readScenFiles } from './ScenLoader'
import { getMapFiles } from './MapLoader'
import { prepareSuites, runSuites } from '../benchmark/Suite'
import { InstanceRegistry } from '../Registry'

import fs from 'node:fs'
import path from 'node:path'

interface BenchmarkConfig {
  guards: boolean
  mapPath: string
  scenPath: string
  outPath: string
  algorithms: Algorithm[]
  services: Map<new (...args: any[]) => SearchService, SearchService[]>
  opts: { [key: string]: any[] }
}

export function parseBenchmarkConfig (source: string): BenchmarkConfig {
  const result = JSON.parse(source)

  if (result.guards == null) throw new RangeError('\'guards\' is a required property in a benchmark config file!')
  else if (typeof result.guards !== 'boolean') throw new RangeError('\'guards\' must be a boolean!')
  else if (result.mapPath == null) throw new RangeError('\'mapPath\' is a required property in a benchmark config file!')
  else if (typeof result.mapPath !== 'string') throw new RangeError('\'mapPath\' must be a string!')
  else if (result.scenPath == null) throw new RangeError('\'scenPath\' is a required property in a benchmark config file!')
  else if (typeof result.scenPath !== 'string') throw new RangeError('\'scenPath\' must be a string!')
  else if (result.outPath == null) throw new RangeError('\'outPath\' is a required property in a benchmark config file!')
  else if (typeof result.outPath !== 'string') throw new RangeError('\'outPath\' must be a string!')
  else if (result.algorithms == null) throw new RangeError('\'algorithms\' is a required property in a benchmark config file!')
  else if (!(result.algorithms instanceof Array)) throw new RangeError('\'algorithms\' must be an array!')
  else if (result.services == null) throw new RangeError('\'services\' is a required property in a benchmark config file!')
  else if (!(result.services instanceof Object)) throw new RangeError('\'services\' must be an object!')
  else if (result.opts == null) throw new RangeError('\'opts\' is a required property in a benchmark config file!')
  else if (!(result.opts instanceof Object)) throw new RangeError('\'opts\' must be an object!')

  const services: Map<new (...args: any[]) => SearchService, SearchService[]> = new Map([
    [Heuristic, []],
    [InadmissibleHeuristic, []],
    [Cost, []],
    [ApproximateCost, []],
    [ActionEstimate, []],
    [InadmissibleActionEstimate, []]
  ])

  for (const [serviceKey, serviceValues] of Object.entries(result.services as { [key: string]: string })) {
    for (const serviceValue of serviceValues) {
      switch (serviceKey) {
        case Heuristic.name:
          if (serviceValue === 'euclidean') {
            services.get(Heuristic)!.push(euclideanHeuristic)
          } else if (/^euclidean\([\d.]+\)$/.test(serviceValue)) {
            const match = /^euclidean\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(Heuristic)!.push(getWeightedHeuristic(weight, euclideanHeuristic))
          } else {
            throw new RangeError(`Unknown heuristic '${serviceValue}'`)
          }
          break

        case InadmissibleHeuristic.name:
          if (serviceValue === 'euclidean') {
            services.get(InadmissibleHeuristic)!.push(euclideanHeuristic)
          } else if (/^euclidean\([\d.]+\)$/.test(serviceValue)) {
            const match = /^euclidean\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(InadmissibleHeuristic)!.push(getWeightedHeuristic(weight, euclideanHeuristic))
          } else {
            throw new RangeError(`Unknown heuristic '${serviceValue}'`)
          }
          break

        case Cost.name:
          if (serviceValue === 'euclidean') {
            services.get(Cost)!.push(euclideanCost)
          } else if (/^euclidean\([\d.]+\)$/.test(serviceValue)) {
            const match = /^euclidean\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(Cost)!.push(getWeightedCost(weight, euclideanCost))
          } else if (serviceValue === 'euclidean-guards') {
            services.get(Cost)!.push(guardsCost)
          } else if (/^euclidean-guards\([\d.]+\)$/.test(serviceValue)) {
            const match = /^euclidean-guards\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(Cost)!.push(getWeightedCost(weight, guardsCost))
          } else {
            throw new RangeError(`Unknown cost '${serviceValue}'`)
          }
          break

        case ApproximateCost.name:
          if (serviceValue === 'euclidean') {
            services.get(ApproximateCost)!.push(euclideanCost)
          } else if (/^euclidean\([\d.]+\)$/.test(serviceValue)) {
            const match = /^euclidean\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(ApproximateCost)!.push(getWeightedCost(weight, euclideanCost))
          } else if (serviceValue === 'euclidean-guards') {
            services.get(ApproximateCost)!.push(guardsCost)
          } else if (/^euclidean-guards\([\d.]+\)$/.test(serviceValue)) {
            const match = /^euclidean-guards\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(ApproximateCost)!.push(getWeightedCost(weight, guardsCost))
          } else {
            throw new RangeError(`Unknown cost '${serviceValue}'`)
          }
          break

        case ActionEstimate.name:
          if (serviceValue === 'chebyshev') {
            services.get(ActionEstimate)!.push(chebyshevActionEstimate)
          } else if (/^chebyshev\([\d.]+\)$/.test(serviceValue)) {
            const match = /^chebyshev\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(ActionEstimate)!.push(getWeightedActionEstimate(weight, chebyshevActionEstimate))
          } else if (serviceValue === 'manhattan') {
            services.get(ActionEstimate)!.push(manhattanActionEstimate)
          } else if (/^manhattan\([\d.]+\)$/.test(serviceValue)) {
            const match = /^manhattan\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(ActionEstimate)!.push(getWeightedActionEstimate(weight, manhattanActionEstimate))
          } else if (serviceValue === 'euclidean') {
            services.get(ActionEstimate)!.push(euclideanActionEstimate)
          } else if (/^euclidean\([\d.]+\)$/.test(serviceValue)) {
            const match = /^euclidean\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(ActionEstimate)!.push(getWeightedActionEstimate(weight, euclideanActionEstimate))
          } else {
            throw new RangeError(`Unknown heuristic '${serviceValue}'`)
          }
          break

        case InadmissibleActionEstimate.name:
          if (serviceValue === 'chebyshev') {
            services.get(InadmissibleActionEstimate)!.push(chebyshevActionEstimate)
          } else if (/^chebyshev\([\d.]+\)$/.test(serviceValue)) {
            const match = /^chebyshev\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(InadmissibleActionEstimate)!.push(getWeightedHeuristic(weight, chebyshevActionEstimate))
          } else if (serviceValue === 'manhattan') {
            services.get(InadmissibleActionEstimate)!.push(manhattanActionEstimate)
          } else if (/^manhattan\([\d.]+\)$/.test(serviceValue)) {
            const match = /^manhattan\(([\d.]+)\)$/.exec(serviceValue) as RegExpExecArray
            const weight = Number(match[1])
            services.get(InadmissibleActionEstimate)!.push(getWeightedHeuristic(weight, manhattanActionEstimate))
          } else {
            throw new RangeError(`Unknown heuristic '${serviceValue}'`)
          }
          break

        default:
          throw new RangeError(`Unknown service '${serviceKey}'`)
      }
    }
  }

  const config: BenchmarkConfig = {
    guards: result.guards as boolean,
    mapPath: result.mapPath as string,
    scenPath: result.scenPath as string,
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
        const scenFiles = readScenFiles(config.scenPath)
        const mapFiles = getMapFiles(config.mapPath)
        for (const [scenName, scenDefs] of scenFiles) {
          const suites = prepareSuites(scenDefs, mapFiles, config.guards)
          const result = runSuites(suites, [algorithm], services as InstanceRegistry<SearchService>, opts)
          fs.appendFileSync(config.outPath, result.map(result => JSON.stringify(result)).join('\n') + '\n')
        }
      }
    }
  }
}
