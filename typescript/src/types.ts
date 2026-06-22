/**
 * Shared types for the path-based reactive store.
 *
 * Every value in the store is addressed by a dot-delimited {@link Path}
 * (e.g. `"user.first_name"`). These types are the common vocabulary shared by
 * every module, so they live in one place to keep the rest of the codebase DRY.
 */

/** A dot-delimited string addressing a node, e.g. `"user.first_name"`. */
export type Path = string;

/** Called with the current value at a path whenever that path changes. */
export type Listener<T = unknown> = (value: T) => void;

/** Returned by subscriptions/effects; call it to stop listening. */
export type Unsubscribe = () => void;

/** Functional update: receives the current value, returns the next one. */
export type Updater<T = unknown> = (current: T) => T;

/** Predicate used by collection helpers (`remove`). */
export type Predicate<T = unknown> = (item: T) => boolean;

/** Mapper used by collection helpers (`map`). */
export type Mapper<T = unknown, R = unknown> = (item: T) => R;

/** An immutable capture of the whole store state. */
export interface Snapshot {
  state: Record<string, unknown>;
}

/**
 * The low-level reactive engine every feature module is built on.
 *
 * Feature modules (collections, reactive, resources, …) receive a `StoreCore`
 * and never touch global state directly — this is the single contract that
 * keeps the modules decoupled and independently testable.
 */
export interface StoreCore {
  /** Read the value at `path` (`undefined` if absent). */
  get(path: Path): unknown;
  /** Write `value` at `path`, creating intermediate objects as needed. */
  set(path: Path, value: unknown): void;
  /** Functionally update the value at `path`. */
  update(path: Path, fn: Updater): void;
  /** Remove the value at `path`. */
  delete(path: Path): void;
  /**
   * Listen for changes at `path`. The listener fires after the value changes
   * (not immediately on subscribe). Changes to ancestors or descendants of
   * `path` also notify `path`, so subscribing to `"user"` reacts to
   * `"user.first_name"` edits and vice-versa.
   */
  subscribe(path: Path, fn: Listener): Unsubscribe;
  /** Coalesce all notifications produced inside `fn` into one flush. */
  batch(fn: () => void): void;
  /** Raw root state object (live reference — treat as read-mostly). */
  getState(): Record<string, unknown>;
  /** Replace the entire root state and notify every known path. */
  replaceState(state: Record<string, unknown>): void;
}

/** Resource status flags, surfaced under `<resource>.*` paths. */
export interface ResourceStatus {
  loading: boolean;
  saving: boolean;
  error: unknown;
  dirty: boolean;
}

/** Configuration passed to `store.resource(path, config)`. */
export interface ResourceConfig<T = unknown> {
  /** Fetch canonical state from the server. */
  load: () => Promise<T> | T;
  /** Persist the minimal change set. */
  save?: (changes: Partial<T>) => Promise<unknown> | unknown;
}
