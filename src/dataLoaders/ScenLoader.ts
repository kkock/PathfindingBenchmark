import fs from "node:fs"
import path from "node:path"

export interface ScenDef {
  bucket: number
  map: string
  mapSize: { x: number, y: number }
  start: { x: number, y: number }
  goal: { x: number, y: number }
  optimalLength: number
}

export function parseScenLine (source: string): ScenDef {
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
    start: { x: Number(startX), y: Number(startY) },
    goal: { x: Number(goalX), y: Number(goalY) },
    optimalLength: Number(optimalLength)
  }
}

export function parseScen (source: string): ScenDef[] {
  const lines = source.trim().split(/\r\n|\r|\n/)
  if (lines[0] == null || !/^version[\s]+\d+(?:\.\d+)?$/.test(lines[0])) throw new Error('Incorrect version')
  return lines.slice(1).map(parseScenLine)
}

export function readScenFiles (scenPath: string): Map<string, ScenDef[]> {
  const scenPathIsDir = fs.statSync(scenPath).isDirectory()
  const result = new Map()
  if (scenPathIsDir) {
    for (const file of fs.readdirSync(scenPath)) {
      const fullPath = path.join(scenPath, file)
      const parsedScen = parseScen(fs.readFileSync(fullPath).toString())
      const { base } = path.parse(fullPath)
      result.set(base, parsedScen)
    }
  } else {
    const parsedScen = parseScen(fs.readFileSync(scenPath).toString())
    const { base } = path.parse(scenPath)
    result.set(base, parsedScen)
  }
  return result
}