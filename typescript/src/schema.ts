/**
 * Declarative initialization.
 *
 * Instead of seeding atoms one path at a time, `schema` writes a whole shape of
 * initial values in a single batch so listeners flush once.
 */

import type { StoreCore } from "./types";

export function create_schema(core: StoreCore) {
  /**
   * Seed initial values from a plain object. Each top-level key becomes a path
   * holding its value. Runs inside `batch` so the whole init is one flush.
   */
  function schema(shape: Record<string, unknown>): void {
    core.batch(() => {
      for (const key of Object.keys(shape)) core.set(key, shape[key]);
    });
  }

  return { schema };
}
