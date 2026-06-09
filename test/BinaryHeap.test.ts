import { describe, expect, test } from '@jest/globals'
import { BinaryHeap } from '../src/ds/BinaryHeap'
import { getSeededPrng } from './utils'

describe('BinaryHeap', () => {
  test('is empty when created', () => {
    const heap = new BinaryHeap<string>()

    expect(heap.size).toBe(0)
    expect(heap.peek()).toBeNull()
    expect(heap.peekPriority()).toBeNull()
    expect(heap.pop()).toBeNull()
  })

  test('returns inserted item from peek without removing it', () => {
    const heap = new BinaryHeap<string>()

    heap.insert('a', 10)

    expect(heap.peek()).toBe('a')
    expect(heap.peekPriority()).toBe(10)
    expect(heap.size).toBe(1)

    // peek should not remove
    expect(heap.peek()).toBe('a')
    expect(heap.size).toBe(1)
  })

  test('pops items in ascending priority order (min heap)', () => {
    const heap = new BinaryHeap<string>()

    heap.insert('c', 30)
    heap.insert('a', 10)
    heap.insert('b', 20)

    expect(heap.pop()).toBe('a')
    expect(heap.pop()).toBe('b')
    expect(heap.pop()).toBe('c')
    expect(heap.pop()).toBeNull()
  })

  test('updates size correctly during insert and pop', () => {
    const heap = new BinaryHeap<number>()

    expect(heap.size).toBe(0)

    heap.insert(1, 1)
    expect(heap.size).toBe(1)

    heap.insert(2, 2)
    expect(heap.size).toBe(2)

    heap.pop()
    expect(heap.size).toBe(1)

    heap.pop()
    expect(heap.size).toBe(0)
  })

  test('peek always returns current minimum-priority item', () => {
    const heap = new BinaryHeap<string>()

    heap.insert('high', 100)
    heap.insert('medium', 50)
    heap.insert('low', 10)

    expect(heap.peek()).toBe('low')
    expect(heap.peekPriority()).toBe(10)

    heap.pop()

    expect(heap.peek()).toBe('medium')
    expect(heap.peekPriority()).toBe(50)
  })

  test('handles duplicate priorities', () => {
    const heap = new BinaryHeap<string>()

    heap.insert('a', 10)
    heap.insert('b', 10)
    heap.insert('c', 10)

    const popped = [heap.pop(), heap.pop(), heap.pop()]

    expect(new Set(popped)).toEqual(new Set(['a', 'b', 'c']))
    expect(heap.size).toBe(0)
  })

  test('maintains heap property through interleaved operations', () => {
    const heap = new BinaryHeap<string>()

    heap.insert('a', 20)
    heap.insert('b', 10)
    heap.insert('c', 30)

    expect(heap.pop()).toBe('b')

    heap.insert('d', 5)

    expect(heap.peek()).toBe('d')
    expect(heap.pop()).toBe('d')
    expect(heap.pop()).toBe('a')
    expect(heap.pop()).toBe('c')
  })

  test('returns elements in sorted priority order for many inserts', () => {
    const heap = new BinaryHeap<number>()

    const priorities = [8, 3, 10, 1, 6, 14, 4, 7, 13]

    for (const p of priorities) {
      heap.insert(p, p)
    }

    const result: number[] = []

    while (heap.size > 0) {
      result.push(heap.pop()!)
    }

    expect(result).toEqual([1, 3, 4, 6, 7, 8, 10, 13, 14])
  })

  test('correctly updates minimum after removing root repeatedly', () => {
    const heap = new BinaryHeap<number>()

    heap.insert(5, 5)
    heap.insert(1, 1)
    heap.insert(3, 3)
    heap.insert(2, 2)
    heap.insert(4, 4)

    expect(heap.peekPriority()).toBe(1)

    heap.pop()
    expect(heap.peekPriority()).toBe(2)

    heap.pop()
    expect(heap.peekPriority()).toBe(3)

    heap.pop()
    expect(heap.peekPriority()).toBe(4)

    heap.pop()
    expect(heap.peekPriority()).toBe(5)
  })

  test('matches a sorted-array oracle under randomized operations', () => {
    const heap = new BinaryHeap<number>()
    const oracle: number[] = []

    const assertState = () => {
      expect(heap.size).toBe(oracle.length)
      if (oracle.length === 0) {
        expect(heap.peek()).toBeNull()
        expect(heap.peekPriority()).toBeNull()
      } else {
        expect(heap.peek()).toBe(oracle[0])
        expect(heap.peekPriority()).toBe(oracle[0])
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
      } else {
        heap.pop()
        oracle.shift()
      }
      assertState()
    }
  })
})