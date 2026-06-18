import { describe, expect, test } from '@jest/globals'
import {TreeMultiSet} from 'data-structure-typed'

describe('TreeMultiSet', () => {
  test('', () => {
    const tree = new TreeMultiSet<{key: number}>(undefined, {
      comparator: (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0
    })

    const nodeA = { key: 1 }
    const nodeB = { key: 1 }

    console.log(tree.add(nodeA))
    console.log(tree.add(nodeB))

    while (tree.size > 0) {
      const node = tree.first()
      expect(node).toBeDefined()
      tree.delete(node!)
    }
  })
})