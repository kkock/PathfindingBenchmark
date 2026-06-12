import { describe, expect, test } from '@jest/globals'
import { Color, RedBlackNode, RedBlackTree } from '../src/ds/RedBlackTree'
import { getSeededPrng } from './utils'

describe('RedBlackTree', () => {
  function makeTree (): RedBlackTree<number> {
    return new RedBlackTree<number>((a, b) => a - b)
  }

  function getRoot<T> (tree: RedBlackTree<T>): RedBlackNode<T> | null {
    return (tree as any).root
  }

  function isNil (node: any): boolean {
    if (node == null) return true
    return (
      node.left === node &&
      node.right === node &&
      node.color === Color.BLACK
    )
  }

  function validateRedBlackProperties<T> (
    tree: RedBlackTree<T>
  ): void {
    const root = getRoot(tree)
    if ((root == null) || isNil(root)) return

    // Root must be black.
    expect(root.color).toBe(Color.BLACK)
    function dfs (node: RedBlackNode<T>): number {
      // NIL leaves are black.
      if (isNil(node)) {
        expect(node.color).toBe(Color.BLACK)
        return 1
      }

      // BST ordering.
      if (!isNil(node.left)) {
        expect((tree as any).compare(node.left.values[0], node.values[0])).toBeLessThan(0)
        expect(node.left.parent).toBe(node)
      }

      if (!isNil(node.right)) {
        expect((tree as any).compare(node.right.values[0], node.values[0])).toBeGreaterThanOrEqual(0)
        expect(node.right.parent).toBe(node)
      }

      // Red nodes cannot have red children.
      if (node.color === Color.RED) {
        expect(node.left.color).toBe(Color.BLACK)
        expect(node.right.color).toBe(Color.BLACK)
      }

      const leftBlackHeight = dfs(node.left)
      const rightBlackHeight = dfs(node.right)

      // Equal black height on every path.
      expect(leftBlackHeight).toBe(rightBlackHeight)

      return leftBlackHeight + (node.color === Color.BLACK ? 1 : 0)
    }

    dfs(root)
  }

  function getOrderedValues (tree: RedBlackTree<number>): number[] {
    const result: number[] = []
    let node = tree.minimum()
    while (node !== null) {
      result.push(...node.values)
      node = tree.successor(node)
    }
    return result
  }

  describe('insert/search', () => {
    test('finds inserted values', () => {
      const tree = makeTree()
      ;[10, 5, 15, 3, 7, 12, 18].forEach(v => tree.insert(v))
      expect(tree.search(10)?.values[0]).toBe(10)
      expect(tree.search(3)?.values[0]).toBe(3)
      expect(tree.search(18)?.values[0]).toBe(18)
      expect(tree.search(999)).toBeNull()
      validateRedBlackProperties(tree)
    })

    test('maintains sorted order', () => {
      const tree = makeTree()
      const values = [8, 3, 10, 1, 6, 14, 4, 7, 13]
      values.forEach(v => tree.insert(v))
      expect(getOrderedValues(tree)).toEqual([1, 3, 4, 6, 7, 8, 10, 13, 14])
      validateRedBlackProperties(tree)
    })
  })

  describe('minimum', () => {
    test('returns null for empty tree', () => {
      expect(makeTree().minimum()).toBeNull()
    })

    test('returns smallest element', () => {
      const tree = makeTree()
      ;[50, 10, 90, 2, 30].forEach(v => tree.insert(v))
      expect(tree.minimum()?.values[0]).toBe(2)
      validateRedBlackProperties(tree)
    })
  })

  describe('successor', () => {
    test('walks entire tree in sorted order', () => {
      const tree = makeTree()
      ;[5, 1, 8, 3, 2, 7, 9].forEach(v => tree.insert(v))
      expect(getOrderedValues(tree)).toEqual([1, 2, 3, 5, 7, 8, 9])
      validateRedBlackProperties(tree)
    })

    test('returns null for maximum node', () => {
      const tree = makeTree()
      ;[1, 2, 3].forEach(v => tree.insert(v))
      const max = tree.search(3) as RedBlackNode<number>
      expect(tree.successor(max)).toBeNull()
    })
  })

  describe('lowerBound', () => {
    test('returns exact match', () => {
      const tree = makeTree()
      ;[2, 5, 8, 10, 20].forEach(v => tree.insert(v))
      expect(tree.lowerBound(8)?.values[0]).toBe(8)
    })

    test('returns next larger value', () => {
      const tree = makeTree()
      ;[2, 5, 8, 10, 20].forEach(v => tree.insert(v))
      expect(tree.lowerBound(7)?.values[0]).toBe(8)
      expect(tree.lowerBound(9)?.values[0]).toBe(10)
    })

    test('returns minimum when key is too small', () => {
      const tree = makeTree()
      ;[10, 20, 30].forEach(v => tree.insert(v))
      expect(tree.lowerBound(-100)?.values[0]).toBe(10)
    })

    test('returns null when key exceeds all values', () => {
      const tree = makeTree()
      ;[10, 20, 30].forEach(v => tree.insert(v))
      expect(tree.lowerBound(100)).toBeNull()
    })
  })

  describe('remove', () => {
    test('removes leaf node', () => {
      const tree = makeTree()
      ;[10, 5, 15].forEach(v => tree.insert(v))
      tree.remove(5)
      expect(tree.search(5)).toBeNull()
      expect(getOrderedValues(tree)).toEqual([10, 15])
      validateRedBlackProperties(tree)
    })

    test('removes node with one child', () => {
      const tree = makeTree()
      ;[10, 5, 2].forEach(v => tree.insert(v))
      tree.remove(5)
      expect(tree.search(5)).toBeNull()
      expect(getOrderedValues(tree)).toEqual([2, 10])
      validateRedBlackProperties(tree)
    })

    test('removes node with two children', () => {
      const tree = makeTree()
      ;[10, 5, 15, 3, 7, 12, 18].forEach(v => tree.insert(v))
      tree.remove(10)
      expect(tree.search(10)).toBeNull()
      expect(getOrderedValues(tree)).toEqual([3, 5, 7, 12, 15, 18])
      validateRedBlackProperties(tree)
    })

    test('removing missing value does nothing', () => {
      const tree = makeTree()
      ;[1, 2, 3].forEach(v => tree.insert(v))
      tree.remove(999)
      expect(getOrderedValues(tree)).toEqual([1, 2, 3])
      validateRedBlackProperties(tree)
    })

    test('can remove every element', () => {
      const tree = makeTree()
      const values = [5, 3, 7, 2, 4, 6, 8]
      values.forEach(v => tree.insert(v))
      for (const value of values) {
        tree.remove(value)
        expect(tree.search(value)).toBeNull()
        validateRedBlackProperties(tree)
      }
      expect(tree.minimum()).toBeNull()
    })
  })
})

