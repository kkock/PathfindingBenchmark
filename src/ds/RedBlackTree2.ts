export enum Color {
  RED = 0,
  BLACK = 1,
}

export class RedBlackNode<T> {
  value: T
  color: Color
  left: RedBlackNode<T> | null = null
  right: RedBlackNode<T> | null = null
  parent: RedBlackNode<T> | null = null

  constructor (value: T, color: Color = Color.RED) {
    this.value = value
    this.color = color
  }
}

export class RedBlackTree<T> {
  private root: RedBlackNode<T> | null = null
  private _size = 0

  constructor(
    private readonly key: (a: T) => number
  ) {}

  get size(): number {
    return this._size
  }

  private compare (a: T, b: T): number {
    const ka = this.key(a)
    const kb = this.key(b)
    return ka < kb ? -1 : ka > kb ? 1 : 0
  }

  insert (value: T): void {
    const node = new RedBlackNode(value)

    let y: RedBlackNode<T> | null = null
    let x = this.root

    while (x != null) {
      y = x
      x = this.compare(value, x.value) < 0 ? x.left : x.right
    }

    node.parent = y

    if (y == null) {
      this.root = node
    } else if (this.compare(value, y.value) < 0) {
      y.left = node
    } else {
      y.right = node
    }

    this.insertFixup(node)
    this._size++
  }

  remove (value: T): void {
    const node = this.findNode(value)
    if (node == null) return

    let y = node
    let yOriginalColor = y.color
    let x: RedBlackNode<T> | null
    let xParent: RedBlackNode<T> | null

    if (node.left == null) {
      x = node.right
      xParent = node.parent
      this.transplant(node, node.right)
    } else if (node.right == null) {
      x = node.left
      xParent = node.parent
      this.transplant(node, node.left)
    } else {
      y = this.minimumNode(node.right)!
      yOriginalColor = y.color
      x = y.right;
      if (y.parent === node) {
        xParent = y
      } else {
        xParent = y.parent
        this.transplant(y, y.right)
        y.right = node.right
        if (y.right) y.right.parent = y
      }

      this.transplant(node, y)
      y.left = node.left
      if (y.left) y.left.parent = y
      y.color = node.color
    }

    this._size--

    if (yOriginalColor === Color.BLACK) this.deleteFixup(x, xParent)
  }

  min (): T | undefined {
    const node = this.minimumNode(this.root)
    return node?.value
  }

  * range (low: number, high: number): Iterable<T> {
    yield * this.rangeNode(this.root, low, high)
  }

  private * rangeNode (
    node: RedBlackNode<T> | null,
    low: number,
    high: number
  ): Generator<T> {
    if (node == null) return

    const k = this.key(node.value)

    if (k >= low) yield * this.rangeNode(node.left, low, high)
    if (k >= low && k <= high) yield node.value
    if (k <= high) yield * this.rangeNode(node.right, low, high)
  }

  private findNode (value: T, current = this.root): RedBlackNode<T> | null {
    while (current != null) {
      if (value === current.value) return current
      const cmp = this.compare(value, current.value)
      if (cmp === 0) {
        // Duplicate keys; we need to search both subtrees. 
        return (
          this.findNode(value, current.right) ??
          this.findNode(value, current.left)
        )
      }

      current = cmp < 0 ? current.left : current.right
    }
    return null
  }

  private minimumNode (node: RedBlackNode<T> | null): RedBlackNode<T> | null {
    while (node?.left != null) node = node.left
    return node
  }

  private rotateLeft (x: RedBlackNode<T>): void {
    const y = x.right!
    x.right = y.left
    if (y.left != null) y.left.parent = x

    y.parent = x.parent
    if (x.parent == null) {
      this.root = y
    } else if (x === x.parent.left) {
      x.parent.left = y
    } else {
      x.parent.right = y
    }

    y.left = x
    x.parent = y
  }

