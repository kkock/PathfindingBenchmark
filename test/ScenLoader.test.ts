import { describe, expect, test } from '@jest/globals'
import { parseScen, parseScenLine } from '../src/dataLoaders/ScenLoader'

function getScenFile (version: string, scenarios: string[]): string {
  return `version ${version}\n${scenarios.join('\n')}`
}

function getScenLine (
  bucket: number, map: string,
  width: number, height: number,
  startX: number, startY: number,
  goalX: number, goalY: number,
  optimalLength: number
) {
  return `${bucket} ${map} ${width} ${height} ${startX} ${startY} ${goalX} ${goalY} ${optimalLength}`
}

describe('ScenLoader', () => {
  test('parses valid scen file lines', () => {
    const line = getScenLine(0, 'test.map', 16, 16, 4, 4, 12, 12, 11.313708498984761)
    expect(() => parseScenLine(line, 'foo', 10)).not.toThrow()
    expect(parseScenLine(line, 'foo', 10)).toEqual({
      bucket: 0,
      map: 'test.map',
      mapSize: { x: 16, y: 16 },
      start: { x: 4, y: 4 },
      goal: { x: 12, y: 12 },
      optimalLength: 11.313708498984761,
      fileName: 'foo',
      index: 10
    })
  })

  test('parses valid scen files', () => {
    const scen = getScenFile('1.0', [
      getScenLine(0, 'test.map', 16, 16, 4, 4, 12, 12, 11.313708498984761)
    ])
    expect(() => parseScen(scen, 'foo')).not.toThrow()
    expect(parseScen(scen, 'foo')).toEqual([{
      bucket: 0,
      map: 'test.map',
      mapSize: { x: 16, y: 16 },
      start: { x: 4, y: 4 },
      goal: { x: 12, y: 12 },
      optimalLength: 11.313708498984761,
      fileName: 'foo',
      index: 0
    }])
  })

  test('does not parse scen files with an invalid header', () => {
    const scen = getScenFile('foo', [
      getScenLine(0, 'test.map', 16, 16, 4, 4, 12, 12, 11.313708498984761)
    ])
    expect(() => parseScen(scen, 'foo')).toThrow()
  })

  test('does not parse scen file lines with the wrong number of arguments', () => {
    const line = '0 test.map 16 16'
    expect(() => parseScenLine(line, 'foo', 10)).toThrow()
  })
})