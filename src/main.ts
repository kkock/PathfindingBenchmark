#!/usr/bin/env node

import { parseArgs, ParseArgsConfig } from 'node:util'
import process from 'node:process'

import pkg from '../package.json'
import { ExtendedParseArgsConfig, formatHelp } from './utils'
import chalk from 'chalk'
//import chalk from 'chalk'

const opts: ExtendedParseArgsConfig = {
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
  },
  allowPositionals: true,
}


function main () {
  try {
    const { values, positionals } = parseArgs<ParseArgsConfig>(opts)
  
    if (values['version']) {
      console.log(chalk.yellow(`${pkg.name} `) + chalk.green(`v${pkg.version}\n`))
      process.exit()
    }
    
    if (values['help']) {
      console.log(formatHelp(opts))
      process.exit()
    }
    
    let mapDir: string
    let scenDir: string

    if (values['map-dir'] == null && values['scen-dir'] == null) {
      mapDir = '.'
      scenDir = '.'
    } else if (values['map-dir'] == null) {
      mapDir = values['scen-dir'] as string
      scenDir = values['scen-dir'] as string
    } else if (!values['scen-dir'] == null) {
      mapDir = values['map-dir'] as string
      scenDir = values['map-dir'] as string
    } else {
      mapDir = values['map-dir'] as string
      scenDir = values['scen-dir'] as string
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error(chalk.red(err.message))
    } else {
      console.error(chalk.red(`${err}`))
    }
    console.log(formatHelp(opts))
    process.exit(1)
  }
}

main()