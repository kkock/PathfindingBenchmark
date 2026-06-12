export function quickSelect<T> (list: T[], k: number, compareFn: (a: T, b: T) => number): T {
  return select(list, 0, list.length - 1, k, compareFn)
}

function select<T> (list: T[], left: number, right: number, k:number, compareFn: (a: T, b: T) => number): T {
  if (left === right) return list[left]!
  
  const pivotIndex = partition(
    list,
    left,
    right,
    medianOfThree(list, left, right, compareFn),
    compareFn
  )

  if (k === pivotIndex) {
    return list[k]!
  } else if (k < pivotIndex) {
    return select(list, left, pivotIndex - 1, k, compareFn)
  } else {
    return select(list, pivotIndex + 1, right, k, compareFn)
  }
}

function partition<T> (
  list: T[],
  left: number,
  right: number,
  pivotIndex: number,
  compareFn: (a: T, b: T) => number
): number {
  const pivotValue = list[pivotIndex]!
  ;[list[pivotIndex]!, list[right]!] = [list[right]!, list[pivotIndex]!]
  let storeIndex = left
  for (let i = left; i < right; i++) {
    if (compareFn(list[i]!, pivotValue) < 0) {
      ;[list[storeIndex]!, list[i]!] = [list[i]!, list[storeIndex]!]
      storeIndex++
    }
  }
  ;[list[storeIndex]!, list[right]!] = [list[right]!, list[storeIndex]!]
  return storeIndex
}

function medianOfThree<T> (
  arr: T[],
  left: number,
  right: number,
  compareFn: (a: T, b: T) => number
): number {
    const mid = left + ((right - left) >> 1)

    const a = arr[left]!
    const b = arr[mid]!
    const c = arr[right]!

    return compareFn(a, b) < 0
      ? compareFn(b, c) < 0
        ? mid
        : compareFn(a, c) < 0
          ? right
          : left
      : compareFn(a, c) < 0
        ? left
        : compareFn(b, c) < 0
          ? right
          : mid
}