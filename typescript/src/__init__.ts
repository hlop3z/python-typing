/**
 * Path-Based Reactive Store — public entry point.
 *
 * Implements the design in `nanostore.md`: one uniform, path-addressed API over
 * a reactive core, plus a resource layer with draft/dirty/save semantics.
 *
 * Composition wires two cores together:
 *  - `base`    — the reactive engine (state + subscriptions + batching).
 *  - `tracked` — `base` decorated with global undo/redo capture.
 *
 * User-facing mutations (`set`/`update`/`delete` and collection verbs) flow
 * through `tracked` so they're undoable. Derived and internal writes (computed
 * outputs, resource status flags) use `base` directly so global history records
 * intentful edits, not bookkeeping. Subscriptions all live on the shared base
 * registry, so everything reacts uniformly regardless of which core wrote.
 *
 * @example
 * ```ts
 * const store = create_store({ users: [], user: {} });
 * store.push("users", { id: 1 });
 * store.set("user.first_name", "john");
 * store.compute("user.full_name",
 *   ["user.first_name", "user.last_name"],
 *   (first, last) => `${first} ${last}`);
 * ```
 */

import type {
  Listener,
  Mapper,
  Path,
  Predicate,
  ResourceConfig,
  Snapshot,
  Unsubscribe,
  Updater,
} from "./types";
import { create_core } from "./core";
import { create_history } from "./history";
import { create_reactive } from "./reactive";
import { create_collections } from "./collections";
import { create_resources } from "./resource";
import { create_schema } from "./schema";
import { create_handle, type Handle } from "./handle";

/** A value derivation dependency: a path string or a bound {@link Handle}. */
export type Dep = Path | Handle;

/** The composed store returned by {@link create_store}. */
export interface Store {
  // §3.1 Read
  get(path: Path): unknown;
  // §3.2 Write
  set(path: Path, value: unknown): void;
  update(path: Path, fn: Updater): void;
  delete(path: Path): void;
  // §3.3 React
  subscribe(path: Path, fn: Listener): Unsubscribe;
  compute(
    path: Path,
    deps: Path[],
    fn: (...values: unknown[]) => unknown,
  ): Handle;
  compute(deps: Dep[], fn: (...values: unknown[]) => unknown): Handle;
  effect(deps: Path[], fn: (...values: unknown[]) => void): Unsubscribe;
  // §3.4 Collections
  push(path: Path, value: unknown): void;
  remove(path: Path, predicate: Predicate): void;
  map(path: Path, mapper: Mapper): void;
  clear(path: Path): void;
  // §3.5 Lifecycle
  batch(fn: () => void): void;
  snapshot(): Snapshot;
  undo(path?: Path): void;
  redo(): void;
  // §4 Declarative init
  schema(shape: Record<string, unknown>): void;
  // §5 Path handles
  path(path: Path): Handle;
  // §6 Resources
  resource(path: Path, config: ResourceConfig): void;
  refresh(path: Path): Promise<void>;
  save(path: Path): Promise<void>;
  revert(path: Path): void;
  is_dirty(path: Path): boolean;
}

/** Create a store, optionally seeded with initial top-level values. */
export function create_store(initial: Record<string, unknown> = {}): Store {
  const base = create_core(initial);
  const {
    core: tracked,
    snapshot,
    undo: history_undo,
    redo,
  } = create_history(base);

  // Derived/internal writers use `base` (not undoable); user mutations use
  // `tracked` (undoable). Both share `base`'s subscription registry.
  const reactive = create_reactive(base);
  const collections = create_collections(tracked);
  const resources = create_resources(base);
  const { schema } = create_schema(base);

  let computed_seq = 0;
  const dep_path = (dep: Dep): Path =>
    typeof dep === "string" ? dep : dep.path;

  function compute(
    a: Path | Dep[],
    b: Path[] | ((...values: unknown[]) => unknown),
    c?: (...values: unknown[]) => unknown,
  ): Handle {
    if (typeof a === "string") {
      // compute(path, deps, fn)
      reactive.compute(a, b as Path[], c as (...values: unknown[]) => unknown);
      return store.path(a);
    }
    // compute(deps[], fn) → derive an anonymous path and hand back a handle.
    const deps = a.map(dep_path);
    const fn = b as (...values: unknown[]) => unknown;
    const path = `__computed__.${computed_seq++}`;
    reactive.compute(path, deps, fn);
    return store.path(path);
  }

  function undo(path?: Path): void {
    // §6.2 resource-level draft undo when a path is given; else §3.5 global.
    if (path !== undefined) resources.undo(path);
    else history_undo();
  }

  const store: Store = {
    // Read / write — write verbs are history-tracked.
    get: base.get,
    set: tracked.set,
    update: tracked.update,
    delete: tracked.delete,
    // React
    subscribe: base.subscribe,
    compute,
    effect: reactive.effect,
    // Collections (history-tracked)
    push: collections.push,
    remove: collections.remove,
    map: collections.map,
    clear: collections.clear,
    // Lifecycle
    batch: tracked.batch,
    snapshot,
    undo,
    redo,
    // Declarative init
    schema,
    // Handles
    path: (p: Path) => create_handle(store, p),
    // Resources
    resource: resources.resource,
    refresh: resources.refresh,
    save: resources.save,
    revert: resources.revert,
    is_dirty: resources.is_dirty,
  };

  return store;
}

export default create_store;

// Re-export the public surface for consumers and tooling.
export type {
  Listener,
  Mapper,
  Path,
  Predicate,
  ResourceConfig,
  ResourceStatus,
  Snapshot,
  StoreCore,
  Unsubscribe,
  Updater,
} from "./types";
export { create_handle, type Handle, type HandleHost } from "./handle";
