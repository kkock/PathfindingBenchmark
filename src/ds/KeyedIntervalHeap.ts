import { bool2Num, type Entry, type Node } from './IntervalHeap'

type Position = {
  index: number
  side: 0 | 1
}

export class KeyedIntervalHeap<T> {
  debugCheck(): void {
    const seen = new Set<T>()

    if (this.heap.length === 0) {
      if (this.positions.size !== 0) {
        throw new Error('positions not empty while heap is empty')
      }
      return
    }

    for (let i = 0; i < this.heap.length; i++) {
      const node = this.heap[i]!

      const isLast = i === this.heap.length - 1
      const hasMax = this.full || !isLast

      //
      // Check occupied slots.
      //
      const occupiedSides: Array<0 | 1> = hasMax ? [0, 1] : [0]

      for (const side of occupiedSides) {
        const entry = node[side]!

        if (seen.has(entry[0])) {
          throw new Error(
            `duplicate item encountered: ${String(entry[0])}`
          )
        }

        seen.add(entry[0])

        const pos = this.positions.get(entry[0])

        if (!pos) {
          throw new Error(
            `missing position for item ${String(entry[0])}`
          )
        }

        if (pos.index !== i || pos.side !== side) {
          throw new Error(
            `position mismatch for item ${String(entry[0])}: `
            + `expected (${i},${side}), `
            + `got (${pos.index},${pos.side})`
          )
        }
      }

      //
      // Interval invariant.
      //
      if (hasMax && node[0]![1] > node[1]![1]) {
        throw new Error(
          `node ${i} violates interval ordering: `
          + `${node[0]![1]} > ${node[1]![1]}`
        )
      }

      //
      // Parent relationships.
      //
      if (i > 0) {
        const parent = Math.floor((i + 1) / 2) - 1

        if (this.heap[parent]![0]![1] > node[0]![1]) {
          throw new Error(
            `min-heap violation: parent ${parent} (${this.heap[parent]![0]![1]}) `
            + `> child ${i} (${node[0]![1]})`
          )
        }

        if (hasMax) {
          const parentHasMax =
            this.full || parent !== this.heap.length - 1

          const parentMax = parentHasMax
            ? this.heap[parent]![1]!
            : this.heap[parent]![0]!

          if (parentMax[1] < node[1]![1]) {
            throw new Error(
              `max-heap violation: parent ${parent} (${parentMax[1]}) `
              + `< child ${i} (${node[1]![1]})`
            )
          }
        }
      }
    }

    //
    // Check positions doesn't contain extra entries.
    //
    if (seen.size !== this.positions.size) {
      throw new Error(
        `positions contains extra items: `
        + `seen=${seen.size}, positions=${this.positions.size}`
      )
    }

    //
    // Check reported size.
    //
    if (seen.size !== this.size) {
      throw new Error(
        `size mismatch: size=${this.size}, actual=${seen.size}`
      )
    }
  }

  private readonly positions = new Map<T, Position>()
  private readonly heap: Array<Node<T>>
  private full: boolean = true

  constructor () {
    this.heap = []
  }

  has (item: T): boolean {
    return this.positions.has(item)
  }

  min (): T | null {
    if (this.heap.length === 0) return null
    return this.heap[0]![0]![0]
  }

  max (): T | null {
    if (this.heap.length === 0) return null
    if (this.heap.length === 1) return this.heap[0]![bool2Num(this.full)]![0]
    return this.heap[0]![1]![0]
  }

  minPriority (): number | null {
    if (this.heap.length === 0) return null
    return this.heap[0]![0]![1]
  }

  maxPriority (): number | null {
    if (this.heap.length === 0) return null
    if (this.heap.length === 1) return this.heap[0]![bool2Num(this.full)]![1]
    return this.heap[0]![1]![1]
  }

  get size (): number {
    return this.heap.length * 2 - bool2Num(!this.full)
  }

  insertOrUpdate (item: T, priority: number): void {
    if (this.positions.has(item)) {
      return this.update(item, priority)
    } else {
      return this.insert(item, priority)
    }
  }

  update (item: T, priority: number): void {
    const pos = this.positions.get(item)
    if (!pos) return

    const { index, side } = pos
    this.heap[index]![side]![1] = priority

    // Repair heap
    const max = this.maxEntryAt(index)
    if (this.heap[index]![max]![1] < this.heap[index]![0]![1]) {
      this.invertNode(index)
    }

    this.bubbleMinUp(index)
    this.bubbleMinDown(index)
    this.bubbleMinUp(index)

    this.bubbleMaxUp(index)
    this.bubbleMaxDown(index)
    this.bubbleMaxUp(index)

    this.debugCheck()
  }

