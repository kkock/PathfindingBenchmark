function bool2Num (boolean: boolean): 0 | 1 {
  return Number(boolean) as 0 | 1
}

type Entry<T> = [item: T, priority: number]
type Node<T> = [min: Entry<T>, max: Entry<T>]

export class IntervalHeap<T> {
  private readonly heap: Array<Node<T>>
  private _size: number = 0
  private full: boolean = true

  constructor () {
    this.heap = []
  }

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
    if (this.full) {
      if (this._size >= this.heap.length) this.heap.push([null, null] as unknown as Node<T>)
      const maxIndex = this._size++

      ;(this.heap[maxIndex] as Node<T>)[0] = [item, priority]
      this.bubbleMinUp()
      if ((this.heap[maxIndex] as Node<T>)[0][1] === priority) {
        // Item is potentially too large for the min heap.
        ;(this.heap[maxIndex] as Node<T>)[1] = (this.heap[maxIndex] as Node<T>)[0]
        this.bubbleMaxUp()
        ;(this.heap[maxIndex] as Node<T>)[0] = (this.heap[maxIndex] as Node<T>)[1]
      }
    } else {
      const maxIndex = this._size - 1
      ;(this.heap[maxIndex] as Node<T>)[1] = [item, priority]
      if ((this.heap[maxIndex] as Node<T>)[0][1] < (this.heap[maxIndex] as Node<T>)[1][1]) {
        this.bubbleMaxUp()
      } else {
        ;[
          (this.heap[maxIndex] as Node<T>)[0],
          (this.heap[maxIndex] as Node<T>)[1]
        ] = [
          (this.heap[maxIndex] as Node<T>)[1],
          (this.heap[maxIndex] as Node<T>)[0]
        ]
        this.bubbleMinUp()
      }
    }
    this.full = !this.full
  }

  deleteMin (): void {
    if (this._size === 0) return

    const heapMin = this.heap[0] as Node<T>
    const heapMax = this.heap[this._size - 1] as Node<T>

    if (this.full) {
      heapMin[0] = heapMax[1]
    } else {
      heapMin[0] = heapMax[0]
      this._size--
    }
    this.full = !this.full
    this.bubbleMinDown()
  }

  deleteMax (): void {
    if (this._size === 0) return

    const heapMin = this.heap[0] as Node<T>
    const heapMax = this.heap[this._size - 1] as Node<T>

    if (this.full) {
      heapMin[1] = heapMax[1]
    } else {
      heapMin[1] = heapMax[0]
      this._size--
    }
    this.full = !this.full
    this.bubbleMaxDown()
  }

  private bubbleMinUp (): void {
    let minIndex = this._size - 1
    const minItem = (this.heap[minIndex] as Node<T>)[0]
    let nextIndex = Math.floor((minIndex + 1) / 2) - 1

    while (minIndex > 0 && (this.heap[nextIndex] as Node<T>)[0][1] > minItem[1]) {
      ;(this.heap[minIndex] as Node<T>)[0] = (this.heap[nextIndex] as Node<T>)[0]
      minIndex = nextIndex
      nextIndex = Math.floor((minIndex + 1) / 2) - 1
    }

    ;(this.heap[minIndex] as Node<T>)[0] = minItem
  }

  private bubbleMaxUp (): void {
    let maxIndex = this._size - 1
    const maxItem = (this.heap[maxIndex] as Node<T>)[1]
    let nextIndex = Math.floor((maxIndex + 1) / 2) - 1

    while (maxIndex > 0 && (this.heap[nextIndex] as Node<T>)[1][1] < maxItem[1]) {
      ;(this.heap[maxIndex] as Node<T>)[1] = (this.heap[nextIndex] as Node<T>)[1]
      maxIndex = nextIndex
      nextIndex = Math.floor((maxIndex + 1) / 2) - 1
    }

    ;(this.heap[maxIndex] as Node<T>)[1] = maxItem
  }

  private bubbleMinDown (): void {
    let minIndex
    let currentIndex = 0

    do {
      minIndex = currentIndex
      const left = (currentIndex + 1) * 2 - 1
      const right = (currentIndex + 1) * 2
      if (left < this._size && (this.heap[left] as Node<T>)[0][1] < (this.heap[currentIndex] as Node<T>)[0][1]) currentIndex = left
      if (right < this._size && (this.heap[right] as Node<T>)[0][1] < (this.heap[currentIndex] as Node<T>)[0][1]) currentIndex = right

      ;[
        (this.heap[currentIndex] as Node<T>)[0],
        (this.heap[minIndex] as Node<T>)[0]
      ] = [
        (this.heap[minIndex] as Node<T>)[0],
        (this.heap[currentIndex] as Node<T>)[0]
      ]

      if ((this.heap[currentIndex] as Node<T>)[0][1] > (this.heap[currentIndex] as Node<T>)[1][1]) {
        ;[
          (this.heap[currentIndex] as Node<T>)[0],
          (this.heap[currentIndex] as Node<T>)[1]
        ] = [
          (this.heap[currentIndex] as Node<T>)[1],
          (this.heap[currentIndex] as Node<T>)[0]
        ]
      }

      if ((this.heap[minIndex] as Node<T>)[0][1] > (this.heap[minIndex] as Node<T>)[1][1]) {
        ;[
          (this.heap[minIndex] as Node<T>)[0],
          (this.heap[minIndex] as Node<T>)[1]
        ] = [
          (this.heap[minIndex] as Node<T>)[1],
          (this.heap[minIndex] as Node<T>)[0]
        ]
      }
    } while (minIndex !== currentIndex)
  }

  private bubbleMaxDown (): void {
    let maxIndex
    let currentIndex = 0

    if (!this.full) (this.heap[this._size - 1] as Node<T>)[1] = (this.heap[this._size - 1] as Node<T>)[0]

    do {
      maxIndex = currentIndex
      const left = (currentIndex + 1) * 2 - 1
      const right = (currentIndex + 1) * 2
      if (left <= this._size - 1 && (this.heap[left] as Node<T>)[1][1] > (this.heap[currentIndex] as Node<T>)[1][1]) currentIndex = left
      if (right <= this._size - 1 && (this.heap[right] as Node<T>)[1][1] > (this.heap[currentIndex] as Node<T>)[1][1]) currentIndex = right

      ;[
        (this.heap[currentIndex] as Node<T>)[1],
        (this.heap[maxIndex] as Node<T>)[1]
      ] = [
        (this.heap[maxIndex] as Node<T>)[1],
        (this.heap[currentIndex] as Node<T>)[1]
      ]

      if ((this.heap[currentIndex] as Node<T>)[0][1] > (this.heap[currentIndex] as Node<T>)[1][1]) {
        ;[
          (this.heap[currentIndex] as Node<T>)[0],
          (this.heap[currentIndex] as Node<T>)[1]
        ] = [
          (this.heap[currentIndex] as Node<T>)[1],
          (this.heap[currentIndex] as Node<T>)[0]
        ]
      }

      if ((this.heap[maxIndex] as Node<T>)[0][1] > (this.heap[maxIndex] as Node<T>)[1][1]) {
        ;[
          (this.heap[maxIndex] as Node<T>)[0],
          (this.heap[maxIndex] as Node<T>)[1]
        ] = [
          (this.heap[maxIndex] as Node<T>)[1],
          (this.heap[maxIndex] as Node<T>)[0]
        ]
      }
    } while (maxIndex !== currentIndex)
  }
}