describe('RedBlackTree - duplicate keys', () => {
  interface Item { name: string, value: number }

  const makeTree = (): RedBlackTree<Item> => new RedBlackTree<Item>((a, b) => a.value - b.value)

  function inorder (tree: RedBlackTree<Item>): Item[] {
    const result: Item[] = []

    let node = tree.minimum()
    while (node != null) {
      result.push(...node.values)
      node = tree.successor(node)
    }

    return result
  }

  function getRoot<T> (tree: RedBlackTree<T>): RedBlackNode<T> | null {
    return (tree as any).root
  }

  function isNil (node: any): boolean {
    if (node == null) return true
    return (
      node.left === node &&
      node.right === node &&
      node.color === Color.BLACK
    )
  }

  function validateRedBlackProperties<T> (
    tree: RedBlackTree<T>
  ): void {
    const root = getRoot(tree)
    if ((root == null) || isNil(root)) return

    // Root must be black.
    expect(root.color).toBe(Color.BLACK)
    function dfs (node: RedBlackNode<T>): number {
      // NIL leaves are black.
      if (isNil(node)) {
        expect(node.color).toBe(Color.BLACK)
        return 1
      }

      // BST ordering.
      if (!isNil(node.left)) {
        expect((tree as any).compare(node.left.values[0], node.values[0])).toBeLessThan(0)
        expect(node.left.parent).toBe(node)
      }

      if (!isNil(node.right)) {
        expect((tree as any).compare(node.right.values[0], node.values[0])).toBeGreaterThanOrEqual(0)
        expect(node.right.parent).toBe(node)
      }

      // Red nodes cannot have red children.
      if (node.color === Color.RED) {
        expect(node.left.color).toBe(Color.BLACK)
        expect(node.right.color).toBe(Color.BLACK)
      }

      const leftBlackHeight = dfs(node.left)
      const rightBlackHeight = dfs(node.right)

      // Equal black height on every path.
      expect(leftBlackHeight).toBe(rightBlackHeight)

      return leftBlackHeight + (node.color === Color.BLACK ? 1 : 0)
    }

    dfs(root)
  }

  test('stores multiple items with equal keys', () => {
    const tree = makeTree()
    const a: Item = { name: 'foo', value: 5 }
    const b: Item = { name: 'bar', value: 5 }
    const c: Item = { name: 'baz', value: 5 }
    tree.insert(a)
    tree.insert(b)
    tree.insert(c)
    const values = inorder(tree)
    expect(values.length).toBe(3)
    expect(values).toEqual(expect.arrayContaining([a, b, c]))
    expect(values.map(v => v.value)).toEqual([5, 5, 5])
  })

  test('search returns some matching element for duplicate keys', () => {
    const tree = makeTree()
    const a: Item = { name: 'foo', value: 5 }
    const b: Item = { name: 'bar', value: 5 }
    tree.insert(a)
    tree.insert(b)
    const found = tree.search(a)
    expect(found).not.toBeNull()
    expect((found as RedBlackNode<Item>).values[0]?.value).toBe(5)
    expect((found as RedBlackNode<Item>).values[0] === a || (found as RedBlackNode<Item>).values[0] === b).toBe(true)
  })

  test('remove deletes only one instance of a duplicate key', () => {
    const tree = makeTree()
    const a: Item = { name: 'foo', value: 5 }
    const b: Item = { name: 'bar', value: 5 }
    const c: Item = { name: 'baz', value: 5 }
    tree.insert(a)
    tree.insert(b)
    tree.insert(c)
    tree.remove(a)
    const values = inorder(tree)
    expect(values.length).toBe(2)
    expect(values).toEqual(expect.arrayContaining([b, c]))
    expect(values.map(v => v.value)).toEqual([5, 5])
  })

  test('multiple removes eventually clear all duplicates', () => {
    const tree = makeTree()
    const items = Array.from({ length: 10 }, (_, i) => ({
      name: `x${i}`,
      value: 5
    }))
    for (const item of items) tree.insert(item)
    for (const item of items) tree.remove(item)
    expect(tree.minimum()).toBeNull()
    expect(inorder(tree)).toEqual([])
  })

  test('ordering remains valid with mixed keys', () => {
    const tree = makeTree()
    const items: Item[] = [
      { name: 'a', value: 10 },
      { name: 'b', value: 5 },
      { name: 'c', value: 10 },
      { name: 'd', value: 1 },
      { name: 'e', value: 5 }
    ]
    items.forEach(i => tree.insert(i))
    const values = inorder(tree)
    expect(values.map(v => v.value)).toEqual([1, 5, 5, 10, 10])
    expect(values.length).toBe(5)
  })

  test('randomized stress test with duplicates and removals (identity-safe)', () => {
    const tree = makeTree()

    const reference: Item[] = []
    const allInserted: Item[] = []

    function inorder (tree: RedBlackTree<Item>): Item[] {
      const result: Item[] = []

      let node = tree.minimum()
      while (node != null) {
        result.push(...node.values)
        node = tree.successor(node)
      }

      return result
    }

    function sortedRef (): Item[] {
      return [...reference].sort((a, b) => a.value - b.value)
    }

    const ops = 2000
    const rand = getSeededPrng()

    for (let i = 0; i < ops; i++) {
      const op = rand()

      if (op < 0.6 || reference.length === 0) {
        const item: Item = {
          name: `n${Math.floor(rand() * 1000)}`,
          value: Math.floor(rand() * 20)
        }

        tree.insert(item)

        reference.push(item)
        allInserted.push(item)
      } else {
        const idx = Math.floor(rand() * reference.length)
        const target = reference[idx]

        tree.remove(target as Item)
        reference.splice(idx, 1)
      }

      validateRedBlackProperties(tree)

      expect(inorder(tree)).toEqual(sortedRef())
    }
  })
})
