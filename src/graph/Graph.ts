export interface SearchDomain<S> {
  successors (state: S): Iterable<S>
  normalize (state: S): S
}