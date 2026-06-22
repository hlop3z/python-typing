/**
 * Collection helpers: immutable array operations over a path.
 *
 * Each helper reads the array currently stored at `path`, produces a brand-new
 * array (never mutating the existing one), and writes it back through
 * `core.update` so every subscriber to the path fires. A missing or non-array
 * value is treated as an empty array, so callers never need to seed the path.
 */

import type { Mapper, Predicate, StoreCore } from "./types";

export function create_collections(core: StoreCore) {
  /** Coerce an arbitrary stored value into an array (empty if not one). */
  function as_array(current: unknown): unknown[] {
    return Array.isArray(current) ? current : [];
  }

  return {
    /**
     * Append `value` to the array at `path`.
     * @param path Dot-delimited path to the target array.
     * @param value Item to append.
     */
    push(path: string, value: unknown): void {
      core.update(path, (current) => [...as_array(current), value]);
    },

    /**
     * Remove every item from the array at `path` for which `predicate` returns
     * `true`, keeping the rest.
     * @param path Dot-delimited path to the target array.
     * @param predicate Returns `true` for items that should be dropped.
     */
    remove(path: string, predicate: Predicate): void {
      core.update(path, (current) =>
        as_array(current).filter((item) => !predicate(item))
      );
    },

    /**
     * Replace the array at `path` with each item transformed by `mapper`.
     * @param path Dot-delimited path to the target array.
     * @param mapper Maps each item to its replacement.
     */
    map(path: string, mapper: Mapper): void {
      core.update(path, (current) =>
        as_array(current).map((item) => mapper(item))
      );
    },

    /**
     * Empty the array at `path` (sets it to `[]`).
     * @param path Dot-delimited path to the target array.
     */
    clear(path: string): void {
      core.update(path, () => []);
    },
  };
}
