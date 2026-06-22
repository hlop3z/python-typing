/**
 * Reactive derivations built on the {@link StoreCore} contract.
 *
 * Two primitives:
 *  - `compute` writes a value derived from other paths, keeping it in sync.
 *  - `effect` runs a side effect whenever its dependencies change.
 *
 * Both subscribe to each dependency path via `core.subscribe`, so they react to
 * ancestor/descendant edits exactly like any other listener.
 */

import type { StoreCore, Unsubscribe } from "./types";

export function create_reactive(core: StoreCore) {
  /**
   * Derive `path` from `deps`: read each dep, call `fn` with their values, and
   * write the result to `path`. Recomputes immediately, then whenever any dep
   * path changes. Recomputation is batched so a multi-dep change coalesces.
   *
   * Do not list the output `path` among `deps` — its own write would retrigger.
   */
  function compute(path: string, deps: string[], fn: (...values: unknown[]) => unknown): void {
    const recompute = (): void => {
      core.batch(() => {
        const values = deps.map((dep) => core.get(dep));
        core.set(path, fn(...values));
      });
    };

    recompute();
    for (const dep of deps) core.subscribe(dep, recompute);
  }

  /**
   * Run `fn` with the current dep values immediately, then again whenever any
   * dep changes. Returns an unsubscribe that detaches every dep subscription.
   */
  function effect(deps: string[], fn: (...values: unknown[]) => void): Unsubscribe {
    const run = (): void => {
      const values = deps.map((dep) => core.get(dep));
      fn(...values);
    };

    run();
    const unsubscribers = deps.map((dep) => core.subscribe(dep, run));
    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }

  return { compute, effect };
}
