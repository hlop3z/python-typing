/**
 * The reactive core: atom storage + a path-keyed subscription registry +
 * batched notification. Every feature module is built on the {@link StoreCore}
 * contract this factory returns, so this is the single source of truth for how
 * state mutates and how listeners fire.
 */

import type { Listener, Path, StoreCore, Unsubscribe, Updater } from "./types";
import { delete_in, get_in, paths_related, set_in } from "./path";

export function create_core(initial: Record<string, unknown> = {}): StoreCore {
  let state: Record<string, unknown> = initial;

  /** path -> set of listeners registered for exactly that path. */
  const listeners = new Map<Path, Set<Listener>>();

  /** Batch depth + the set of paths touched during the current batch. */
  let batch_depth = 0;
  const pending = new Set<Path>();

  function get(path: Path): unknown {
    return get_in(state, path);
  }

  /**
   * Notify every registered path that is related to `changed` — i.e. the path
   * itself, its ancestors (their nested value changed), and its descendants
   * (a parent replacement may have changed them).
   */
  function flush(changed: Iterable<Path>): void {
    const changed_paths = [...changed];
    // Snapshot listener keys so re-subscribes during notification are safe.
    for (const [registered, fns] of [...listeners.entries()]) {
      const hit = changed_paths.some((c) => paths_related(c, registered));
      if (!hit) continue;
      const value = get(registered);
      for (const fn of [...fns]) fn(value);
    }
  }

  function notify(path: Path): void {
    if (batch_depth > 0) {
      pending.add(path);
      return;
    }
    flush([path]);
  }

  function set(path: Path, value: unknown): void {
    set_in(state, path, value);
    notify(path);
  }

  function update(path: Path, fn: Updater): void {
    set(path, fn(get(path)));
  }

  function remove(path: Path): void {
    delete_in(state, path);
    notify(path);
  }

  function subscribe(path: Path, fn: Listener): Unsubscribe {
    let set_for_path = listeners.get(path);
    if (!set_for_path) {
      set_for_path = new Set();
      listeners.set(path, set_for_path);
    }
    set_for_path.add(fn);
    return () => {
      const current = listeners.get(path);
      if (!current) return;
      current.delete(fn);
      if (current.size === 0) listeners.delete(path);
    };
  }

  function batch(fn: () => void): void {
    batch_depth++;
    try {
      fn();
    } finally {
      batch_depth--;
      if (batch_depth === 0 && pending.size > 0) {
        const to_flush = [...pending];
        pending.clear();
        flush(to_flush);
      }
    }
  }

  function getState(): Record<string, unknown> {
    return state;
  }

  function replaceState(next: Record<string, unknown>): void {
    state = next;
    // Notify every known path; root-relation matches everything.
    flush([...listeners.keys()]);
  }

  return {
    get,
    set,
    update,
    delete: remove,
    subscribe,
    batch,
    getState,
    replaceState,
  };
}
