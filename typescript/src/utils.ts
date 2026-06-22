/**
 * Shared, dependency-free utilities.
 *
 * These are pure functions used across modules (dirty detection, cloning,
 * change-set computation). Keeping them here avoids re-implementing the same
 * logic in the resource, collection, and history layers (DRY).
 */

/** True for plain objects (not arrays, not null, not class instances we care about). */
export function is_plain_object(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Deep structural equality. Handles primitives, arrays, plain objects, Date,
 * and NaN. Falls back to reference equality for exotic objects.
 */
export function deep_equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  // NaN
  if (typeof a === "number" && typeof b === "number") {
    return Number.isNaN(a) && Number.isNaN(b);
  }
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    return false;
  }
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();

  const a_is_arr = Array.isArray(a);
  const b_is_arr = Array.isArray(b);
  if (a_is_arr !== b_is_arr) return false;

  if (a_is_arr && b_is_arr) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deep_equal(a[i], b[i])) return false;
    }
    return true;
  }

  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const a_keys = Object.keys(ao);
  const b_keys = Object.keys(bo);
  if (a_keys.length !== b_keys.length) return false;
  for (const key of a_keys) {
    if (!Object.prototype.hasOwnProperty.call(bo, key)) return false;
    if (!deep_equal(ao[key], bo[key])) return false;
  }
  return true;
}

/**
 * Deep clone. Uses the platform `structuredClone` when available, otherwise a
 * JSON-safe fallback for plain data.
 */
export function structured_clone<T>(value: T): T {
  const sc = (globalThis as { structuredClone?: <V>(v: V) => V }).structuredClone;
  if (typeof sc === "function") {
    try {
      return sc(value);
    } catch {
      /* fall through to manual clone for non-cloneable values */
    }
  }
  return manual_clone(value);
}

function manual_clone<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return new Date(value.getTime()) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => manual_clone(v)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>)) {
    out[key] = manual_clone((value as Record<string, unknown>)[key]);
  }
  return out as T;
}

/**
 * Compute the minimal patch of keys where `draft` differs from `data`
 * (shallow, top-level — the unit servers usually PATCH by). Keys present in
 * `draft` but not `data`, or with changed values, are included.
 */
export function diff_changes<T extends Record<string, unknown>>(
  data: T | undefined | null,
  draft: T | undefined | null,
): Partial<T> {
  const changed: Record<string, unknown> = {};
  const base = (data ?? {}) as Record<string, unknown>;
  const next = (draft ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(next)) {
    if (!deep_equal(base[key], next[key])) changed[key] = next[key];
  }
  return changed as Partial<T>;
}