  private rotateRight (y: RedBlackNode<T>): void {
    const x = y.left!
    y.left = x.right
    if (x.right != null) x.right.parent = y

    x.parent = y.parent
    if (y.parent == null) {
      this.root = x
    } else if (y === y.parent.right) {
      y.parent.right = x
    } else {
      y.parent.left = x
    }

    x.right = y
    y.parent = x
  }

  private insertFixup (z: RedBlackNode<T>): void {
    while (z.parent?.color === Color.RED) {
      if (z.parent === z.parent.parent?.left) {
        const y = z.parent.parent.right
        if (y?.color === Color.RED) {
          z.parent.color = Color.BLACK
          y.color = Color.BLACK
          z.parent.parent.color = Color.RED
          z = z.parent.parent
        } else {
          if (z === z.parent.right) {
            z = z.parent
            this.rotateLeft(z)
          }
          z.parent!.color = Color.BLACK
          z.parent!.parent!.color = Color.RED
          this.rotateRight(z.parent!.parent!)
        }
      } else {
        const y = z.parent.parent?.left
        if (y?.color === Color.RED) {
          z.parent.color = Color.BLACK
          y.color = Color.BLACK
          z.parent.parent!.color = Color.RED
          z = z.parent.parent!
        } else {
          if (z === z.parent.left) {
            z = z.parent
            this.rotateRight(z)
          }
          z.parent!.color = Color.BLACK
          z.parent!.parent!.color = Color.RED
          this.rotateLeft(z.parent!.parent!)
        }
      }
    }

    if (this.root != null) this.root.color = Color.BLACK;
  }

  private transplant (u: RedBlackNode<T>, v: RedBlackNode<T> | null): void {
    if (u.parent == null) {
      this.root = v
    } else if (u === u.parent.left) {
      u.parent.left = v
    } else {
      u.parent.right = v
    }

    if (v) v.parent = u.parent
  }

  private colorOf (node: RedBlackNode<T> | null | undefined): Color {
    return node?.color ?? Color.BLACK
  }

  private deleteFixup (x: RedBlackNode<T> | null, parent: RedBlackNode<T> | null): void {
    while (x !== this.root && this.colorOf(x) === Color.BLACK) {
      if (x === parent?.left) {
        let w = parent.right
        if (this.colorOf(w) === Color.RED) {
          w!.color = Color.BLACK
          parent.color = Color.RED
          this.rotateLeft(parent)
          w = parent.right
        }

        if (this.colorOf(w?.left) === Color.BLACK && this.colorOf(w?.right) === Color.BLACK) {
          if (w != null) w.color = Color.RED
          x = parent
          parent = x.parent
        } else {
          if (this.colorOf(w?.right) === Color.BLACK) {
            if (w?.left != null) w.left.color = Color.BLACK
            if (w != null) {
              w.color = Color.RED
              this.rotateRight(w)
            }
            w = parent.right
          }

          if (w != null) w.color = parent.color;
          parent.color = Color.BLACK
          if (w?.right != null) w.right.color = Color.BLACK
          this.rotateLeft(parent)
          x = this.root
          parent = null
        }
      } else {
        let w = parent?.left
        if (this.colorOf(w) === Color.RED) {
          w!.color = Color.BLACK
          parent!.color = Color.RED
          this.rotateRight(parent!)
          w = parent!.left
        }

        if (this.colorOf(w?.right) === Color.BLACK && this.colorOf(w?.left) === Color.BLACK) {
          if (w != null) w.color = Color.RED
          x = parent
          parent = x?.parent ?? null
        } else {
          if (this.colorOf(w?.left) === Color.BLACK) {
            if (w?.right != null) w.right.color = Color.BLACK
            if (w  != null) {
              w.color = Color.RED
              this.rotateLeft(w)
            }
            w = parent!.left
          }

          if (w != null) w.color = parent!.color;
          parent!.color = Color.BLACK
          if (w?.left != null) w.left.color = Color.BLACK
          this.rotateRight(parent!)
          x = this.root
          parent = null
        }
      }
    }

    if (x) x.color = Color.BLACK
  }
}