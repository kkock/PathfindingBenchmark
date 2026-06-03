type Node<T> = [item: T, priority: number]

export class BinaryHeap<T> {
  private heap: Array<Node<T>> = []

  public insert (item: T, priority: number): boolean {
    this.heap.push(null as unknown as Node<T>)
    let hole: number
    for (hole = this.heap.length - 1; hole > 0 && priority <= (this.heap[Math.floor(hole / 2)] as Node<T>)[1]; hole = Math.floor(hole / 2)) {
      this.heap[hole] = this.heap[Math.floor(hole / 2)] as Node<T>
    }
    this.heap[hole] = [item, priority]
    return true
  }

  pop (): T | null {
    if (this.heap.length === 0) return null
    const node = this.heap[0]
    this.heap[0] = this.heap[this.heap.length - 1] as Node<T>
    this.heap.pop()
    this.bubbleDown()
    return (node as Node<T>)[0]
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

  private bubbleDown (): void {
    if (this.heap.length === 0) return
    let hole = 1
    const tmp = this.heap[0] as Node<T>

    while (hole * 2 < this.heap.length + 1) {
      let child = hole * 2
      if (child !== this.heap.length && (this.heap[child] as Node<T>)[1] <= (this.heap[child - 1] as Node<T>)[1]) child++
      if ((this.heap[child - 1] as Node<T>)[1] > tmp[1]) break
      this.heap[hole - 1] = this.heap[child - 1] as Node<T>
      hole = child
    }

    this.heap[hole - 1] = tmp
  }
}
