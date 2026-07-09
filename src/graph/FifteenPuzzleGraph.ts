import type { SearchDomain } from "./Graph"

export class FifteenPuzzleGraph extends Object implements SearchDomain<string> {
  successors (state: string): Iterable<string> {
    const stateArray = state.split(',').map(Number)
    const emptyIndex = stateArray.indexOf(0)
    if (emptyIndex === -1) throw new RangeError('Invalid state!')

    function getNext (index: number): string {
      const arrayCopy = Array.from(stateArray)
      ;[arrayCopy[emptyIndex], arrayCopy[index]] = [arrayCopy[index]!, arrayCopy[emptyIndex]!]
      return arrayCopy.join(',')
    }

    const successors: string[] = []

    // Move a tile left
    if (emptyIndex > 0x0) successors.push(getNext(emptyIndex - 1))

    // Move a tile right
    if (emptyIndex < 0xF) successors.push(getNext(emptyIndex + 1))

    // Move a tile up
    if (emptyIndex >= 0x4) successors.push(getNext(emptyIndex - 4))

    // Move a tile down
    if (emptyIndex <= 0xB) successors.push(getNext(emptyIndex + 4))

    return successors
  }

  normalize (state: string) { return state }
}