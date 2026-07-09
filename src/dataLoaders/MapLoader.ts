import { GridGraph, GridVertex } from '../graph/GridGraph'
import { type VacuumState, VacuumWorld } from '../graph/VacuumWorldGraph'
import type { GenericScenDef } from './ScenLoader'

import fs from 'node:fs'
import path from 'node:path'

/* function parse (str: string | undefined, pattern: RegExp): string[] {
  if (str == null) return []
  const match = str.match(pattern)
  if (match == null) return []

  return match.slice(1)
} */

export function parseMap (source: string): string[][] {
  const lines = source.trim().split(/\r\n|\r|\n/)
  if (lines[0] == null || !/^type[\s]octile$/.test(lines[0].trim())) {
    console.error({ lines0: lines[0] })
    throw new Error('Missing "type octile" on line 1')
  }
  if (lines[3] == null || !/^map$/.test(lines[3].trim())) throw new Error('Missing "map" on line 4')

  /* const [height] = parse(lines[1], /^height[\s]+([\d]+)$/)
  const [width] = parse(lines[2], /^width[\s]+([\d]+)$/) */

  const map = lines.slice(4).map(str => str.split(''))
  // if (map.length !== Number(height)) throw new Error(`Invalid map file: Expected a height of ${Number(height)}, but received a height of `)
  return map
}

export function isPassable (str: string, opts: { passable: Set<string>, impassable?: undefined } | { passable?: undefined, impassable: Set<string> }): boolean {
  if (opts.passable != null) {
    return opts.passable.has(str)
  } else {
    return !opts.impassable.has(str)
  }
}

export function gridGraphFromMap (map: string[][], neighborPolicy: Array<[number, number]>, opts: { passable: Set<string> } | { impassable: Set<string> }): GridGraph {
  const graph = new GridGraph()
  for (let y = 0; y < map.length; y++) {
    const row = map[y] as string[]
    for (let x = 0; x < row.length; x++) {
      graph.addVertex(`${x},${y}`, new GridVertex(x, y, row[x] as string))
    }
  }

  for (let y = 0; y < map.length; y++) {
    const row = map[y] as string[]
    for (let x = 0; x < row.length; x++) {
      for (const [dx, dy] of neighborPolicy) {
        // Ensure we don't go out of bounds
        if (x + dx < 0 || x + dx >= row.length) continue
        if (y + dy < 0 || y + dy >= map.length) continue

        const keys = ([[x, y], [x + dx, y], [x, y + dy], [x + dx, y + dy]] as Array<[number, number]>)
          .map(([x, y]) => `${x},${y}`) as [string, string, string, string]

        if (keys.every(key => isPassable((graph.getVertex(key) as GridVertex).value, opts))) {
          ;(graph.getVertex(keys[0]) as GridVertex).addNeighbor(graph.getVertex(keys[3]) as GridVertex)
        }
      }
    }
  }

  return graph
}

export function vacuumWorldFromMap (fileName: string, map: string[][]): {
  domain: VacuumWorld,
  scen: GenericScenDef<VacuumState>
} {
  if (map.length === 0 || map[0]!.length === 0) throw new RangeError('Invalid map size')
  
  const domain = new VacuumWorld(map[0]!.length, map.length)
  let startPos: number | undefined = undefined

  for (let y = 0; y < map.length; ++y) {
    for (let x = 0; x < map[y]!.length; ++x) {
      const char = map[y]![x]!
      switch (char) {
        case '#': // Wall
          domain.passable[domain.getIndex(x, y)] = false
          break

        case '@': // Start pos
          startPos = domain.getIndex(x, y)
          break

        case '.': // Empty space
          break
        
        default: {
          const num = parseInt(char, 36)
          if (isNaN(num)) throw new RangeError(`Invalid dirt pile index '${char}'`)
          domain.addDirt(num, x, y)
        } break
      }
    }
  }

  if (startPos == null) throw new RangeError('Robot needs a starting position')

  let initialMask = 0
  for (let i = 0; i < domain.dirtPositions.length; i++) {
    initialMask |= (2 ** i)
  }

  return {
    domain,
    scen: {
      start: { robotPosition: startPos, remaining: initialMask },
      goal: { robotPosition: -1, remaining: 0 },
      fileName,
      index: 0
    }
  }
}

gridGraphFromMap.movingAiOpts = { passable: new Set('.G') }
gridGraphFromMap.guardsOpts = { impassable: new Set('@') }
gridGraphFromMap.diagonalNeighborPolicy = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
] as Array<[number, number]>

export function getMapFiles (mapPath: string): Map<string, string> {
  const mapPathIsDir = fs.statSync(mapPath).isDirectory()
  const result = new Map()
  if (mapPathIsDir) {
    for (const file of fs.readdirSync(mapPath)) {
      const fullPath = path.join(mapPath, file)
      const { base } = path.parse(fullPath)
      result.set(base, fullPath)
    }
  } else {
    const { base } = path.parse(mapPath)
    result.set(base, mapPath)
  }

  return result
}

export function writeMapFile (path: string, map: string[][], asPromise: true): Promise<void>
export function writeMapFile (path: string, map: string[][], asPromise?: false): void
export function writeMapFile (
  path: string,
  map: string[][],
  promise?: boolean
): Promise<void> | void {
  const height = map.length
  if (height === 0) throw new Error(`Maps must have a height of at least 1`)
  const width = map[0]!.length
  if (width === 0) throw new Error(`Maps must have a width of at least 1`)
  if (map.some(row => row.length !== width)) throw new Error(`Maps must be rectangular`)
  if (map.some(row => row.some(cell => cell.length !== 1))) throw new Error(`Map cells must be a single char`)

  const data =
    'type octile\n' +
    `height ${height}\n` +
    `width ${width}\n` +
    `map\n` +
    map.map(row => row.join('')).join('\n') +
    '\n'

  if (promise != null && promise) {
    return fs.promises.writeFile(path, data)
  } else {
    return fs.writeFileSync(path, data)
  }
}
