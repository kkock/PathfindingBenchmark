import { Graph, Vertex } from '../Graph'

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

export function graphFromMap (map: string[][], neighborPolicy: Array<[number, number]>, opts: { passable: Set<string> } | { impassable: Set<string> }): Graph {
  const graph = new Graph()
  for (let y = 0; y < map.length; y++) {
    const row = map[y] as string[]
    for (let x = 0; x < row.length; x++) {
      graph.addVertex(`${x},${y}`, new Vertex(x, y, row[x] as string))
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

        if (keys.every(key => isPassable((graph.getVertex(key) as Vertex).value, opts))) {
          ;(graph.getVertex(keys[0]) as Vertex).addNeighbor(graph.getVertex(keys[3]) as Vertex)
        }
      }
    }
  }

  return graph
}

graphFromMap.movingAiOpts = { passable: new Set('.G') }
graphFromMap.guardsOpts = { impassable: new Set('@') }
graphFromMap.diagonalNeighborPolicy = [
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
