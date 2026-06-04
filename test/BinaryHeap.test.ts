import { describe, expect, test } from '@jest/globals'
import { BinaryHeap } from '../src/ds/BinaryHeap'

describe('BinaryHeap', () => {
  test('is empty when created', () => {
    const heap = new BinaryHeap<string>()

    expect(heap.size).toBe(0)
    expect(heap.peek()).toBeNull()
    expect(heap.peekPriority()).toBeNull()
    expect(heap.pop()).toBeNull()
  })
})