import assert from 'node:assert'
import util from 'node:util'

export enum Color {
  RED = 0,
  BLACK = 1,
}

export class RedBlackNode<T> {
  values: T[]
  color: Color
  left: RedBlackNode<T>
  right: RedBlackNode<T>
  parent: RedBlackNode<T>

  constructor (value: T, color = Color.RED) {
    this.values = [value]
    this.color = color
    this.left = this.right = this.parent = null as any
  }
}

const NIL = new RedBlackNode<any>(null, Color.BLACK)
NIL.left = NIL.right = NIL.parent = NIL

export class RedBlackTree<T> {
  private root: RedBlackNode<T> = NIL

  constructor (private readonly compare: (a: T, b: T) => number) {}

  private leftRotate (x: RedBlackNode<T>): void {
    const y = x.right

    x.right = y.left
    if (y.left !== NIL) {
      y.left.parent = x
    }

    y.parent = x.parent

    if (x.parent === NIL) {
      this.root = y
    } else if (x === x.parent.left) {
      x.parent.left = y
    } else {
      x.parent.right = y
    }

    y.left = x
    x.parent = y
  }

  private rightRotate (y: RedBlackNode<T>): void {
    const x = y.left

    y.left = x.right
    if (x.right !== NIL) {
      x.right.parent = y
    }

    x.parent = y.parent

    if (y.parent === NIL) {
      this.root = x
    } else if (y === y.parent.right) {
      y.parent.right = x
    } else {
      y.parent.left = x
    }

    x.right = y
    y.parent = x
  }

  insert (value: T): void {
    const node = new RedBlackNode(value)
    node.left = node.right = NIL

    let y = NIL
    let x = this.root

    while (x !== NIL) {
      y = x

      const cmp = this.compare(value, x.values[0] as T)

      if (cmp === 0) {
      // duplicate key → store in same node
        x.values.push(value)
        return
      }

      x = cmp < 0 ? x.left : x.right
    }

    node.parent = y

    if (y === NIL) {
      this.root = node
    } else if (this.compare(value, y.values[0]) < 0) {
      y.left = node
    } else {
      y.right = node
    }

    node.color = Color.RED
    this.insertFixup(node)
  }

  private insertFixup (z: RedBlackNode<T>): void {
    while (z.parent.color === Color.RED) {
      if (z.parent === z.parent.parent.left) {
        const y = z.parent.parent.right

        if (y.color === Color.RED) {
          z.parent.color = Color.BLACK
          y.color = Color.BLACK
          z.parent.parent.color = Color.RED
          z = z.parent.parent
        } else {
          if (z === z.parent.right) {
            z = z.parent
            this.leftRotate(z)
          }

          z.parent.color = Color.BLACK
          z.parent.parent.color = Color.RED
          this.rightRotate(z.parent.parent)
        }
      } else {
        const y = z.parent.parent.left

        if (y.color === Color.RED) {
          z.parent.color = Color.BLACK
          y.color = Color.BLACK
          z.parent.parent.color = Color.RED
          z = z.parent.parent
        } else {
          if (z === z.parent.left) {
            z = z.parent
            this.rightRotate(z)
          }

          z.parent.color = Color.BLACK
          z.parent.parent.color = Color.RED
          this.leftRotate(z.parent.parent)
        }
      }
    }

    this.root.color = Color.BLACK
  }

  search (value: T): RedBlackNode<T> | null {
    let x = this.root
    while (x !== NIL) {
      const cmp = this.compare(value, x.values[0] as T)
      if (cmp === 0) return x
      x = cmp < 0 ? x.left : x.right
    }
    return null
  }

  minimum (): RedBlackNode<T> | null {
    if (this.root === NIL) return null
    return this.minimumNode(this.root)
  }

  private minimumNode (node: RedBlackNode<T>): RedBlackNode<T> {
    while (node.left !== NIL) node = node.left
    return node
  }

