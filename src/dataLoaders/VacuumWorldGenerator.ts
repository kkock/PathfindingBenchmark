import { binomialCoefficient, shuffle, shuffleSubset, toGrid } from "../utils"

export type VacuumWorldGenOpts =
  & (
    | { blockedChance: number, blockedCount?: never }
    | { blockedChance?: never, blockedCount: number }
  )
  & (
    | { dirtChance: number, dirtCount?: never } 
    | { dirtChance?: never, dirtCount: number }
  )
  & {
    rand?: () => number
    softIterationCap?: number
    hardIterationCap?: number
  }

/**
 * @param probability - `p ∈ [0, 1]`
 * @param size - `s ∈ ℕ`
 * @param rand - a function returning a float in the range `[0, 1)`.
 * @returns a random number from `rand` weighted by the specified distribution.
 */
function pickFromDistribution (
  probability: number,
  size: number,
  rand: () => number = Math.random
) {
  const r = rand()
  let cumulative = 0
  for (let k = 0; k <= size; k++) {
    cumulative += 
      binomialCoefficient(size, k) *
      probability ** k *
      (1 - probability) ** (size - k)

    if (r < cumulative) return k
  }
  return size // Fallback
}

function isValid (cells: string[], width: number): boolean {
  const height = Math.floor(cells.length / width)
  const isPoi = (c: string) => c !== '#' && c !== '.'

  const start = cells.findIndex(isPoi)
  if (start === -1) return true

  const visited = Array<boolean>(cells.length).fill(false)
  const stack = [start]
  visited[start] = true

  const tryVisit = (nx: number, ny: number) => {
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) return
    const ni = ny * width + nx
    if (!visited[ni] && cells[ni] !== "#") {
      visited[ni] = true
      stack.push(ni)
    }
  }

  while (stack.length > 0) {
    const i = stack.pop()!
    const x = i % width
    const y = Math.floor(i / width)

    tryVisit(x - 1, y)
    tryVisit(x + 1, y)
    tryVisit(x, y - 1)
    tryVisit(x, y + 1)
  }

  // Ensure every point of interest was reached.
  for (let i = 0; i < cells.length; i++) {
    if (isPoi(cells[i]!) && !visited[i]) return false
  }

  return true
}

function getLargestComponent (
  cells: string[],
  width: number,
): { index: number, size: number } {
  const height = Math.floor(cells.length / width)
  const visited = Array<boolean>(cells.length).fill(false)

  let largestSize = 0
  let largestIndex = -1

  const stack: number[] = []

  const tryVisit = (nx: number, ny: number) => {
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) return
    const ni = ny * width + nx
    if (!visited[ni] && cells[ni] !== "#") {
      visited[ni] = true
      stack.push(ni)
    }
  }

  for (let start = 0; start < cells.length; start++) {
    if (visited[start] || cells[start] === '#') continue

    let size = 0
    visited[start] = true
    stack.push(start)

    while (stack.length > 0) {
      const i = stack.pop()!
      size++
      const x = i % width
      const y = Math.floor(i / width)

      tryVisit(x - 1, y)
      tryVisit(x + 1, y)
      tryVisit(x, y - 1)
      tryVisit(x, y + 1)
    }

    if (size > largestSize) {
      largestSize = size
      largestIndex = start
    }
  }

  return {
    index: largestIndex,
    size: largestSize,
  }
}


