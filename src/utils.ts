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

export function formatHelp ({ options = {}, positional = {}, allowPositionals = true }): string {
  const lines = []

  lines.push(chalk.bold('Usage:'))
  lines.push(`  ${Object.keys(pkg.bin)[0] as string} [options]\n`)

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

/* export function alignDecimals (values: Record<string, number | null | undefined>): Record<string, string> {
  const entries = Object.entries(values)

  // First pass: convert values to strings and collect widths
  const converted = entries.map(([key, value]) => {
    if (value == null || Number.isNaN(value)) {
      return {
        key,
        text: '-',
        integerLength: 1,
        fractionalLength: 0,
        hasDecimal: false
      }
    }

    const text = String(value)
    const dotIndex = text.indexOf('.')

    if (dotIndex === -1) {
      return {
        key,
        text,
        integerLength: text.length,
        fractionalLength: 0,
        hasDecimal: false
      }
    }

    return {
      key,
      text,
      integerLength: dotIndex,
      fractionalLength: text.length - dotIndex - 1,
      hasDecimal: true
    }
  })

  const maxIntegerLength = Math.max(
    ...converted.map(v => v.integerLength)
  )

  const maxFractionalLength = Math.max(
    ...converted.map(v => v.fractionalLength)
  )

  // Second pass: pad each string
  const result: Record<string, string> = {}

  for (const value of converted) {
    const dotIndex = value.text.indexOf('.')

    let integerLength: number
    let fractionalLength: number

    if (dotIndex === -1) {
      integerLength = value.text.length
      fractionalLength = 0
    } else {
      integerLength = dotIndex
      fractionalLength = value.text.length - dotIndex - 1
    }

    const leftPadding = ' '.repeat(
      maxIntegerLength - integerLength
    )

    const rightPadding = ' '.repeat(
      maxFractionalLength - fractionalLength
    )

    result[value.key] =
            leftPadding + value.text + rightPadding
  }

  return result
}
*/

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
