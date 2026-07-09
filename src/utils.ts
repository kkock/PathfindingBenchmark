// import { parseArgs } from "node:util";

import type { ParseArgsConfig, ParseArgsOptionDescriptor, ParseArgsOptionsConfig } from 'node:util'
import pkg from '../package.json'
import chalk from 'chalk'

export type ExtendedOptionDescriptor = ParseArgsOptionDescriptor & {
  description?: string
  defaultDescription?: string
  required?: boolean
}

export type ExtendedParseArgsConfig = ParseArgsConfig & {
  options?: ParseArgsOptionsConfig & {
    [longOption: string]: ExtendedOptionDescriptor
  }
}

export function formatHelp ({
  options = {},
  positional = {},
  allowPositionals = true,
  cmd = Array<string>()
}): string {
  const lines = []

  lines.push(chalk.bold('Usage:'))
  const commands = cmd.length > 0 ? cmd.join(' ') + ' ' : ''
  lines.push(`  ${Object.keys(pkg.bin)[0] as string} ${commands}[options]\n`)

  const optionEntries: Array<[string, ExtendedOptionDescriptor]> = Object.entries(options)

  if (optionEntries.length > 0) {
    lines.push(chalk.bold('Options:'))

    for (const [name, opt] of optionEntries) {
      const flags = []

      flags.push(chalk.cyan(`--${name}`))
      if (opt.short != null) flags.push(chalk.cyan(`-${opt.short}`))

      const type = chalk.yellow(opt.type ?? 'string')
      const required = (opt.required ?? false) ? ' (required)' : null
      const defaultValue = chalk.gray(opt.default !== undefined
        ? ` (default: ${JSON.stringify(opt.default)})`
        : opt.defaultDescription !== undefined
          ? ` (${opt.defaultDescription})`
          : '')
      const description = opt.description != null
        ? `  ${opt.description}`
        : ''

      lines.push(`  ${flags.join(', ').padEnd(35)} ${type}${required ?? defaultValue}\n    ${description}\n`)
    }

    lines.push('')
  }

  if (allowPositionals && Object.keys(positional).length > 0) {
    lines.push(chalk.bold('Positionals:'))

    const positionalEntries: Array<[string, ExtendedOptionDescriptor]> = Object.entries(positional)
    for (const [name, spec] of positionalEntries) {
      const desc = spec.description != null ? ` - ${spec.description}` : ''
      lines.push(`  ${chalk.cyan(name)}${desc}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function generateCombinations<V> (input: Record<string, readonly V[]>): Array<Record<string, V>>
export function generateCombinations<K, V> (input: ReadonlyMap<K, readonly V[]>): Array<Map<K, V>>
export function generateCombinations<K, V> (input: Record<string, readonly V[]> | ReadonlyMap<K, readonly V[]>): Array<Record<string, V>> | Array<Map<K, V>> {
  if (input instanceof Map) {
    return [...(input as ReadonlyMap<K, readonly V[]>).entries()].reduce<Array<Map<K, V>>>(
      (combinations, [key, values]) =>
        combinations.flatMap(combination =>
          values.map(value => {
            const next = new Map(combination)
            next.set(key, value)
            return next
          })
        ),
      [new Map()]
    )
  } else {
    return Object.keys(input as Record<string, readonly V[]>).reduce<Array<Record<string, V>>>((combinations, key) => {
      const values = (input as Record<string, readonly V[]>)[key] as V[]
      return combinations.flatMap(combination => values.map(value => ({ ...combination, [key]: value })))
    }, [{}])
  }
}

export function getMedianElement<T> (array: T[]): T {
  return array[Math.floor(array.length / 2)] as T
}

export function alignDecimals<K extends keyof any> (
  values: { [P in K]: number | null | undefined },
  // Record<string, number | null | undefined>,
  opts: { minPrecision?: number, maxPrecision?: number } = {}
): { [P in K]: string } {
  const entries = Object.entries<number | null | undefined>(values)

  const minPrecision = opts.minPrecision ?? 0
  const maxPrecision = opts.maxPrecision ?? Infinity

  const pointChars: Record<string, string> = {}
  const intChars: Record<string, string> = {}
  const fracChars: Record<string, string> = {}

  for (const [key, value] of entries) {
    if (value == null || isNaN(value)) {
      pointChars[key] = '-'
      intChars[key] = ''
      fracChars[key] = ''
    } else {
      const strValue = value.toString()
      const pointIndex = strValue.indexOf('.')

      if (pointIndex === -1) {
        intChars[key] = strValue
        pointChars[key] = ' '
        fracChars[key] = ''
      } else {
        const fracStr = strValue.slice(pointIndex)
        let precision = fracStr.length
        if (precision > maxPrecision) precision = maxPrecision
        if (precision < minPrecision) precision = minPrecision
        intChars[key] = strValue.slice(0, pointIndex)
        pointChars[key] = '.'
        fracChars[key] = parseFloat(fracStr).toFixed(precision).slice(2)
      }
    }
  }

  const intMaxLength = Math.max(...Object.values(intChars).map(v => v.length))
  const fracMaxLength = Math.max(...Object.values(fracChars).map(v => v.length))
  const result: Record<string, string> = {}

  for (const [key, value] of entries) {
    const padChar = value == null || isNaN(value) ? '-' : ' '
    intChars[key] = (intChars[key] as string).padStart(intMaxLength, padChar)
    fracChars[key] = (fracChars[key] as string).padEnd(fracMaxLength, padChar)
    result[key] = `${intChars[key]}${pointChars[key] as string}${fracChars[key]}`
  }

  return result as { [P in K]: string }
}

export function toXterm216 (r: number, g: number, b: number): number {
  function quantize (col8Bit: number): number {
    if (col8Bit <= 47) return 0
    if (col8Bit <= 114) return 1
    if (col8Bit <= 154) return 2
    if (col8Bit <= 194) return 3
    if (col8Bit <= 234) return 4
    return 5
  }

  return 16 + 36 * quantize(Math.round(r)) + 6 * quantize(Math.round(g)) + quantize(Math.round(b))
}

export function lerp (a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp (value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function inverseLerp (a: number, b: number, t: number): number {
  return (t - a) / (b - a)
}

/*export function binomialCoefficient (n: number, k: number): number {
  if (k > n) return 0
  if (k === 0 || k === n) return 1

  let result = 1
  for (let i = 1; i <= k; i++) {
    result *= (n - k + i) / i
  }
  return result
}*/

/**
 * Shuffle an array in-place
 */
export function shuffle<T> (array: T[], rand = Math.random): T[] {
  for (let i = 0; i < array.length; ++i) {
    const j = Math.floor(rand() * array.length)
    ;[array[i], array[j]] = [array[j]!, array[i]!]
  }
  return array
}

/**
 * Shuffle an array subset in-place
 */
export function shuffleSubset<T> (array: T[], indices: number[], rand = Math.random): T[] {
  for (const i of indices) {
    const j = indices[Math.floor(rand() * indices.length)]!
    ;[array[i], array[j]] = [array[j]!, array[i]!]
  }
  return array
}


export function toGrid<T> (array: T[], width: number): T[][] {
  if (array.length % width !== 0) {
    throw new Error('Array length must be a multiple of the width.')
  }

  const height = array.length / width
  return Array.from({ length: height }, (_, y) => array.slice(y * width, (y + 1) * width))
}