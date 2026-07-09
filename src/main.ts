#!/usr/bin/env node

import type { SerializedBenchmarkResult } from './benchmark/Suite'
import type { Algorithm, SearchService } from './Algorithm'
import type { InstanceRegistry } from './Registry'
import type { ScenDef } from './dataLoaders/ScenLoader'

import { parseArgs, ParseArgsConfig } from 'node:util'
import process from 'node:process'
import fs from 'node:fs'
import chalk from 'chalk'

import pkg from '../package.json'
import { ExtendedParseArgsConfig, formatHelp } from './utils'
import { getMapFiles } from './dataLoaders/MapLoader'
import { readScenFiles } from './dataLoaders/ScenLoader'
import { prepareSuites, runSuites } from './benchmark/Suite'

import { anytimeAStar, anytimeDynamicallyWeightedAStar, aStar, focalBeamAStar } from './algorithms/algorithms'
import { euclideanHeuristic, getWeightedHeuristic, Heuristic } from './services/Heuristic'
import { Cost, euclideanCost, guardsCost } from './services/Cost'
import { runConfig } from './dataLoaders/BenchmarkConfigLoader'
import { loadAndDisplayResults } from './benchmark/Inspect'
import { generateVacuumMaps } from './commands/GenerateVacuumMaps'

const parseArgsConfig: ExtendedParseArgsConfig = {
  options: {
    version: {
      type: 'boolean',
      short: 'v',
      description: 'Display the package name and version.'
    },
    help: {
      type: 'boolean',
      short: 'h',
      description: 'Display usage information.'
    },

    'map-path': {
      type: 'string',
      short: 'm',
      defaultDescription: `defaults to the value of ${chalk.green('"--scen-path"')} or to ${chalk.green('"."')}`,
      description: 'A directory or file to look for map data.'
    },
    'scen-path': {
      type: 'string',
      short: 's',
      defaultDescription: `defaults to the value of ${chalk.green('"--map-path"')} or to ${chalk.green('"."')}`,
      description: 'A directory or file to look for scenario data.'
    },
    'out-path': {
      type: 'string',
      short: 'o',
      description: 'The file to write the results to.'
    },
    'config-path': {
      type: 'string',
      short: 'c',
      description: 'Config file path (instead of commandline args).'
    },
    'log-path': {
      type: 'string',
      short: 'l',
      description: 'Log file to summarize.'
    },

    guards: {
      type: 'boolean',
      description: 'Treat the loaded maps as Guards maps.'
    }
  },
  allowPositionals: true
}

function getAlgorithms (): Algorithm[] {
  return [
    aStar,
    anytimeAStar,
    anytimeDynamicallyWeightedAStar,
    focalBeamAStar
    // latticeAStar
  ]
}

function getOpts (isGuardsMap: boolean): { services: InstanceRegistry<SearchService<any>>, opts: { [key: string]: any } } {
  return {
    services: new Map([
      [Heuristic, getWeightedHeuristic(1, euclideanHeuristic)],
      [Cost, isGuardsMap ? guardsCost : euclideanCost]
    ]) as InstanceRegistry<SearchService<any>>,
    opts: {
      epsilon: 1
    }
  }
}

function tryCommand (command: string | undefined): void {
  switch (command) {
    case 'generate-vacuum':
      generateVacuumMaps()
      process.exit()
  }
}

function main (): void {
  tryCommand(parseArgs({ allowPositionals: true, strict: false }).positionals[0])

  try {
    const { values, positionals } = parseArgs<ParseArgsConfig>(parseArgsConfig)

    if (values['version'] as boolean) {
      console.log(chalk.yellow(`${pkg.name} `) + chalk.green(`v${pkg.version}\n`))
      process.exit()
    }

    if (values['help'] as boolean) {
      console.log(formatHelp(parseArgsConfig))
      process.exit()
    }

    if (values['config-path'] as boolean) {
      runConfig(values['config-path'] as string)
      process.exit()
    }

    if (values['log-path'] as boolean) {
      loadAndDisplayResults(values['log-path'] as string)
      process.exit()
    }

    let mapPath: string
    let scenPath: string

    if (values['map-path'] == null && values['scen-path'] == null) {
      mapPath = '.'
      scenPath = '.'
    } else if (values['map-path'] == null) {
      mapPath = values['scen-path'] as string
      scenPath = values['scen-path'] as string
    } else if (values['scen-path'] == null) {
      mapPath = values['map-path'] as string
      scenPath = values['map-path'] as string
    } else {
      mapPath = values['map-path'] as string
      scenPath = values['scen-path'] as string
    }

    const isGuardsMap = values['guards'] as boolean
    const scenFiles = readScenFiles(scenPath)
    const mapFiles = getMapFiles(mapPath)

    const algorithms = getAlgorithms()
    const { services, opts } = getOpts(isGuardsMap)

    const results = runScenarios(scenFiles, mapFiles, isGuardsMap, algorithms, services, opts)

    fs.writeFileSync(
      values['out-path'] as string, JSON.stringify(results)
    )
  } catch (err) {
    if (err instanceof Error) {
      console.error(chalk.red(err.message))
      throw err
    } else {
      console.error(chalk.red(String(err)))
    }
    console.log(formatHelp(parseArgsConfig))
    process.exit(1)
  }
}

function runScenarios (
  scenFiles: Map<string, ScenDef[]>,
  mapFiles: Map<string, string>,
  isGuardsMap: boolean,
  algorithms: Algorithm[],
  services: InstanceRegistry<SearchService<any>>,
  opts: { [key: string]: any } = {}
): SerializedBenchmarkResult<any>[] {
  const results: SerializedBenchmarkResult<any>[][] = []
  for (const [scenName, scenDefs] of scenFiles) {
    const suites = prepareSuites(scenDefs, mapFiles, isGuardsMap)
    results.push(runSuites(suites, algorithms, services, opts))
  }
  return results.flat()
}

function generateVacuum () {

}

main()
