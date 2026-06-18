import { describe, expect, test } from '@jest/globals'
import { RedBlackTree, Color } from '../src/ds/RedBlackTree2'
import { getSeededPrng } from './utils'

describe("RedBlackTree", () => {
  function verifyRedBlackTree (tree: any) {
    const root = tree.root

    if (!root) return

    expect(root.color).toBe(Color.BLACK)

    function dfs(node: any): number {
      if (!node) return 1

      if (node.color === Color.RED) {
        expect(node.left?.color).not.toBe(Color.RED)
        expect(node.right?.color).not.toBe(Color.RED)
      }

      const left = dfs(node.left)
      const right = dfs(node.right)

      expect(left).toBe(right)

      return left + (node.color === Color.BLACK ? 1 : 0)
    }

    dfs(root)
  }

  test("initializes to an empty tree", () => {
    const tree = new RedBlackTree<number>(x => x)
    expect(tree.size).toBe(0)
    expect(tree.min()).toBeUndefined()
    expect([...tree.range(-100, 100)]).toEqual([])
  })

  test("single insert adds the item", () => {
    const tree = new RedBlackTree<number>(x => x)
    tree.insert(10)
    expect(tree.size).toBe(1)
    expect(tree.min()).toBe(10)
    expect([...tree.range(0, 20)]).toEqual([10])
  })

  test("multiple inserts are returned in sorted order", () => {
    const tree = new RedBlackTree<number>(x => x)
    ;[10, 5, 20, 15, 1, 30].forEach(v => tree.insert(v))
    expect([...tree.range(-Infinity, Infinity)]).toEqual([1, 5, 10, 15, 20, 30])
  })

  test("minimum updates correctly", () => {
    const tree = new RedBlackTree<number>(x => x)
    tree.insert(20)
    tree.insert(10)
    tree.insert(5)
    expect(tree.min()).toBe(5)
    tree.remove(5)
    expect(tree.min()).toBe(10)
  })

  test("remove leaf node doesn't invlaidate the tree", () => {
    const tree = new RedBlackTree<number>(x => x)
    ;[10, 5, 20].forEach(v => tree.insert(v))
    tree.remove(5)
    expect(tree.size).toBe(2)
    expect([...tree.range(-Infinity, Infinity)]).toEqual([10, 20])
  })

  test("remove root doesn't invlaidate the tree", () => {
    const tree = new RedBlackTree<number>(x => x)
    ;[10, 5, 20].forEach(v => tree.insert(v))
    tree.remove(10)
    expect(tree.size).toBe(2)
    expect([...tree.range(-Infinity, Infinity)]).toEqual([5, 20])
  })

  test("remove missing value is a no-op", () => {
    const tree = new RedBlackTree<number>(x => x)
    tree.insert(10)
    tree.remove(999)
    expect(tree.size).toBe(1)
    expect([...tree.range(-Infinity, Infinity)]).toEqual([10])
  })

  test("range query returns the matching range of items", () => {
    const tree = new RedBlackTree<number>(x => x)
    ;[1, 5, 10, 15, 20, 25].forEach(v => tree.insert(v))
    expect([...tree.range(6, 21)]).toEqual([10, 15, 20])
  })

  test("range boundaries are inclusive", () => {
    const tree = new RedBlackTree<number>(x => x)
    ;[10, 20, 30].forEach(v => tree.insert(v))
    expect([...tree.range(10, 20)]).toEqual([10, 20])
  })

  test("duplicate keys with distinct objects are allowed", () => {
    const tree = new RedBlackTree<{ id: number, name: string }>(x => x.id)
    const a = { id: 1, name: "A" }
    const b = { id: 1, name: "B" }
    const c = { id: 1, name: "C" }
    tree.insert(a)
    tree.insert(b)
    tree.insert(c)
    expect(tree.size).toBe(3)
    tree.remove(b)
    const remaining = [...tree.range(1, 1)]
    expect(tree.size).toBe(2)
    expect(remaining).toContain(a)
    expect(remaining).toContain(c)
    expect(remaining).not.toContain(b)
  })

  test("invariants are maintained under randomized insert/remove", () => {
    const tree = new RedBlackTree<number>(x => x)
    const reference = new Map<number, number>()

    const rand = getSeededPrng()
    const ITERATIONS = 1_000
    const MAX_SIZE = 100
    for (let i = 0; i < ITERATIONS; i++) {
      if (i % 100 === 0) console.log(i, tree.size)
      const value = Math.floor(rand() * 1_000_000_000)

      if ((rand() < 0.6 || tree.size === 0) && tree.size < MAX_SIZE) {
        tree.insert(value)
        reference.set(value, (reference.get(value) ?? 0) + 1)
      } else {
        tree.remove(value)
        const count = reference.get(value)
        if (count !== undefined) {
          if (count <= 1) reference.delete(value)
          else reference.set(value, count - 1)
        }
      }

      const expected: number[] = []
      for (const [k, count] of reference) {
        for (let i = 0; i < count; i++) expected.push(k)
      }
      expected.sort((a, b) => a - b)
      expect([...tree.range(-Infinity, Infinity)]).toEqual(expected)
      verifyRedBlackTree(tree)
    }
  })
})