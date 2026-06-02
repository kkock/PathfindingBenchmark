type ClassType<T> = new (...args: any[]) => T

export interface InstanceRegistry<T> {
  set: <C extends ClassType<T>>(constructor: C, instance: InstanceType<C>) => void
  has: <C extends ClassType<T>>(constructor: C) => boolean
  get: <C extends ClassType<T>>(constructor: C) => InstanceType<C>
  delete: <C extends ClassType<T>>(constructor: C) => boolean
  clear: () => void
  entries: () => MapIterator<[ClassType<T>, T]>
  keys: () => MapIterator<ClassType<T>>
  values: () => MapIterator<T>
  forEach: (callbackfn: <C extends ClassType<T>> (value: InstanceType<C>, key: C, map: Map<ClassType<T>, T>) => void, thisArg?: any) => void
  get size (): number
}