function repairGrid (
  cells: string[],
  width: number,
  requiredComponentSize: number,
  rand: () => number = Math.random
): boolean {
  const { index, size } = getLargestComponent(cells, width)
  if (size < requiredComponentSize) return false
  const height = Math.floor(cells.length / width)

  const poiList = Array.from(cells.entries())
    .filter(([_, str]) => str !== '#' && str !== '.')
    .map(([i]) => i)
  const poiSet = new Set(poiList)

  const visited = new Set<number>()
  const stack: number[] = [index]
  visited.add(index)

  const tryVisit = (nx: number, ny: number) => {
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) return
    const ni = ny * width + nx
    if (!visited.has(ni) && cells[ni] !== "#") {
      visited.add(ni)
      stack.push(ni)
    }

    // Move all pois are inside of the chosen component.
    if (poiList.length > 0 && !poiSet.has(ni)) {
      const nextPoi = poiList.shift()!
      ;[cells[ni], cells[nextPoi]] = [cells[nextPoi]!, cells[ni]!]
      poiSet.delete(nextPoi)
    }
  }

  while (stack.length > 0) {
    const i = stack.pop()!
    const x = i % width
    const y = Math.floor(i / width)

    tryVisit(x - 1, y)
    tryVisit(x + 1, y)
    tryVisit(x, y - 1)
    tryVisit(x, y + 1)
  }

  // Now we shuffle only the component.
  const indices = Array.from(visited)
  while (true) {
    shuffleSubset(cells, indices, rand)
    if (isValid(cells, width)) break
  }

  return true
}

export function generateVacuumWorld (
  width: number,
  height: number,
  opts: VacuumWorldGenOpts
): string[][] {
  const size = width * height
  let obstacleCount
  let dirtCount

  if (opts.dirtCount != null) {
    if (opts.dirtCount == 0) {
      throw new RangeError('A vacuum world must have at least 1 dirt pile!')
    } else if (opts.dirtCount > 36) {
      throw new RangeError('Having more than 36 dirt piles is not currently supported.')
    }
  }

  while (true) {
    obstacleCount = opts.blockedChance != null
      ? // Always leave at least 2 spots free (for the robot and 1 dirt pile).
        pickFromDistribution(opts.blockedChance, size - 2, opts.rand)
      : opts.blockedCount

    dirtCount = opts.dirtChance != null
      ? // Never generate more dirt piles than free spots.
        // Also never generate more than 36 dirt piles.
        Math.min(36, Math.max(1, pickFromDistribution(opts.dirtChance, size - obstacleCount, opts.rand)))
      : opts.dirtCount

    if (dirtCount + obstacleCount + 1 > size) {
      if (opts.blockedCount != null && opts.dirtCount != null) {
        /* Too many obstacles and dirt piles; no vacuum world is possible with
         * these constraints. */
        throw new RangeError(`A vacuum world of size ${
          width
        }x${
          height
        } is not large enough for ${
          opts.blockedCount
        } obstacles and ${
          opts.dirtCount
        } dirt piles!`)
      } else if (opts.blockedCount != null) {
        // Clamp the free variable, in this case `dirtCount`.
        dirtCount = size - obstacleCount - 1
        if (dirtCount < 1) {
          /* Too many obstacles; no vacuum world is possible with these
           * constraints. */
          throw new RangeError(`A vacuum world of size ${
            width
          }x${
            height
          } is not large enough for ${
            opts.blockedCount
          } obstacles!`)
        }
        break
      } else if (opts.blockedCount != null) {
        // Clamp the free variable, in this case `obstacleCount`.
        obstacleCount = size - dirtCount
        break
      }
    } else {
      break
    }
  }

  const cells = [
    ...Array(obstacleCount).fill('#'),
    '@', // Robot
    ...Array({ length: dirtCount }).map((_, i) => i.toString(36).toUpperCase()),
    ...Array(size - obstacleCount - dirtCount - 1).fill('.'),
  ]

  let repairedGrid: null | string[][] = null
  let iterations = 0
  const softCap = opts.softIterationCap ?? 200
  const hardCap = opts.hardIterationCap ?? 10_000
  while (true) {
    // Shuffle the grid; if it's valid, return it.
    shuffle<string>(cells, opts.rand)
    if (isValid(cells, width)) return toGrid(cells, width)

    // As a fallback, attempt to repair and store any one rejected grid.
    repairedGrid ??= repairGrid(cells, width, size - obstacleCount, opts.rand)
      ? toGrid(cells, width)
      : null

    // Return a fallback if no valid grid was generated after `n` iterations.
    if (iterations++ > softCap && repairedGrid != null) return repairedGrid

    // If not even a fallback can be generated, throw.
    if (iterations > hardCap) throw new Error('Iteration limit exceeded.')
  }
}