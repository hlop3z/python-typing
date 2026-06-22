/**
 * Global undo/redo by decorating a {@link StoreCore}.
 *
 * `create_history` wraps a core and returns a new core that behaves identically
 * except that every mutating call (`set`, `update`, `delete`, `replaceState`)
 * captures a snapshot of the whole state first. `undo`/`redo` then move between
 * those snapshots — applying them through the UNDERLYING core so the history
 * machinery never records its own restores.
 *
 * During a `batch(...)` only ONE snapshot is captured (on the first mutation),
 * so a multi-step batch undoes/redoes as a single logical step.
 */

import type {
  Listener,
  Path,
  Snapshot,
  StoreCore,
  Unsubscribe,
  Updater,
} from "./types";
import { structured_clone } from "./utils";

/**
 * Decorate `core` with global undo/redo.
 *
 * @param core - The underlying reactive core to wrap.
 * @returns The wrapped `core` plus `snapshot`, `undo`, and `redo` helpers.
 */
export function create_history(core: StoreCore): {
  core: StoreCore;
  snapshot: () => Snapshot;
  undo: () => void;
  redo: () => void;
} {
  const undo_stack: Record<string, unknown>[] = [];
  const redo_stack: Record<string, unknown>[] = [];

  /** Greater than zero while inside a (possibly nested) wrapped `batch`. */
  let batch_depth = 0;
  /** True once a snapshot has been captured for the current top-level batch. */
  let captured_this_batch = false;

  /**
   * Push a clone of the current state onto the undo stack and clear redo.
   * Inside a batch this records at most once (on the first mutation).
   */
  function capture(): void {
    if (batch_depth > 0) {
      if (captured_this_batch) return;
      captured_this_batch = true;
    }
    undo_stack.push(structured_clone(core.getState()));
    redo_stack.length = 0;
  }

  function get(path: Path): unknown {
    return core.get(path);
  }

  function set(path: Path, value: unknown): void {
    capture();
    core.set(path, value);
  }

  function update(path: Path, fn: Updater): void {
    capture();
    core.update(path, fn);
  }

  function remove(path: Path): void {
    capture();
    core.delete(path);
  }

  function subscribe(path: Path, fn: Listener): Unsubscribe {
    return core.subscribe(path, fn);
  }

  function batch(fn: () => void): void {
    batch_depth++;
    try {
      core.batch(fn);
    } finally {
      batch_depth--;
      if (batch_depth === 0) captured_this_batch = false;
    }
  }

  function getState(): Record<string, unknown> {
    return core.getState();
  }

  function replaceState(next: Record<string, unknown>): void {
    capture();
    core.replaceState(next);
  }

  const wrapped: StoreCore = {
    get,
    set,
    update,
    delete: remove,
    subscribe,
    batch,
    getState,
    replaceState,
  };

  /** Capture the entire store state as an immutable clone. */
  function snapshot(): Snapshot {
    return { state: structured_clone(core.getState()) };
  }

  /** Restore the most recent pre-mutation state, if any. */
  function undo(): void {
    const previous = undo_stack.pop();
    if (previous === undefined) return;
    redo_stack.push(structured_clone(core.getState()));
    // Apply through the underlying core so this restore is not re-recorded.
    core.replaceState(previous);
  }

  /** Re-apply the most recently undone state, if any. */
  function redo(): void {
    const next = redo_stack.pop();
    if (next === undefined) return;
    undo_stack.push(structured_clone(core.getState()));
    // Apply through the underlying core so this restore is not re-recorded.
    core.replaceState(next);
  }

  return { core: wrapped, snapshot, undo, redo };
}
