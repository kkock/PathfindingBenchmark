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
