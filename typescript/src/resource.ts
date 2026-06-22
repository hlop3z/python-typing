/**
 * Resource layer: server-backed values with draft / dirty / save semantics.
 *
 * A resource lives under a base `path` and stores its sub-state at child paths
 * through {@link StoreCore}, so every piece is reactive and path-addressable:
 *
 * - `<path>.data`    — canonical, last-saved server state
 * - `<path>.draft`   — currently editable copy
 * - `<path>.changed` — minimal patch (`draft` vs `data`)
 * - `<path>.dirty`   — `true` when `draft` differs from `data`
 * - `<path>.loading` — `true` during `load()`
 * - `<path>.saving`  — `true` during `save()`
 * - `<path>.error`   — last load/save error, or `null`
 *
 * See spec sections 6–9. Change tracking uses `diff_changes`, dirty detection
 * uses `deep_equal`, and undo is backed by a per-resource draft history.
 */

import type { ResourceConfig, StoreCore } from "./types";
import { deep_equal, diff_changes, structured_clone } from "./utils";

export function create_resources(core: StoreCore) {
  /** Registered resource configs, keyed by base path. */
  const configs = new Map<string, ResourceConfig>();

  /** Per-resource draft history (oldest → newest), used by `undo`. */
  const history = new Map<string, unknown[]>();

  /**
   * When true, the draft subscriber recomputes `changed`/`dirty` but does NOT
   * record the new draft in history. Set while `undo` navigates existing
   * history, so stepping back doesn't re-push the state we just restored
   * (which would otherwise pin `undo` to a single step).
   */
  let suppress_history = false;

  /** Coerce a stored value into a plain record for diffing. */
  function as_record(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  /**
   * Recompute `<path>.changed` and `<path>.dirty` from the current `data`/`draft`.
   * Both writes target sibling paths of `.draft`, so this never retriggers the
   * draft subscriber (which listens only on `<path>.draft`).
   */
  function recompute(path: string): void {
    const data = core.get(`${path}.data`);
    const draft = core.get(`${path}.draft`);
    core.batch(() => {
      core.set(`${path}.changed`, diff_changes(as_record(data), as_record(draft)));
      core.set(`${path}.dirty`, !deep_equal(data, draft));
    });
  }

  /**
   * Find the registered resource owning `path` — the longest registered base
   * that is a prefix of `path` (or `path` itself).
   */
  function owner_of(path: string): string | undefined {
    let best: string | undefined;
    for (const base of configs.keys()) {
      const is_match = path === base || path.startsWith(`${base}.`);
      if (is_match && (best === undefined || base.length > best.length)) {
        best = base;
      }
    }
    return best;
  }

  return {
    /**
     * Register a resource under `path` and seed its sub-state.
     *
     * Subscribes to `<path>.draft` so any edit recomputes `<path>.changed` /
     * `<path>.dirty` and records a clone of the new draft in the undo history.
     * @param path Base path the resource lives under.
     * @param config Load/save configuration for the resource.
     */
    resource(path: string, config: ResourceConfig): void {
      configs.set(path, config);

      core.batch(() => {
        const data = core.get(`${path}.data`) ?? null;
        const has_draft = core.get(`${path}.draft`) !== undefined;
        const draft = has_draft
          ? core.get(`${path}.draft`)
          : structured_clone(as_record(data));
        core.set(`${path}.data`, data);
        core.set(`${path}.draft`, draft);
        core.set(`${path}.changed`, {});
        core.set(`${path}.loading`, false);
        core.set(`${path}.saving`, false);
        core.set(`${path}.error`, null);
        core.set(`${path}.dirty`, false);
      });

      // Seed history with the initial draft so `undo` always has a baseline.
      history.set(path, [structured_clone(core.get(`${path}.draft`))]);

      core.subscribe(`${path}.draft`, (draft) => {
        recompute(path);
        if (suppress_history) return;
        const stack = history.get(path);
        if (stack) stack.push(structured_clone(draft));
      });
    },

    /**
     * Run `config.load()` and reset both `data` and `draft` to the result.
     * Toggles `<path>.loading` and records load errors under `<path>.error`.
     * @param path Base path of a registered resource.
     */
    async refresh(path: string): Promise<void> {
      const config = configs.get(path);
      if (!config) throw new Error(`No resource registered at "${path}".`);

      core.batch(() => {
        core.set(`${path}.loading`, true);
        core.set(`${path}.error`, null);
      });

      try {
        const result = await config.load();
        core.batch(() => {
          core.set(`${path}.data`, structured_clone(result));
          core.set(`${path}.draft`, structured_clone(result));
        });
        recompute(path);
        // Loading establishes a fresh clean baseline for undo.
        history.set(path, [structured_clone(core.get(`${path}.draft`))]);
      } catch (error) {
        core.set(`${path}.error`, error);
      } finally {
        core.set(`${path}.loading`, false);
      }
    },

    /**
     * Persist the minimal change set via `config.save(changed)`. On success the
     * draft becomes the new canonical `data` (so the resource turns clean).
     * @param path Base path of a registered resource.
     */
    async save(path: string): Promise<void> {
      const config = configs.get(path);
      if (!config) throw new Error(`No resource registered at "${path}".`);
      if (!config.save) {
        throw new Error(`Resource "${path}" has no save() configured.`);
      }

      core.batch(() => {
        core.set(`${path}.saving`, true);
        core.set(`${path}.error`, null);
      });

      try {
        await config.save(core.get(`${path}.changed`) as Partial<unknown>);
        core.set(`${path}.data`, structured_clone(core.get(`${path}.draft`)));
        recompute(path);
      } catch (error) {
        core.set(`${path}.error`, error);
      } finally {
        core.set(`${path}.saving`, false);
      }
    },

    /**
     * Discard edits: `draft ← data`. The draft subscriber recomputes
     * `changed` / `dirty` and records the reverted draft in history.
     * @param path Base path of a registered resource.
     */
    revert(path: string): void {
      core.set(`${path}.draft`, structured_clone(core.get(`${path}.data`)));
    },

    /**
     * Step the draft back one entry in its history: `draft ← previous draft`.
     * No-op when there is nothing earlier to restore.
     * @param path Base path of a registered resource.
     */
    undo(path: string): void {
      const stack = history.get(path);
      if (!stack || stack.length < 2) return;
      // Drop the current draft; the new top becomes the state we restore to,
      // keeping the invariant "stack top === current draft".
      stack.pop();
      const previous = stack[stack.length - 1];
      suppress_history = true;
      try {
        core.set(`${path}.draft`, structured_clone(previous));
      } finally {
        suppress_history = false;
      }
    },

    /**
     * Dirty check at two granularities:
     * - resource base (`"profile"`) → that resource's `dirty` flag.
     * - field (`"profile.first_name"`) → whether that field differs between
     *   `data` and `draft` of its owning resource.
     * @param path Resource base path or `<resource>.<field>` path.
     */
    is_dirty(path: string): boolean {
      if (configs.has(path)) {
        return Boolean(core.get(`${path}.dirty`));
      }
      const base = owner_of(path);
      if (base === undefined) return false;
      const field = path.slice(base.length + 1);
      const in_data = core.get(`${base}.data.${field}`);
      const in_draft = core.get(`${base}.draft.${field}`);
      return !deep_equal(in_data, in_draft);
    },
  };
}
