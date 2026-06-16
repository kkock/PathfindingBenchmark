import { describe, expect, test } from '@jest/globals'
import { KeyedIntervalHeap } from '../src/ds/KeyedIntervalHeap'
import { getSeededPrng } from './utils'

describe('KeyedIntervalHeap', () => {
  /*test('is empty when created', () => {
    const heap = new KeyedIntervalHeap<string>()

    expect(heap.size).toBe(0)

    expect(heap.min()).toBeNull()
    expect(heap.max()).toBeNull()

    expect(heap.minPriority()).toBeNull()
    expect(heap.maxPriority()).toBeNull()
  })

  test('handles a single inserted element', () => {
    const heap = new KeyedIntervalHeap<string>()

    heap.insert('a', 10)

    expect(heap.size).toBe(1)

    expect(heap.min()).toBe('a')
    expect(heap.max()).toBe('a')

    expect(heap.minPriority()).toBe(10)
    expect(heap.maxPriority()).toBe(10)
  })

  test('tracks minimum and maximum correctly', () => {
    const heap = new KeyedIntervalHeap<string>()

    heap.insert('medium', 20)
    heap.insert('low', 5)
    heap.insert('high', 100)

    expect(heap.size).toBe(3)

    expect(heap.min()).toBe('low')
    expect(heap.minPriority()).toBe(5)

    expect(heap.max()).toBe('high')
    expect(heap.maxPriority()).toBe(100)
  })

  test('update updates the priority for the given item', () => {
    const heap = new KeyedIntervalHeap<string>()

    heap.insert('a', 10)

    expect(heap.size).toBe(1)
    expect(heap.min()).toBe('a')
    expect(heap.minPriority()).toBe(10)

    heap.update('a', 100)

    expect(heap.size).toBe(1)
    expect(heap.max()).toBe('a')
    expect(heap.maxPriority()).toBe(100)
  })

  test('deleteMin removes the minimum element', () => {
    const heap = new KeyedIntervalHeap<string>()

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
    const heap = new KeyedIntervalHeap<string>()

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
    const heap = new KeyedIntervalHeap<number>()

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
    const heap = new KeyedIntervalHeap<number>()

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
    const heap = new KeyedIntervalHeap<number>()

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
    const heap = new KeyedIntervalHeap<string>()

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
    const heap = new KeyedIntervalHeap<number>()

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
    const heap = new KeyedIntervalHeap<number>()

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
    const heap = new KeyedIntervalHeap<number>()

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
    const heap = new KeyedIntervalHeap<number>()
    expect(() => heap.deleteMax()).not.toThrow()
    expect(() => heap.deleteMin()).not.toThrow()
    expect(() => heap.min()).not.toThrow()
    expect(() => heap.max()).not.toThrow()
    expect(() => heap.size).not.toThrow()
    expect(() => heap.minPriority()).not.toThrow()
    expect(() => heap.maxPriority()).not.toThrow()
  })

  test('matches a sorted-array oracle under randomized operations without duplicate keys', () => {
    const heap = new KeyedIntervalHeap<number>()
    const oracle: number[] = []
    const currentKeys = new Set<number>()

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
        const MIN = -100
        const MAX = 100
        let value: number | undefined

        // Generate an unused value, if one can be found.
        for (let attempts = 0; attempts < 10; attempts++) {
          const candidate = Math.floor(rand() * (MAX - MIN + 1)) + MIN
          if (!currentKeys.has(candidate)) {
            value = candidate
            break
          }
        }

        if (value !== undefined) {
          heap.insert(value, value)
          currentKeys.add(value)
          oracle.push(value)
          oracle.sort((a, b) => a - b)
        }
      } else if (operation < 0.80) {
        const value = oracle.shift()!
        heap.deleteMin()
        currentKeys.delete(value)
      } else {
        const value = oracle.pop()!
        heap.deleteMax()
        currentKeys.delete(value)
      }

      assertState()
    }
  })*/

  test('matches a Map oracle under randomized insertOrUpdate operations', () => {
    const heap = new KeyedIntervalHeap<number>()
    const oracle = new Map<number, number>()

    const assertState = () => {
      expect(heap.size).toBe(oracle.size)

      if (oracle.size === 0) {
        expect(heap.min()).toBeNull()
        expect(heap.max()).toBeNull()
        expect(heap.minPriority()).toBeNull()
        expect(heap.maxPriority()).toBeNull()
        return
      }

      let minItem: number | undefined
      let minPriority = Infinity
      let maxItem: number | undefined
      let maxPriority = -Infinity
      for (const [item, priority] of oracle) {
        // Check for pointer corruption
        expect(heap.has(item)).toBe(true)
        const {index, side} = (heap as any).positions.get(item)
        expect((heap as any).heap[index][side][0]).toBe(item)

        if (priority < minPriority) {
          minPriority = priority
          minItem = item
        }
        if (priority > maxPriority) {
          maxPriority = priority
          maxItem = item
        }
      }

      expect(heap.min()).toBe(minItem)
      expect(heap.max()).toBe(maxItem)
      expect(heap.minPriority()).toBe(minPriority)
      expect(heap.maxPriority()).toBe(maxPriority)

      for (const key of (heap as any).positions.keys()) {
        expect(oracle.has(key)).toBe(true)
      }
    }

    const rand = getSeededPrng()

    const ITEMS = 100
    const PRIORITY_MIN = -1_000_000
    const PRIORITY_MAX = 1_000_000
    const ITERATIONS = 10_000

    for (let i = 0; i < ITERATIONS; i++) {
      const operation = rand()
      if (oracle.size === 0 || operation < 0.60) {
        const item = Math.floor(rand() * ITEMS)

        // Generate a priority that is not currently used by another item.
        let priority: number
        while (true) {
          priority = Math.floor(rand() * (PRIORITY_MAX - PRIORITY_MIN + 1)) + PRIORITY_MIN
          let inUse = false
          for (const existingPriority of oracle.values()) {
            if (existingPriority === priority) {
              inUse = true
              break
            }
          }
          if (!inUse) break
        }
        console.log('Add/Update Item', {item, priority}, heap.size)
        expect(oracle.has(item)).toBe(heap.has(item))
        heap.insertOrUpdate(item, priority)
        oracle.set(item, priority)
        console.log((heap as any).heap)
      } else if (operation < 0.80) {
        let minItem: number | undefined
        let minPriority = Infinity
        for (const [item, priority] of oracle) {
          if (priority < minPriority) {
            minPriority = priority
            minItem = item
          }
        }
        heap.deleteMin()
        oracle.delete(minItem!)

        console.log('Deleted Item', minItem)
        console.log((heap as any).heap)
        expect(heap.has(minItem!)).toBe(false)
      } else {
        let maxItem: number | undefined
        let maxPriority = -Infinity
        for (const [item, priority] of oracle) {
          if (priority > maxPriority) {
            maxPriority = priority
            maxItem = item
          }
        }
        heap.deleteMax()
        oracle.delete(maxItem!)

        console.log('Deleted Item', maxItem)
        console.log((heap as any).heap)
        expect(heap.has(maxItem!)).toBe(false)
      }
      
      assertState()
    }
  })

  /*test('', () => {
    const heap = new KeyedIntervalHeap<string>()
    heap.insert('a', 50)

    expect(heap.min()).toBe('a')
    expect(heap.max()).toBe('a')

    heap.insert('b', -50)

    expect(heap.min()).toBe('b')
    expect(heap.max()).toBe('a')

    heap.insert('c', 0)

    expect(heap.min()).toBe('b')
    expect(heap.max()).toBe('a')

    heap.update('a', -100)

    expect(heap.min()).toBe('a')
    expect(heap.max()).toBe('c')
  })*/
})