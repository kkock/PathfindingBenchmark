import type { Point } from '../graph/GridGraph'

import fs from 'node:fs'
import path from 'node:path'

export interface ScenDef extends GenericScenDef<Point> {
  bucket: number
  map: string
  mapSize: { x: number, y: number }
  start: Point
  goal: Point
  optimalLength: number
  fileName: string
  index: number
}

export interface GenericScenDef<S> {
  start: S
  goal: S
  fileName: string,
  index: number
}

export function parseScenLine (source: string, fileName: string, lineIndex: number): ScenDef {
  const lineArgs = source.trim().split(/\s+/)
  const [
    bucket,
    map,
    mapWidth, mapHeight,
    startX, startY,
    goalX, goalY,
    optimalLength
  ] = lineArgs

  if (lineArgs.length !== 9) throw new Error(`Expected 9 arguments, but received ${lineArgs.length}`)

  return {
    bucket: Number(bucket),
    map: String(map),
    mapSize: { x: Number(mapWidth), y: Number(mapHeight) },
    start: [Number(startX), Number(startY)],
    goal: [Number(goalX), Number(goalY)],
    optimalLength: Number(optimalLength),
    fileName,
    index: lineIndex
  }
}

export function parseScen (source: string, fileName: string): ScenDef[] {
  const lines = source.trim().split(/\r\n|\r|\n/)
  if (lines[0] == null || !/^version[\s]+\d+(?:\.\d+)?$/.test(lines[0])) throw new Error('Incorrect version')
  return lines.slice(1).map((v, i) => parseScenLine(v, fileName, i))
}

export function readScenFiles (scenPath: string): Map<string, ScenDef[]> {
  const scenPathIsDir = fs.statSync(scenPath).isDirectory()
  const result = new Map()
  if (scenPathIsDir) {
    for (const file of fs.readdirSync(scenPath, { recursive: true })) {
      const fullPath = path.join(scenPath, file as string)
      if (fs.statSync(fullPath).isDirectory()) continue
      if (!fullPath.endsWith('.scen')) continue
      const parsedScen = parseScen(fs.readFileSync(fullPath).toString(), fullPath)
      const { base } = path.parse(fullPath)
      result.set(base, parsedScen)
    }
  } else {
    const parsedScen = parseScen(fs.readFileSync(scenPath).toString(), scenPath)
    const { base } = path.parse(scenPath)
    result.set(base, parsedScen)
  }
  return result
}