  successor (node: RedBlackNode<T>): RedBlackNode<T> | null {
    if (node.right !== NIL) return this.minimumNode(node.right)

    let current = node
    let parent = current.parent

    while (parent !== NIL && current === parent.right) {
      current = parent
      parent = parent.parent
    }

    return parent === NIL ? null : parent
  }

  lowerBound (key: T): RedBlackNode<T> | null {
    let current = this.root
    let candidate = NIL

    while (current !== NIL) {
      if (this.compare(current.values[0] as T, key) < 0) {
        current = current.right
      } else {
        candidate = current
        current = current.left
      }
    }

    return candidate === NIL ? null : candidate
  }

  private transplant (u: RedBlackNode<T>, v: RedBlackNode<T>): void {
    if (u.parent === NIL) {
      this.root = v
    } else if (u === u.parent.left) {
      u.parent.left = v
    } else {
      u.parent.right = v
    }

    v.parent = u.parent
  }

  remove (value: T): void {
    let z = this.root

    while (z !== NIL) {
      const cmp = this.compare(value, z.values[0] as T)
      if (cmp === 0) break
      z = cmp < 0 ? z.left : z.right
    }

    if (z === NIL) return

    // find exact instance inside bucket
    const idx = z.values.findIndex(v => v === value)
    if (idx === -1) {
      console.log(util.inspect({ z }, undefined, null))
      console.log({ value })
      console.log(util.inspect(this, undefined, null))
    }
    assert(idx !== -1, 'Value not found in bucket')
    z.values.splice(idx, 1)

    // if bucket still has elements, tree structure unchanged
    if (z.values.length > 0) return
    this.removeNode(z)
  }

  private removeNode (z: RedBlackNode<T>): void {
    let y = z
    let yOriginalColor = y.color
    let x: RedBlackNode<T>

    if (z.left === NIL) {
      x = z.right
      this.transplant(z, z.right)
    } else if (z.right === NIL) {
      x = z.left
      this.transplant(z, z.left)
    } else {
      y = this.minimumNode(z.right)
      yOriginalColor = y.color
      x = y.right
      if (y.parent === z) {
        x.parent = y
      } else {
        this.transplant(y, y.right)

        y.right = z.right
        y.right.parent = y
      }
      this.transplant(z, y)
      y.left = z.left
      y.left.parent = y
      y.color = z.color
    }

    if (yOriginalColor === Color.BLACK) this.deleteFixup(x)
  }

  private deleteFixup (x: RedBlackNode<T>): void {
    while (x !== this.root && x.color === Color.BLACK) {
      if (x === x.parent.left) {
        let w = x.parent.right

        if (w.color === Color.RED) {
          // Case 1
          w.color = Color.BLACK
          x.parent.color = Color.RED
          this.leftRotate(x.parent)
          w = x.parent.right
        }

        if (w.left.color === Color.BLACK && w.right.color === Color.BLACK) {
          // Case 2
          w.color = Color.RED
          x = x.parent
        } else {
          if (w.right.color === Color.BLACK) {
            // Case 3
            w.left.color = Color.BLACK
            w.color = Color.RED
            this.rightRotate(w)
            w = x.parent.right
          }

          // Case 4
          w.color = x.parent.color
          x.parent.color = Color.BLACK
          w.right.color = Color.BLACK

          this.leftRotate(x.parent)
          x = this.root
        }
      } else {
        let w = x.parent.left

        if (w.color === Color.RED) {
          // Case 1
          w.color = Color.BLACK
          x.parent.color = Color.RED
          this.rightRotate(x.parent)
          w = x.parent.left
        }

        if (w.right.color === Color.BLACK && w.left.color === Color.BLACK) {
          // Case 2
          w.color = Color.RED
          x = x.parent
        } else {
          if (w.left.color === Color.BLACK) {
            // Case 3
            w.right.color = Color.BLACK
            w.color = Color.RED
            this.leftRotate(w)
            w = x.parent.left
          }

          // Case 4
          w.color = x.parent.color
          x.parent.color = Color.BLACK
          w.left.color = Color.BLACK

          this.rightRotate(x.parent)
          x = this.root
        }
      }
    }

    x.color = Color.BLACK
  }
}
