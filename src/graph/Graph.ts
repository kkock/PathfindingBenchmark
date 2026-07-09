export interface SearchDomain<S> extends Object {
  successors (state: S): Iterable<S>
  normalize (state: S): S
}