import { bool2Num, type Entry, type Node } from './IntervalHeap'

type Position = {
  index: number
  side: 0 | 1
}

export class KeyedIntervalHeap<T> {
  private readonly positions = new Map<T, Position>()
  private readonly heap: Array<Node<T>>
  private _size: number = 0
  private full: boolean = true

  constructor () {
    this.heap = []
  }

  has (item: T): boolean {
    return this.positions.has(item)
  }

  insertOrUpdate (item: T, priority: number): void {
    if (this.positions.has(item)) {
      return this.update(item, priority)
    } else {
      return this.insert(item, priority)
    }
  }

  update (item: T, newPriority: number): void {
    const pos = this.positions.get(item)
    if (!pos) return

    const { index, side } = pos
    const entry = this.heap[index]![side]

    //const oldPriority = entry[1]
    //this.setEntry(index, side, )
    entry[1] = newPriority
    this.fix(index)
    //if (newPriority < oldPriority) {
    //  this.fixAfterDecrease(index, side)
    //} else if (newPriority > oldPriority) {
    //  this.fixAfterIncrease(index, side)
    //}
  }

  private fix (index: number): void {
    if (this.heap[index]![1][1] < this.heap[index]![0][1]) {
      this.invertNode(index)
    }
  
    this.bubbleMinUpFrom(index)
    this.bubbleMinDownFrom(index)
    this.bubbleMaxUpFrom(index)
    this.bubbleMaxDownFrom(index)
  }

  /*private fixAfterDecrease (index: number, side: 0 | 1): void {
    if (side === 0) {
      this.bubbleMinUpFrom(index)
    } else {
      if (this.heap[index]![1][1] < this.heap[index]![0][1]) {
        this.invertNode(index)
        this.bubbleMinUpFrom(index)
      } else {
        this.bubbleMaxDownFrom(index)
      }
    }
  }

  private fixAfterIncrease (index: number, side: 0 | 1): void {
    if (side === 0) {
      this.bubbleMaxUpFrom(index)
    } else {
      if (this.heap[index]![0][1] > this.heap[index]![1][1]) {
        this.invertNode(index)
        this.bubbleMaxUpFrom(index)
      } else {
        this.bubbleMinDownFrom(index)
      }
    }
  }*/

  min (): T | null {
    if (this._size === 0) return null
    return (this.heap[0] as Node<T>)[0][0]
  }

  max (): T | null {
    if (this._size === 0) return null
    if (this._size === 1) return (this.heap[0] as Node<T>)[bool2Num(this.full)][0]
    return (this.heap[0] as Node<T>)[1][0]
  }

  minPriority (): number | null {
    if (this._size === 0) return null
    return (this.heap[0] as Node<T>)[0][1]
  }

  maxPriority (): number | null {
    if (this._size === 0) return null
    if (this._size === 1) return (this.heap[0] as Node<T>)[bool2Num(this.full)][1]
    return (this.heap[0] as Node<T>)[1][1]
  }

  get size (): number {
    return this._size * 2 - bool2Num(!this.full)
  }

  insert (item: T, priority: number): void {
    const entry: Entry<T> = [item, priority]

    if (this.full) {
      if (this._size >= this.heap.length) this.heap.push([null!, null!] as Node<T>)
      
      const maxIndex = this._size
      this._size++
      this.setEntry(maxIndex, 0, entry)
      this.bubbleMinUpFrom(maxIndex)
      const maxItem = this.heap[maxIndex]![0]
      if (maxItem === entry) {
        // Item is potentially too large for the min heap.
        this.setEntry(maxIndex, 1, maxItem)
        this.bubbleMaxUpFrom(maxIndex)
        this.setEntry(maxIndex, 0, this.heap[maxIndex]![1])
      }
    } else {
      const maxIndex = this._size - 1

      this.setEntry(maxIndex, 1, entry)
      if (this.heap[maxIndex]![0][1] < this.heap[maxIndex]![1][1]) {
        this.bubbleMaxUpFrom(maxIndex)
      } else {
        this.invertNode(maxIndex)
        this.bubbleMinUpFrom(maxIndex)
      }
    }

    this.full = !this.full
  }

  private removeEntry(entry: Entry<T>): void {
    this.positions.delete(entry[0])
  }

  deleteMin (): void {
    if (this._size === 0) return

    this.removeEntry(this.heap[0]![0])
    const lastIndex = this._size - 1
    if (this.full) {
      this.setEntry(0, 0, this.heap[lastIndex]![1])
    } else {
      this.setEntry(0, 0, this.heap[lastIndex]![0])
      this._size--
    }

    this.full = !this.full
    if (this.size > 0) this.bubbleMinDownFrom(0)
  }

