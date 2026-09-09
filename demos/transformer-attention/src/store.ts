/** A ~15-line reactive store, so the demo needs no UI framework. */

export interface Store<T> {
  get(): T;
  set(patch: Partial<T> | ((s: T) => Partial<T>)): void;
  subscribe(fn: (s: T) => void): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const subs = new Set<(s: T) => void>();
  return {
    get: () => state,
    set(patch) {
      const delta = typeof patch === 'function' ? patch(state) : patch;
      state = { ...state, ...delta };
      for (const fn of subs) fn(state);
    },
    subscribe(fn) {
      subs.add(fn);
      fn(state);
      return () => subs.delete(fn);
    },
  };
}