  remove (item: T): boolean {
    if (!this.positions.has(item)) return false
    const pos = this.positions.get(item)!
    
    const { index, side } = pos

    if (index === 0) {
      // Case 1: item is already at the top.
      if (side === 0) this.deleteMin()
      else this.deleteMax()
      //this.debugCheck()
      return true
    }

    const entry = this.heap[index]![side]!
    const lastIndex = this.heap.length - 1

    if (index === lastIndex) {
      // Case 2: item is at the bottom.
      if (this.full) {
        this.removeEntry(entry)
        if (side === 0) {
          this.setEntry(lastIndex, 0, this.heap[lastIndex]![1]!)
        }
        this.heap[lastIndex]![1] = null
      } else {
        this.removeEntry(entry)
        this.heap.length--
      }
      this.full = !this.full
      //this.debugCheck()
      return true
    }

    // Case 3: item is in the middle of the heap.
    if (this.full) {
      this.swapEntries(index, side, lastIndex, 1)
      this.removeEntry(entry)
      this.heap[lastIndex]![1] = null
    } else {
      this.swapEntries(index, side, lastIndex, 0)
      this.removeEntry(entry)
      this.heap.length--
    }

    this.full = !this.full

    if (this.full && this.heap[index]![0]![1] > this.heap[index]![1]![1]) {
      this.invertNode(index)
    }
    
    this.bubbleMinUp(index)
    this.bubbleMinDown(index)
    this.bubbleMinUp(index)

    this.bubbleMaxUp(index)
    this.bubbleMaxDown(index)
    this.bubbleMaxUp(index)

    //this.debugCheck()
    return true
  }

  insert (item: T, priority: number): void {
    if (this.full) {
      const maxIndex = this.heap.length
      this.heap.push([null, null])
      this.setEntry(maxIndex, 0, [item, priority])
      this.bubbleMinUp()
      if (this.heap[maxIndex]![0]![1] === priority) {
        this.setEntry(maxIndex, 1, this.heap[maxIndex]![0]!)
        this.bubbleMaxUp()
        this.setEntry(maxIndex, 0, this.heap[maxIndex]![1]!)
        this.heap[maxIndex]![1] = null
      }
    } else {
      const maxIndex = this.heap.length - 1
      this.setEntry(maxIndex, 1, [item, priority])
      if (this.heap[maxIndex]![0]![1] < this.heap[maxIndex]![1]![1]) {
        this.bubbleMaxUp()
      } else {
        this.invertNode(maxIndex)
        this.bubbleMinUp()
      }
    }
    this.full = !this.full
    //this.debugCheck()
  }

  deleteMin (): void {
    if (this.heap.length === 0) return
    this.removeEntry(this.heap[0]![0]!)

    const lastIndex = this.heap.length - 1
    if (this.full) {
      this.setEntry(0, 0, this.heap[lastIndex]![1]!)
      this.heap[lastIndex]![1] = null
    } else {
      if (this.heap.length > 1) this.setEntry(0, 0, this.heap[lastIndex]![0]!)
      this.heap.length--
    }

    this.full = !this.full

    if (this.heap.length > 0) this.bubbleMinDown()
    //this.debugCheck()
  }

  deleteMax (): void {
    let item
    if (this.heap.length === 0) {
      return
    } else if (this.size === 1) {
      item = this.heap[0]![0]!
      this.removeEntry(this.heap[0]![0]!)
    } else {
      item = this.heap[0]![1]!
      this.removeEntry(this.heap[0]![1]!)
    }

    const lastIndex = this.heap.length - 1
    if (this.full) {
      if (this.heap.length > 1) this.setEntry(0, 1, this.heap[lastIndex]![1]!)
      this.heap[lastIndex]![1] = null
    } else {
      if (this.heap.length > 1) this.setEntry(0, 1, this.heap[lastIndex]![0]!)
      this.heap.length--
    }
    
    this.full = !this.full
    if (this.heap.length > 0) this.bubbleMaxDown()
    //this.debugCheck()
  }

  private bubbleMinUp (minIndex: undefined | number = undefined): void {
    if (this.heap.length === 0) return
    minIndex ??= this.heap.length - 1
    const minItem = this.heap[minIndex]![0]!
    let nextIndex = Math.floor((minIndex + 1) / 2) - 1

    while (minIndex > 0 && this.heap[nextIndex]![0]![1] > minItem[1]) {
      this.setEntry(minIndex, 0, this.heap[nextIndex]![0]!)
      minIndex = nextIndex
      nextIndex = Math.floor((minIndex + 1) / 2) - 1
    }

    this.setEntry(minIndex, 0, minItem)
  }