  deleteMax (): void {
    if (this._size === 0) return

    if (this.size === 1) {
      this.removeEntry(this.heap[0]![0])
      this._size = 0
      this.full = true
      return
    } else if (this.size === 2) {
      this.removeEntry(this.heap[0]![1])
      this.full = false
      return
    }


    this.removeEntry(this.heap[0]![1])
    const lastIndex = this._size - 1
    if (this.full) {
      this.setEntry(0, 1, this.heap[lastIndex]![1])
    } else {
      this.setEntry(0, 1, this.heap[lastIndex]![0])
      this._size--
    }

    this.full = !this.full
    if (this.size > 1) this.bubbleMaxDownFrom(0)
    
  }

  private bubbleMinUpFrom (index: number): void {
    const item = (this.heap[index] as Node<T>)[0]
    let nextIndex = Math.floor((index + 1) / 2) - 1

    while (index > 0 && (this.heap[nextIndex] as Node<T>)[0][1] > item[1]) {
      this.setEntry(index, 0, (this.heap[nextIndex] as Node<T>)[0])
      index = nextIndex
      nextIndex = Math.floor((index + 1) / 2) - 1
    }

    this.setEntry(index, 0, item)
  }

  private bubbleMaxUpFrom (index: number): void {
    const item = (this.heap[index] as Node<T>)[1]
    let nextIndex = Math.floor((index + 1) / 2) - 1

    while (index > 0 && (this.heap[nextIndex] as Node<T>)[1][1] < item[1]) {
      this.setEntry(index, 1, (this.heap[nextIndex] as Node<T>)[1])
      index = nextIndex
      nextIndex = Math.floor((index + 1) / 2) - 1
    }

    this.setEntry(index, 1, item)
  }

  private bubbleMinDownFrom (index: number): void {
    let minIndex

    do {
      minIndex = index
      const left = (index + 1) * 2 - 1
      const right = (index + 1) * 2
      if (left < this._size && (this.heap[left] as Node<T>)[0][1] < (this.heap[index] as Node<T>)[0][1]) index = left
      if (right < this._size && (this.heap[right] as Node<T>)[0][1] < (this.heap[index] as Node<T>)[0][1]) index = right

      this.swapEntries(minIndex, 0, index, 0)

      if ((this.heap[index] as Node<T>)[0][1] > (this.heap[index] as Node<T>)[1][1]) {
        this.invertNode(index)
      }

      if ((this.heap[minIndex] as Node<T>)[0][1] > (this.heap[minIndex] as Node<T>)[1][1]) {
        this.invertNode(minIndex)
      }
    } while (minIndex !== index)
  }

  

  private bubbleMaxDownFrom (index: number): void {
    let maxIndex
    
    if (!this.full) {
      (this.heap[this._size - 1] as Node<T>)[1] = (this.heap[this._size - 1] as Node<T>)[0]
    }

    do {
      maxIndex = index
      const left = (index + 1) * 2 - 1
      const right = (index + 1) * 2
      if (left <= this._size - 1 && (this.heap[left] as Node<T>)[1][1] > (this.heap[index] as Node<T>)[1][1]) index = left
      if (right <= this._size - 1 && (this.heap[right] as Node<T>)[1][1] > (this.heap[index] as Node<T>)[1][1]) index = right

      this.swapEntries(maxIndex, 1, index, 1)

      if ((this.heap[index] as Node<T>)[0][1] > (this.heap[index] as Node<T>)[1][1]) {
        this.invertNode(index)
      }

      if ((this.heap[maxIndex] as Node<T>)[0][1] > (this.heap[maxIndex] as Node<T>)[1][1]) {
        this.invertNode(maxIndex)
      }
    } while (maxIndex !== index)
  }

  private setEntry (index: number, side: 0 | 1, entry: Entry<T>): void {
    this.heap[index]![side] = entry
    this.positions.set(entry[0], { index, side })
  }

  private invertNode (index: number): void {
    this.swapEntries(index, 0, index, 1)
  }

  private swapEntries (indexA: number, sideA: 0 | 1, indexB: number, sideB: 0 | 1): void {
    if (indexA === indexB && sideA === sideB) return
    const entryA = (this.heap[indexA] as Node<T>)[sideA]
    const entryB = (this.heap[indexB] as Node<T>)[sideB]
    this.setEntry(indexA, sideA, entryB)
    this.setEntry(indexB, sideB, entryA)
  }
}
