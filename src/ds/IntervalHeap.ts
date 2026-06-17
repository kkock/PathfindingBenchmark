export function bool2Num (boolean: boolean): 0 | 1 {
  return Number(boolean) as 0 | 1
}

export type Entry<T> = [item: T, priority: number]
export type Node<T> = [min: Entry<T> | null, max: Entry<T> | null]

export class IntervalHeap<T> {
  private readonly heap: Array<Node<T>>
  private full: boolean = true

  constructor () {
    this.heap = []
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

  insert (item: T, priority: number): void {
    if (this.full) {
      const maxIndex = this.heap.length
      this.heap.push([null, null])

      this.heap[maxIndex]![0] = [item, priority]
      this.bubbleMinUp()
      if (this.heap[maxIndex]![0]![1] === priority) {
        // Item is potentially too large for the min heap.
        this.heap[maxIndex]![1] = this.heap[maxIndex]![0]
        this.bubbleMaxUp()
        this.heap[maxIndex]![0] = this.heap[maxIndex]![1]
      }
    } else {
      const maxIndex = this.heap.length - 1
      this.heap[maxIndex]![1] = [item, priority]
      if (this.heap[maxIndex]![0]![1] < this.heap[maxIndex]![1][1]) {
        this.bubbleMaxUp()
      } else {
        ;[
          this.heap[maxIndex]![0],
          this.heap[maxIndex]![1]
        ] = [
          this.heap[maxIndex]![1],
          this.heap[maxIndex]![0]
        ]
        this.bubbleMinUp()
      }
    }
    this.full = !this.full
  }

  deleteMin (): void {
    if (this.heap.length === 0) return

    const heapMin = this.heap[0]!
    const lastIndex = this.heap.length - 1
    const heapMax = this.heap[lastIndex]!

    if (this.full) {
      heapMin[0] = heapMax[1]
      heapMax[1] = null
    } else {
      heapMin[0] = heapMax[0]
      heapMax[0] = null
      heapMax[1] = null
      this.heap.length--
    }

    this.full = !this.full

    if (this.heap.length > 0) this.bubbleMinDown()
  }

  deleteMax (): void {
    if (this.heap.length === 0) return

    const heapMaxRoot = this.heap[0]!
    const lastIndex = this.heap.length - 1
    const heapMax = this.heap[lastIndex]!

    if (this.full) {
      heapMaxRoot[1] = heapMax[1]
      heapMax[1] = null
    } else {
      heapMaxRoot[1] = heapMax[0]
      heapMax[0] = null
      heapMax[1] = null
      this.heap.length--

    }
    
    this.full = !this.full
    if (this.heap.length > 0) this.bubbleMaxDown()
  }

  private bubbleMinUp (): void {
    let minIndex = this.heap.length - 1
    const minItem = this.heap[minIndex]![0]!
    let nextIndex = Math.floor((minIndex + 1) / 2) - 1

    while (minIndex > 0 && this.heap[nextIndex]![0]![1] > minItem[1]) {
      this.heap[minIndex]![0] = this.heap[nextIndex]![0]
      minIndex = nextIndex
      nextIndex = Math.floor((minIndex + 1) / 2) - 1
    }

    this.heap[minIndex]![0] = minItem
  }

  private bubbleMaxUp (): void {
    let maxIndex = this.heap.length - 1
    const maxItem = this.heap[maxIndex]![1]!
    let nextIndex = Math.floor((maxIndex + 1) / 2) - 1

    while (maxIndex > 0 && this.heap[nextIndex]![1]![1] < maxItem[1]) {
      this.heap[maxIndex]![1] = this.heap[nextIndex]![1]
      maxIndex = nextIndex
      nextIndex = Math.floor((maxIndex + 1) / 2) - 1
    }

    this.heap[maxIndex]![1] = maxItem
  }

  private bubbleMinDown (): void {
    let minIndex
    let currentIndex = 0

    do {
      minIndex = currentIndex
      const left = (currentIndex + 1) * 2 - 1
      const right = (currentIndex + 1) * 2
      if (left < this.heap.length && this.heap[left]![0]![1] < this.heap[currentIndex]![0]![1]) currentIndex = left
      if (right < this.heap.length && this.heap[right]![0]![1] < this.heap[currentIndex]![0]![1]) currentIndex = right

      ;[
        this.heap[currentIndex]![0],
        this.heap[minIndex]![0]
      ] = [
        this.heap[minIndex]![0],
        this.heap[currentIndex]![0]
      ]

      const ciMax = this.maxEntryAt(currentIndex)

      if (this.heap[currentIndex]![0]![1] > this.heap[currentIndex]![ciMax]![1]) {
        ;[
          this.heap[currentIndex]![0],
          this.heap[currentIndex]![ciMax]
        ] = [
          this.heap[currentIndex]![ciMax],
          this.heap[currentIndex]![0]
        ]
      }

      const miMax = this.maxEntryAt(minIndex)

      if (this.heap[minIndex]![0]![1] > this.heap[minIndex]![miMax]![1]) {
        ;[
          this.heap[minIndex]![0],
          this.heap[minIndex]![miMax]
        ] = [
          this.heap[minIndex]![miMax],
          this.heap[minIndex]![0]
        ]
      }
    } while (minIndex !== currentIndex)
  }

  private bubbleMaxDown (): void {
    let maxIndex
    let currentIndex = 0

    if (!this.full) this.heap[this.heap.length - 1]![1] = this.heap[this.heap.length - 1]![0]

    do {
      maxIndex = currentIndex
      const left = (currentIndex + 1) * 2 - 1
      const right = (currentIndex + 1) * 2

      let ciMax = this.maxEntryAt(currentIndex)

      if (left <= this.heap.length - 1) {
        const lMax = this.maxEntryAt(left)
        if (this.heap[left]![lMax]![1] > this.heap[currentIndex]![ciMax]![1]) currentIndex = left
      } 
      if (right <= this.heap.length - 1) {
        const rMax = this.maxEntryAt(right)
        if (this.heap[right]![rMax]![1] > this.heap[currentIndex]![ciMax]![1]) currentIndex = right
      }

      ciMax = this.maxEntryAt(currentIndex)
      let miMax = this.maxEntryAt(maxIndex)

      ;[
        this.heap[currentIndex] ![ciMax],
        this.heap[maxIndex] ![miMax]
      ] = [
        this.heap[maxIndex] ![miMax],
        this.heap[currentIndex] ![ciMax]
      ]

      if (this.heap[currentIndex]![0]![1] > this.heap[currentIndex]![ciMax]![1]) {
        ;[
          this.heap[currentIndex]![0],
          this.heap[currentIndex]![ciMax]
        ] = [
          this.heap[currentIndex]![ciMax],
          this.heap[currentIndex]![0]
        ]
      }

      if (this.heap[maxIndex]![0]![1] > this.heap[maxIndex]![miMax]![1]) {
        ;[
          this.heap[maxIndex]![0],
          this.heap[maxIndex]![miMax]
        ] = [
          this.heap[maxIndex]![miMax],
          this.heap[maxIndex]![0]
        ]
      }
    } while (maxIndex !== currentIndex)
  }

  private maxEntryAt (index: number): 0 | 1 {
    const node = this.heap[index]!
    if (node[1] === null) return 0
    return 1
  }
}