  private bubbleMaxUp (maxIndex: undefined | number = undefined): void {
    if (this.heap.length === 0) return
    maxIndex ??= this.heap.length - 1
    const maxItem = this.heap[maxIndex]![this.maxEntryAt(maxIndex)]!
    let nextIndex = Math.floor((maxIndex + 1) / 2) - 1

    while (maxIndex > 0 && this.heap[nextIndex]![this.maxEntryAt(nextIndex)]![1] < maxItem[1]) {
      this.setEntry(maxIndex, this.maxEntryAt(maxIndex), this.heap[nextIndex]![1]!)
      maxIndex = nextIndex
      nextIndex = Math.floor((maxIndex + 1) / 2) - 1
    }

    this.setEntry(maxIndex, this.maxEntryAt(maxIndex), maxItem)
  }

  private bubbleMinDown (currentIndex = 0): void {
    if (this.heap.length === 0) return
    let minIndex

    do {
      minIndex = currentIndex
      const left = (currentIndex + 1) * 2 - 1
      const right = (currentIndex + 1) * 2
      if (left < this.heap.length && this.heap[left]![0]![1] < this.heap[currentIndex]![0]![1]) currentIndex = left
      if (right < this.heap.length && this.heap[right]![0]![1] < this.heap[currentIndex]![0]![1]) currentIndex = right

      this.swapEntries(currentIndex, 0, minIndex, 0)

      const ciMax = this.maxEntryAt(currentIndex)
      if (this.heap[currentIndex]![0]![1] > this.heap[currentIndex]![ciMax]![1]) {
        this.swapEntries(currentIndex, 0, currentIndex, ciMax)
      }

      const miMax = this.maxEntryAt(minIndex)
      if (this.heap[minIndex]![0]![1] > this.heap[minIndex]![miMax]![1]) {
        this.swapEntries(minIndex, 0, minIndex, miMax)
      }
    } while (minIndex !== currentIndex)
  }

  private bubbleMaxDown (currentIndex = 0): void {
    if (this.heap.length === 0) return
    let maxIndex

    do {
      maxIndex = currentIndex
      const left = (currentIndex + 1) * 2 - 1
      const right = (currentIndex + 1) * 2

      let ciMax = this.maxEntryAt(currentIndex)

      if (left <= this.heap.length - 1) {
        if (this.heap[left]![this.maxEntryAt(left)]![1] > this.heap[currentIndex]![ciMax]![1]) {
          currentIndex = left
        }
      } 
      if (right <= this.heap.length - 1) {
        if (this.heap[right]![this.maxEntryAt(right)]![1] > this.heap[currentIndex]![ciMax]![1]) {
          currentIndex = right
        }
      }

      ciMax = this.maxEntryAt(currentIndex)
      let miMax = this.maxEntryAt(maxIndex)

      this.swapEntries(currentIndex, ciMax, maxIndex, miMax)

      if (this.heap[currentIndex]![0]![1] > this.heap[currentIndex]![ciMax]![1]) {
        this.swapEntries(currentIndex, 0, currentIndex, ciMax)
      }

      if (this.heap[maxIndex]![0]![1] > this.heap[maxIndex]![miMax]![1]) {
        this.swapEntries(maxIndex, 0, maxIndex, miMax)
      }
    } while (maxIndex !== currentIndex)
  }

  private maxEntryAt (index: number): 0 | 1 {
    const node = this.heap[index]!
    if (node[1] === null) return 0
    return 1
  }

  private setEntry (index: number, side: 0 | 1, entry: Entry<T>): void {
    this.heap[index]![side] = entry
    this.positions.set(entry[0], { index, side })
  }

  private invertNode (index: number): void {
    this.swapEntries(index, 0, index, this.maxEntryAt(index))
  }

  private swapEntries (indexA: number, sideA: 0 | 1, indexB: number, sideB: 0 | 1): void {
    if (indexA === indexB && sideA === sideB) return
    const entryA = this.heap[indexA]![sideA]!
    const entryB = this.heap[indexB]![sideB]!
    this.setEntry(indexA, sideA, entryB)
    this.setEntry(indexB, sideB, entryA)
  }

  private removeEntry (entry: Entry<T>): void {
    this.positions.delete(entry[0])
  }
}
