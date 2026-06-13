import fs from 'node:fs'

import { alignDecimals, clamp, getMedianElement, inverseLerp, lerp, toXterm216 } from '../utils'
import type { ProcessedSingleBenchmarkResult, SerializedBenchmarkResult } from './Suite'
import chalk, { ChalkInstance } from 'chalk'

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
    let minFirstNodesExpanded = Infinity
    let minFinalNodesExpanded = Infinity
    let minFirstNodesGenerated = Infinity
    let minFinalNodesGenerated = Infinity

    let maxFirstTime = 0
    let maxFinalTime = 0
    let maxFirstCost = 0
    let maxFinalCost = 0
    let maxFirstNodesExpanded = 0
    let maxFinalNodesExpanded = 0
    let maxFirstNodesGenerated = 0
    let maxFinalNodesGenerated = 0

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

      const firstNodesExpanded = firstDataPoint?.searchMetrics.nodesExpanded
      const finalNodesExpanded = finalDataPoint?.searchMetrics.nodesExpanded

      const firstNodesGenerated = firstDataPoint?.searchMetrics.nodesGenerated
      const finalNodesGenerated = finalDataPoint?.searchMetrics.nodesGenerated

      minFirstTime = Math.min(minFirstTime, timeToFirstSolution ?? Infinity)
      minFinalTime = Math.min(minFinalTime, timeToFinalSolution ?? Infinity)
      minFirstCost = Math.min(minFirstCost, firstCost ?? Infinity)
      minFinalCost = Math.min(minFinalCost, finalCost ?? Infinity)
      minFirstNodesExpanded = Math.min(minFirstNodesExpanded, firstNodesExpanded ?? Infinity)
      minFinalNodesExpanded = Math.min(minFinalNodesExpanded, finalNodesExpanded ?? Infinity)
      minFirstNodesGenerated = Math.min(minFirstNodesGenerated, firstNodesGenerated ?? Infinity)
      minFinalNodesGenerated = Math.min(minFinalNodesGenerated, finalNodesGenerated ?? Infinity)

      maxFirstTime = Math.max(maxFirstTime, timeToFirstSolution ?? 0)
      maxFinalTime = Math.max(maxFinalTime, timeToFinalSolution ?? 0)
      maxFirstCost = Math.max(maxFirstCost, firstCost ?? 0)
      maxFinalCost = Math.max(maxFinalCost, finalCost ?? 0)
      maxFirstNodesExpanded = Math.max(maxFirstNodesExpanded, firstNodesExpanded ?? 0)
      maxFinalNodesExpanded = Math.max(maxFinalNodesExpanded, finalNodesExpanded ?? 0)
      maxFirstNodesGenerated = Math.max(maxFirstNodesGenerated, firstNodesGenerated ?? 0)
      maxFinalNodesGenerated = Math.max(maxFinalNodesGenerated, finalNodesGenerated ?? 0)

      return {
        opts,
        data: {
          timeToFirstSolution,
          timeToFinalSolution,
          firstCost,
          finalCost,
          firstNodesExpanded,
          finalNodesExpanded,
          firstNodesGenerated,
          finalNodesGenerated
        }
      }
    })

    for (const { opts, data } of processedResults) {
      const processedData = alignDecimals(data)
      console.log(chalk.gray(`  ${opts}`))
      console.log('    First solution:')
      displayStat('Time:      ', processedData.timeToFirstSolution, minFirstTime, maxFirstTime)
      displayStat('Cost:      ', processedData.firstCost, minFirstCost, maxFirstCost)
      displayStat('Nodes:     ', processedData.firstNodesGenerated, minFirstNodesGenerated, maxFirstNodesGenerated)
      displayStat('Expansions:', processedData.firstNodesExpanded, minFirstNodesExpanded, maxFirstNodesExpanded)

      console.log('    Best solution:')
      displayStat('Time:      ', processedData.timeToFinalSolution, minFinalTime, maxFinalTime)
      displayStat('Cost:      ', processedData.finalCost, minFinalCost, maxFinalCost)
      displayStat('Nodes:     ', processedData.finalNodesGenerated, minFinalNodesGenerated, maxFinalNodesGenerated)
      displayStat('Expansions:', processedData.finalNodesExpanded, minFinalNodesExpanded, maxFinalNodesExpanded)
      console.log()
    }
  }
}

function displayStat (name: string, value: string, expected: number, max: number): void {
  let numValue = Number(value)
  if (isNaN(numValue)) numValue = Infinity

  let maxPercentage = Math.round((max / expected) * 10000 - 10000) / 100
  if (isNaN(maxPercentage)) maxPercentage = Infinity

  let percentage = Math.round((numValue / expected) * 10000 - 10000) / 100
  if (isNaN(percentage)) percentage = Infinity

  let style: ChalkInstance
  if (percentage < 0.01) {
    style = chalk.bold.white.bgGreen
  } else if (percentage === Infinity || Math.abs(percentage - maxPercentage) < 0.01) {
    style = chalk.bold.white.bgRed
  } else if (percentage > 250) {
    style = chalk.bold.ansi256(160)
  } else if (percentage > 500) {
    style = chalk.bold.ansi256(124)
  } else if (percentage > 1000) {
    style = chalk.bold.ansi256(88)
  } else {
    const r = lerp(0, 255, clamp(inverseLerp(0, 25, percentage), 0, 1))
    const g = lerp(255, 0, clamp(inverseLerp(25, 250, percentage), 0, 1))
    style = chalk.bold.ansi256(toXterm216(r, g, 0))
  }

  console.log(`      ${chalk.italic(name)} ${chalk.cyan(value)} ${style(`(+ ${percentage.toFixed(2)}%)`)}`)
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
        : `${key}=${value}` // eslint-disable-line @typescript-eslint/restrict-template-expressions
    )
  }

  return result.join('; ')
}
