import type { Node, Queue } from './BinaryHeap'

export class KeyedBinaryHeap<T> implements Queue<T>  {
  private heap: Array<Node<T>> = []
  private positions = new Map<T, number>()

  clear (): void {
    this.heap = []
    this.positions.clear()
  }

  has (item: T): boolean {
    return this.positions.has(item)
  }

  insert (item: T, priority: number): boolean {
    if (this.positions.has(item)) return false
    const index = this.heap.length
    this.heap.push([item, priority])
    this.positions.set(item, index)
    this.bubbleUp(index)
    return true
  }

  insertOrUpdate (item: T, priority: number): boolean {
    if (this.positions.has(item)) {
      return this.update(item, priority)
    } else {
      return this.insert(item, priority)
    }
  }

  update (item: T, newPriority: number): boolean {
    if (!this.positions.has(item)) return false
    const index = this.positions.get(item) as number
    const oldPriority = this.heap[index]![1]
    this.heap[index]![1] = newPriority
    
    if (newPriority < oldPriority) {
      this.bubbleUp(index)
    } else if (newPriority > oldPriority) {
      this.bubbleDown(index)
    }
    return true
  }

  pop (): T | null {
    if (this.heap.length === 0) return null
    
    const root = this.heap[0] as Node<T>
    this.positions.delete(root[0])

    if (this.heap.length === 1) {
      this.heap.pop()
      return root[0]
    }

    const last = this.heap.pop() as Node<T>
    this.heap[0] = last
    this.positions.set(last[0], 0)
    this.bubbleDown(0)
    return root[0]
  }

  peek (): T | null {
    if (this.heap.length === 0) return null
    return (this.heap[0] as Node<T>)[0]
  }

  peekPriority (): number | null {
    if (this.heap.length === 0) return null
    return (this.heap[0] as Node<T>)[1]
  }

  get size (): number {
    return this.heap.length
  }

  private bubbleUp (index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2)
      if (this.heap[parent]![1] <= this.heap[index]![1]) break
      this.swap(parent, index)
      index = parent
    }
  }

  private bubbleDown (index: number): void {
    while (true) {
      const left = 2 * index + 1
      const right = 2 * index + 2
      let smallest = index

      if (left < this.heap.length && this.heap[left]![1] < this.heap[smallest]![1]) {
        smallest = left
      }

      if (right < this.heap.length && this.heap[right]![1] < this.heap[smallest]![1]) {
        smallest = right
      }

      if (smallest === index) break
      this.swap(index, smallest)
      index = smallest
    }
  }

  private swap (i: number, j: number): void {
    ;[this.heap[i],this.heap[j]] = [this.heap[j] as Node<T>, this.heap[i] as Node<T>]
    this.positions.set(this.heap[i][0], i)
    this.positions.set(this.heap[j][0], j)
  }

  remove (item: T): boolean {
    if (!this.positions.has(item)) return false
    const index = this.positions.get(item)!

    this.positions.delete(item)

    const lastIndex = this.heap.length - 1
    if (index === lastIndex) {
      this.heap.pop()
      return true
    }

    const last = this.heap.pop() as Node<T>
    this.positions.set(last[0], index)
    this.heap[index] = last

    // decide which direction to repair
    const parent = Math.floor((index - 1) / 2)
    if (index > 0 && this.heap[index]![1] < this.heap[parent]![1]) {
      this.bubbleUp(index)
    } else {
      this.bubbleDown(index)
    }

    return true
  }
}