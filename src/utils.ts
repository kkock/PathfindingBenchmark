//import { parseArgs } from "node:util";

import type { ParseArgsConfig, ParseArgsOptionDescriptor, ParseArgsOptionsConfig } from "node:util"
import pkg from '../package.json'
import chalk from 'chalk'

export type ExtendedOptionDescriptor = ParseArgsOptionDescriptor & {
  description?: string,
  defaultDescription?: string,
  required?: boolean
}

export type ExtendedParseArgsConfig = ParseArgsConfig & {
  options?: ParseArgsOptionsConfig & {
    [longOption: string]: ExtendedOptionDescriptor
  }
}

export function formatHelp({ options = {}, positional = {}, allowPositionals = true }) {
  const lines = []

  lines.push(chalk.bold('Usage:'))
  lines.push(`  ${Object.keys(pkg.bin)[0] as string} [options]\n`)

  const optionEntries: [string, ExtendedOptionDescriptor][] = Object.entries(options)

  if (optionEntries.length > 0) {
    lines.push(chalk.bold('Options:'))

    for (const [name, opt] of optionEntries) {
      const flags = []

      flags.push(chalk.cyan(`--${name}`))
      if (opt.short) flags.push(chalk.cyan(`-${opt.short}`))

      const type = chalk.yellow(opt.type ?? 'string')
      const required = (opt.required ?? false) ? ' (required)' : null
      const defaultValue =  chalk.gray(opt.default !== undefined
        ? ` (default: ${JSON.stringify(opt.default)})`
        : opt.defaultDescription !== undefined
        ? ` (${opt.defaultDescription})`
        : '')
      const description = opt.description
        ? `  ${opt.description}`
        : ''

      lines.push(`  ${flags.join(', ').padEnd(35)} ${type}${required ?? defaultValue}\n    ${description}\n`)
    }

    lines.push('')
  }

  if (allowPositionals && Object.keys(positional).length > 0) {
    lines.push(chalk.bold('Positionals:'))

    const positionalEntries: [string, ExtendedOptionDescriptor][] = Object.entries(positional)
    for (const [name, spec] of positionalEntries) {
      const desc = spec.description ? ` - ${spec.description}` : ""
      lines.push(`  ${chalk.cyan(name)}${desc}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function generateCombinations(input: Record<string, any[]>): Record<string, any>[] {
  const keys = Object.keys(input)
  return keys.reduce<Record<string, any>[]>((combinations, key) => {
    const values = input[key] as any[]
    return combinations.flatMap(combination => values.map(value => ({ ...combination, [key]: value })))
  }, [{}])
}