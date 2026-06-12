import fs from 'node:fs'

import { getMedianElement } from '../utils'
import type { ProcessedSingleBenchmarkResult, SerializedBenchmarkResult } from './Suite'
import chalk from 'chalk'

function groupBenchmarkResultsByScenario (source: string): Map<string, SerializedBenchmarkResult[]> {
  const lines = source.trim().split('\n').map(str => JSON.parse(str.trim()) as SerializedBenchmarkResult)
  const resultsByScenario = new Map<string, SerializedBenchmarkResult[]>()
  for (const line of lines) {
    const key = line.result.scenario
    if (!resultsByScenario.has(key)) resultsByScenario.set(key, [])
    ;(resultsByScenario.get(key) as SerializedBenchmarkResult[]).push(line)
  }
  return resultsByScenario
}

export interface AveragedBenchmarkResult {
  algorithm: string
  services: { [key: string]: string }
  opts: { [key: string]: any }
  result: ProcessedSingleBenchmarkResult
}

function selectMedian (line: SerializedBenchmarkResult): AveragedBenchmarkResult {
  const sortAscending: (a: number, b: number) => number = (a, b) => a - b
  const result: ProcessedSingleBenchmarkResult = {
    results: line.result.results.map(entry => {
      return {
        cost: getMedianElement(entry.cost.toSorted(sortAscending)),
        time: getMedianElement(entry.time.toSorted(sortAscending)),
        searchMetrics: {
          nodesGenerated: getMedianElement(entry.searchMetrics.nodesGenerated.toSorted(sortAscending)),
          nodesExpanded: getMedianElement(entry.searchMetrics.nodesExpanded.toSorted(sortAscending))
        }
      }
    }),
    scenario: line.result.scenario
  }

  return {
    algorithm: line.algorithm,
    services: line.services,
    opts: line.opts,
    result
  }
}

export function loadAndDisplayResults (fileName: string): void {
  const groupedResults = groupBenchmarkResultsByScenario(fs.readFileSync(fileName).toString())

  for (const [scenario, results] of groupedResults.entries()) {
    console.log(`Scenario '${chalk.cyan(scenario)}':`)

    let minFirstTime = Infinity
    let minFinalTime = Infinity
    let minFirstCost = Infinity
    let minFinalCost = Infinity
    let minNodesExpanded = Infinity
    let minNodesGenerated = Infinity

    const processedResults = results.map(entry => {
      const medianEntry = selectMedian(entry)
      const opts = stringifyOptions(medianEntry.algorithm, medianEntry.services, medianEntry.opts)
      const dataPoints = medianEntry.result.results

      const firstDataPoint = dataPoints[0]
      const finalDataPoint = dataPoints[dataPoints.length - 1]

      const timeToFirstSolution = firstDataPoint?.time
      const timeToFinalSolution = finalDataPoint?.time

      const firstCost = firstDataPoint?.cost
      const finalCost = finalDataPoint?.cost

      const nodesExpanded = finalDataPoint?.searchMetrics.nodesExpanded
      const nodesGenerated = finalDataPoint?.searchMetrics.nodesGenerated

      minFirstTime = Math.min(minFirstTime, timeToFirstSolution ?? Infinity)
      minFinalTime = Math.min(minFinalTime, timeToFinalSolution ?? Infinity)
      minFirstCost = Math.min(minFirstCost, firstCost ?? Infinity)
      minFinalCost = Math.min(minFinalCost, finalCost ?? Infinity)
      minNodesExpanded = Math.min(minNodesExpanded, nodesExpanded ?? Infinity)
      minNodesGenerated = Math.min(minNodesGenerated, nodesGenerated ?? Infinity)

      return {
        opts,
        timeToFirstSolution,
        timeToFinalSolution,
        firstCost,
        finalCost,
        nodesExpanded,
        nodesGenerated
      }
    })

    for (const result of processedResults) {
      console.log(chalk.gray(`  ${result.opts}`))
      displayStat('Time to first solution:', result.timeToFirstSolution, minFirstTime)
      displayStat('Time to best solution: ', result.timeToFinalSolution, minFinalTime)
      displayStat('First solution cost:   ', result.firstCost, minFirstCost)
      displayStat('Best solution cost:    ', result.finalCost, minFinalCost)
      displayStat('Nodes generated:       ', result.nodesGenerated, minNodesGenerated)
      displayStat('Nodes expanded:        ', result.nodesExpanded, minNodesExpanded)
      console.log()
    }
  }
}

function displayStat (name: string, value: number | undefined, expected: number): void {
  const percentage = Math.round(((value ?? Infinity) / expected) * 10000 - 10000) / 100
  if (value === expected || percentage < 5) {
    console.log(`    ${name} ${chalk.yellow(value)} ${chalk.green(`(+ ${percentage.toFixed(2)}%)`)}`)
  } else {
    console.log(`    ${name} ${chalk.yellow(value)} ${chalk.red(`(+ ${percentage.toFixed(2)}%)`)}`)
  }
}

function stringifyOptions (algorithm: string, services: { [key: string]: string }, opts: { [key: string]: any }): string {
  const data: { [key: string]: any } = {}
  data['algorithm'] = algorithm
  data['heuristic'] = services['Heuristic']
  data['cost'] = services['Cost']
  for (const key of Object.keys(opts)) data[key] = opts[key]

  const result = []
  for (const key of Object.keys(data)) {
    const value = data[key]
    result.push(
      typeof value === 'string'
        ? `${key}='${value}'`
        : `${key}=${value}`
    )
  }

  return result.join('; ')
}
