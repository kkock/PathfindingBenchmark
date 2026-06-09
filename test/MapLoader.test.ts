import { describe, expect, test } from '@jest/globals'
import { parseMap, isPassable, graphFromMap } from '../src/dataLoaders/MapLoader'
import { diagonalNeighborPolicy, strTo2DArr } from './utils'

function getMapFile (str: string[][]) {
  let map = ''
  for (const row of str) map += `${row.join('')}\n`
  const width = str[0]!.length
  const height = str.length
  return (
    'type octile\n' +
    `height ${height}\n` +
    `width ${width}\n` +
    'map\n' +
    map
  )
}

describe('MapLoader', () => {
  test('parses valid map files', () => {
    const map = strTo2DArr(`
      12345678
      qwertyui
      asdfghjk
      zxcvbnm,
    `)
    expect(() => parseMap(getMapFile(map))).not.toThrow()
    expect(parseMap(getMapFile(map))).toEqual(map)
  })

  test('does not parse invalid map files', () => {
    const map = strTo2DArr(`
      12345678
      qwertyui
      asdfghjk
      zxcvbnm,
    `)
    const mapFile = getMapFile(map)
    expect(() => parseMap(mapFile.replace(/map/, 'maap'))).toThrow()
    expect(() => parseMap(mapFile.replace(/octile/, 'octopus'))).toThrow()
  })
})

describe('isPassable', () => {
  test('identifies explicitly passable tiles as passable', () => {
    expect(isPassable('A', { passable: new Set('A') })).toBe(true)
  })

  test('identifies explicitly impassable tiles as impassable', () => {
    expect(isPassable('A', { impassable: new Set('A') })).toBe(false)
  })

  test('identifies implicitly passable tiles as passable', () => {
    expect(isPassable('A', { impassable: new Set('B') })).toBe(true)
  })
  
  test('identifies implicitly impassable tiles as impassable', () => {
    expect(isPassable('A', { passable: new Set('B') })).toBe(false)
  })
})

describe('graphFromMap', () => {
  test('creates edges between orthogonally adjacent passable tiles', () => {
    const map = strTo2DArr(`
      ..
      .@
    `)
    const graph = graphFromMap(map, diagonalNeighborPolicy, { passable: new Set('.') })
    expect(graph.getVertex('0,0')!.neighbors).toContain(graph.getVertex('0,1'))
    expect(graph.getVertex('0,0')!.neighbors).toContain(graph.getVertex('1,0'))
  })

  test('creates no edges between orthogonally adjacent impassable tiles', () => {
    const map = strTo2DArr(`
      ..
      .@
    `)
    const graph = graphFromMap(map, diagonalNeighborPolicy, { passable: new Set('@') })
    expect(graph.getVertex('0,0')!.neighbors).not.toContain(graph.getVertex('0,1'))
    expect(graph.getVertex('0,0')!.neighbors).not.toContain(graph.getVertex('1,0'))
  })

  test('creates edges between diagonally adjacent passable tiles that don\'t cut corners', () => {
    const map = strTo2DArr(`
      ..
      ..
    `)
    const graph = graphFromMap(map, diagonalNeighborPolicy, { passable: new Set('.') })
    expect(graph.getVertex('0,0')!.neighbors).toContain(graph.getVertex('1,1'))
  })

  test('creates no edges between diagonally adjacent passable tiles that do cut corners', () => {
    const map = strTo2DArr(`
      .@
      ..
    `)
    const graph = graphFromMap(map, diagonalNeighborPolicy, { passable: new Set('.') })
    expect(graph.getVertex('0,0')!.neighbors).not.toContain(graph.getVertex('1,1'))
  })
})