/**
 * Path handles — the optional ergonomic layer (spec §5).
 *
 * A handle binds a single path to an object exposing the uniform verbs, so you
 * don't repeat the path string. It's a thin delegator over the composed store:
 * it owns no state, only the bound path.
 */

import type { Listener, Mapper, Path, Predicate, Unsubscribe, Updater } from "./types";

/** The subset of the store a handle delegates to. */
export interface HandleHost {
  get(path: Path): unknown;
  set(path: Path, value: unknown): void;
  update(path: Path, fn: Updater): void;
  delete(path: Path): void;
  subscribe(path: Path, fn: Listener): Unsubscribe;
  push(path: Path, value: unknown): void;
  remove(path: Path, predicate: Predicate): void;
  map(path: Path, mapper: Mapper): void;
  clear(path: Path): void;
  is_dirty(path: Path): boolean;
}

/** An object bound to one path, exposing the uniform API without the string. */
export interface Handle {
  /** The path this handle is bound to. */
  readonly path: Path;
  get(): unknown;
  set(value: unknown): void;
  update(fn: Updater): void;
  delete(): void;
  subscribe(fn: Listener): Unsubscribe;
  push(value: unknown): void;
  remove(predicate: Predicate): void;
  map(mapper: Mapper): void;
  clear(): void;
  is_dirty(): boolean;
}

/** Bind `path` on `host`, returning a {@link Handle}. */
export function create_handle(host: HandleHost, path: Path): Handle {
  return {
    path,
    get: () => host.get(path),
    set: (value) => host.set(path, value),
    update: (fn) => host.update(path, fn),
    delete: () => host.delete(path),
    subscribe: (fn) => host.subscribe(path, fn),
    push: (value) => host.push(path, value),
    remove: (predicate) => host.remove(path, predicate),
    map: (mapper) => host.map(path, mapper),
    clear: () => host.clear(path),
    is_dirty: () => host.is_dirty(path),
  };
}
