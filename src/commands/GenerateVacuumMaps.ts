import process from 'node:process'
import chalk from 'chalk'

import pkg from '../../package.json'
import { ExtendedParseArgsConfig, formatHelp } from "../utils"
import { parseArgs, ParseArgsConfig } from 'node:util'
import { writeNewVacuumWorlds } from '../dataLoaders/VacuumWorldGenerator'

const parseArgsConfig: ExtendedParseArgsConfig & { cmd: string[] } = {
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

    size: {
      type: 'string',
      short: 's',
      description: `The grid size, formatted as ${chalk.green('"w,h"')}.`,
      required: true
    },
    count: {
      type: 'string',
      short: 'c',
      description: `The amount of maps to generate.`,
      required: true
    },
    'out-path': {
      type: 'string',
      short: 'o',
      description: 'The directory to write the results to.',
      required: true
    },
    filename: {
      type: 'string',
      short: 'f',
      description: 'The filename template.'
    },

    'obstacle-count': {
      type: 'string',
      description: 'How many obstacles to place.'
    },
    'obstacle-chance': {
      type: 'string',
      description: 'Chance to place an obstacle.'
    },
    'dirt-count': {
      type: 'string',
      description: 'How many dirt piles to place.'
    },
    'dirt-chance': {
      type: 'string',
      description: 'Chance to place a dirt pile.'
    }
  },
  allowPositionals: true,
  cmd: ['generate-vacuum']
}

export function generateVacuumMaps () {
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

    if ((values['obstacle-count'] != null) === (values['obstacle-chance'] != null)) {
      console.log(chalk.red(`Error: Exactly one of ${chalk.green('"--obstacle-count"')} and ${chalk.green('"--obstacle-chance"')} must be provided.`))
      console.log(formatHelp(parseArgsConfig))
      process.exit(1)
    }

    if ((values['dirt-count'] != null) === (values['dirt-chance'] != null)) {
      console.log(chalk.red(`Error: Exactly one of ${chalk.green('"--dirt-count"')} and ${chalk.green('"--dirt-chance"')} must be provided.`))
      console.log(formatHelp(parseArgsConfig))
      process.exit(1)
    }

    const [width, height] = (values['size'] as string).trim().split(/[, ]/)

    let dirtOpts: {
      dirtChance: number,
      dirtCount?: never,
    } | {
      dirtChance?: never,
      dirtCount: number,
    }

    let obstacleOpts: {
      blockedChance: number,
      blockedCount?: never,
    } | {
      blockedChance?: never,
      blockedCount: number,
    }

    if (values['dirt-chance'] != null) {
      dirtOpts = { dirtChance: Number(values['dirt-chance']) }
    } else {
      dirtOpts = { dirtCount: Number(values['dirt-count']) }
    }

    if (values['obstacle-chance'] != null) {
      obstacleOpts = { blockedChance: Number(values['obstacle-chance']) }
    } else {
      obstacleOpts = { blockedCount: Number(values['obstacle-count']) }
    }

    writeNewVacuumWorlds(
      Number(width),
      Number(height),
      {
        ...dirtOpts,
        ...obstacleOpts,
        rand: Math.random
      },
      Number(values['count']),
      String(values['out-path']),
      values['filename-template'] != null
        ? String(values['filename-template'])
        : undefined
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