import { describe, expect, test } from '@jest/globals'
import { IntervalHeap } from '../src/ds/IntervalHeap'
import { getSeededPrng } from './utils'
//import { KeyedIntervalHeap as IntervalHeap } from '../src/ds/KeyedIntervalHeap'



describe('IntervalHeap', () => {
  test('is empty when created', () => {
    const heap = new IntervalHeap<string>()

    expect(heap.size).toBe(0)

    expect(heap.min()).toBeNull()
    expect(heap.max()).toBeNull()

    expect(heap.minPriority()).toBeNull()
    expect(heap.maxPriority()).toBeNull()
  })

  test('handles a single inserted element', () => {
    const heap = new IntervalHeap<string>()

    heap.insert('a', 10)

    expect(heap.size).toBe(1)

    expect(heap.min()).toBe('a')
    expect(heap.max()).toBe('a')

    expect(heap.minPriority()).toBe(10)
    expect(heap.maxPriority()).toBe(10)
  })

  test('tracks minimum and maximum correctly', () => {
    const heap = new IntervalHeap<string>()

    heap.insert('medium', 20)
    heap.insert('low', 5)
    heap.insert('high', 100)

    expect(heap.size).toBe(3)

    expect(heap.min()).toBe('low')
    expect(heap.minPriority()).toBe(5)

    expect(heap.max()).toBe('high')
    expect(heap.maxPriority()).toBe(100)
  })

  test('deleteMin removes the minimum element', () => {
    const heap = new IntervalHeap<string>()

    heap.insert('c', 30)
    heap.insert('a', 10)
    heap.insert('b', 20)

    heap.deleteMin()

    expect(heap.size).toBe(2)

    expect(heap.min()).toBe('b')
    expect(heap.minPriority()).toBe(20)

    expect(heap.max()).toBe('c')
    expect(heap.maxPriority()).toBe(30)
  })

  test('deleteMax removes the maximum element', () => {
    const heap = new IntervalHeap<string>()

    heap.insert('b', 20)
    heap.insert('c', 30)
    heap.insert('a', 10)

    heap.deleteMax()

    expect(heap.size).toBe(2)

    expect(heap.max()).toBe('b')
    expect(heap.maxPriority()).toBe(20)

    expect(heap.min()).toBe('a')
    expect(heap.minPriority()).toBe(10)
  })

  test('deleteMin repeatedly exposes increasing priorities', () => {
    const heap = new IntervalHeap<number>()

    for (const n of [5, 1, 4, 2, 3]) {
      heap.insert(n, n)
    }

    expect(heap.minPriority()).toBe(1)

    heap.deleteMin()
    expect(heap.minPriority()).toBe(2)

    heap.deleteMin()
    expect(heap.minPriority()).toBe(3)

    heap.deleteMin()
    expect(heap.minPriority()).toBe(4)

    heap.deleteMin()
    expect(heap.minPriority()).toBe(5)

    heap.deleteMin()

    expect(heap.size).toBe(0)
    expect(heap.min()).toBeNull()
    expect(heap.max()).toBeNull()
  })

  test('deleteMax repeatedly exposes decreasing priorities', () => {
    const heap = new IntervalHeap<number>()

    for (const n of [5, 1, 4, 2, 3]) {
      heap.insert(n, n)
    }

    expect(heap.maxPriority()).toBe(5)

    heap.deleteMax()
    expect(heap.maxPriority()).toBe(4)

    heap.deleteMax()
    expect(heap.maxPriority()).toBe(3)

    heap.deleteMax()
    expect(heap.maxPriority()).toBe(2)

    heap.deleteMax()
    expect(heap.maxPriority()).toBe(1)

    heap.deleteMax()

    expect(heap.size).toBe(0)
    expect(heap.min()).toBeNull()
    expect(heap.max()).toBeNull()
  })

  test('supports alternating deleteMin and deleteMax operations', () => {
    const heap = new IntervalHeap<number>()

    for (const n of [1, 2, 3, 4, 5, 6, 7]) {
      heap.insert(n, n)
    }

    expect(heap.minPriority()).toBe(1)
    expect(heap.maxPriority()).toBe(7)

    heap.deleteMin() // remove 1
    expect(heap.minPriority()).toBe(2)
    expect(heap.maxPriority()).toBe(7)

    heap.deleteMax() // remove 7
    expect(heap.minPriority()).toBe(2)
    expect(heap.maxPriority()).toBe(6)

    heap.deleteMin() // remove 2
    expect(heap.minPriority()).toBe(3)

    heap.deleteMax() // remove 6
    expect(heap.maxPriority()).toBe(5)

    expect(heap.size).toBe(3)
  })

  test('handles duplicate priorities', () => {
    const heap = new IntervalHeap<string>()

    heap.insert('a', 10)
    heap.insert('b', 10)
    heap.insert('c', 10)

    expect(heap.size).toBe(3)

    expect(heap.minPriority()).toBe(10)
    expect(heap.maxPriority()).toBe(10)

    heap.deleteMin()

    expect(heap.size).toBe(2)
    expect(heap.minPriority()).toBe(10)
    expect(heap.maxPriority()).toBe(10)

    heap.deleteMax()

    expect(heap.size).toBe(1)
    expect(heap.minPriority()).toBe(10)
    expect(heap.maxPriority()).toBe(10)
  })

  test('handles odd numbers of elements', () => {
    const heap = new IntervalHeap<number>()

    heap.insert(1, 1)
    heap.insert(2, 2)
    heap.insert(3, 3)
    heap.insert(4, 4)
    heap.insert(5, 5)

    expect(heap.size).toBe(5)

    expect(heap.minPriority()).toBe(1)
    expect(heap.maxPriority()).toBe(5)

    heap.deleteMin()

    expect(heap.size).toBe(4)
    expect(heap.minPriority()).toBe(2)

    heap.deleteMax()

    expect(heap.size).toBe(3)
    expect(heap.maxPriority()).toBe(4)
  })

  test('handles even numbers of elements', () => {
    const heap = new IntervalHeap<number>()

    heap.insert(1, 1)
    heap.insert(2, 2)
    heap.insert(3, 3)
    heap.insert(4, 4)

    expect(heap.size).toBe(4)

    expect(heap.minPriority()).toBe(1)
    expect(heap.maxPriority()).toBe(4)

    heap.deleteMin()

    expect(heap.minPriority()).toBe(2)

    heap.deleteMax()

    expect(heap.maxPriority()).toBe(3)
  })

  test('size updates correctly through operations', () => {
    const heap = new IntervalHeap<number>()

    expect(heap.size).toBe(0)

    heap.insert(1, 1)
    expect(heap.size).toBe(1)

    heap.insert(2, 2)
    expect(heap.size).toBe(2)

    heap.deleteMin()
    expect(heap.size).toBe(1)

    heap.deleteMax()
    expect(heap.size).toBe(0)
  })

  test('doesn\'t throw when reading or popping from an empty heap', () => {
    const heap = new IntervalHeap<number>()
    expect(() => heap.deleteMax()).not.toThrow()
    expect(() => heap.deleteMin()).not.toThrow()
    expect(() => heap.min()).not.toThrow()
    expect(() => heap.max()).not.toThrow()
    expect(() => heap.size).not.toThrow()
    expect(() => heap.minPriority()).not.toThrow()
    expect(() => heap.maxPriority()).not.toThrow()
  })

  test('matches a sorted-array oracle under randomized operations', () => {
    const heap = new IntervalHeap<number>()
    const oracle: number[] = []

    const assertState = () => {
      expect(heap.size).toBe(oracle.length)

      if (oracle.length === 0) {
        expect(heap.min()).toBeNull()
        expect(heap.max()).toBeNull()

        expect(heap.minPriority()).toBeNull()
        expect(heap.maxPriority()).toBeNull()
      } else {
        expect(heap.min()).toBe(oracle[0])
        expect(heap.max()).toBe(oracle[oracle.length - 1])

        expect(heap.minPriority()).toBe(oracle[0])
        expect(heap.maxPriority()).toBe(
          oracle[oracle.length - 1]
        )
      }
    }

    const rand = getSeededPrng()

    const ITERATIONS = 10_000
    for (let i = 0; i < ITERATIONS; i++) {
      const operation = rand()
      if (oracle.length === 0 || operation < 0.60) {
        const value = Math.floor(rand() * 201) - 100
        heap.insert(value, value)
        oracle.push(value)
        oracle.sort((a, b) => a - b)
      } else if (operation < 0.80) {
        heap.deleteMin()
        oracle.shift()
      } else {
        heap.deleteMax()
        oracle.pop()
      }
      assertState()
    }
  })
})