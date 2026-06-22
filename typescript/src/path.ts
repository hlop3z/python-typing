/**
 * Dot-path resolution over nested objects/arrays.
 *
 * Pure, store-agnostic helpers: read, write, and delete deeply-nested values
 * addressed by a string like `"user.address.city"`. Numeric segments index
 * into arrays (`"users.0.name"`).
 */

import type { Path } from "./types";

/** Split a dot path into its segments. `""` yields `[]` (the root). */
export function split_path(path: Path): string[] {
  return path.length === 0 ? [] : path.split(".");
}

/** Join segments back into a dot path. */
export function join_path(segments: string[]): Path {
  return segments.join(".");
}

/** True when `ancestor` is a strict prefix path of `descendant`. */
export function is_ancestor(ancestor: Path, descendant: Path): boolean {
  if (ancestor === descendant) return false;
  return descendant.startsWith(ancestor + ".");
}

/** True when `a` is `b`, an ancestor of `b`, or a descendant of `b`. */
export function paths_related(a: Path, b: Path): boolean {
  return a === b || is_ancestor(a, b) || is_ancestor(b, a);
}

/** Read the value at `path` from `root`; `undefined` if any segment is missing. */
export function get_in(root: unknown, path: Path): unknown {
  const segments = split_path(path);
  let current: unknown = root;
  for (const segment of segments) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * Write `value` at `path` in `root`, creating intermediate containers as
 * needed. A numeric segment creates an array; otherwise an object. Mutates and
 * returns `root`.
 */
export function set_in(root: Record<string, unknown>, path: Path, value: unknown): Record<string, unknown> {
  const segments = split_path(path);
  if (segments.length === 0) {
    throw new Error("set_in: cannot write the root path");
  }
  let current: Record<string, unknown> = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const next = current[segment];
    if (next === null || typeof next !== "object") {
      const next_is_index = /^\d+$/.test(segments[i + 1]);
      current[segment] = next_is_index ? [] : {};
    }
    current = current[segment] as Record<string, unknown>;
  }
  current[segments[segments.length - 1]] = value;
  return root;
}

/** Remove the value at `path` from `root`. Mutates and returns `root`. */
export function delete_in(root: Record<string, unknown>, path: Path): Record<string, unknown> {
  const segments = split_path(path);
  if (segments.length === 0) {
    throw new Error("delete_in: cannot delete the root path");
  }
  let current: unknown = root;
  for (let i = 0; i < segments.length - 1; i++) {
    if (current === null || typeof current !== "object") return root;
    current = (current as Record<string, unknown>)[segments[i]];
  }
  if (current !== null && typeof current === "object") {
    const last = segments[segments.length - 1];
    const container = current as Record<string, unknown>;
    if (Array.isArray(container) && /^\d+$/.test(last)) {
      container.splice(Number(last), 1);
    } else {
      delete container[last];
    }
  }
  return root;
}
