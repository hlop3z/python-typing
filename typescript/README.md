# nanostore

A path-based reactive store. Every value is addressed by a **path** instead of a
hand-written API, and server-backed values are modeled as **resources** with
built-in draft / dirty / save semantics.

```ts
import { create_store } from "nanostore";

const store = create_store({ users: [], user: {} });

store.push("users", { id: 1, name: "Ada" });
store.set("user.first_name", "john");
store.set("user.last_name", "doe");

store.compute(
  "user.full_name",
  ["user.first_name", "user.last_name"],
  (first, last) => `${first} ${last}`,
);

store.get("user.full_name"); // "john doe"
```

Same verbs everywhere — nothing new to remember per store. See
[`nanostore.md`](./nanostore.md) for the full design spec.

---

## Why

With per-store custom APIs, every store invents its own verbs (`add_user`,
`remove_user`, `update_user`, `clear_users`, …). nanostore exposes **one uniform,
path-addressed API**: read, write, react, and collection helpers that work
against any path in the tree.

---

## Install

```bash
npm install nanostore
```

```ts
import { create_store } from "nanostore";
// or: import create_store from "nanostore";
```

### In the browser (no bundler)

Drop the IIFE build in with a `<script>` tag — it exposes a global `nanostore`:

```html
<script src="https://unpkg.com/nanostore/dist/index.global.js"></script>
<script>
  const store = nanostore.create_store({ count: 0 });
  store.subscribe("count", (n) => console.log("count:", n));
  store.set("count", 1);
</script>
```

Or self-host `dist/index.global.js` (minified, ~7 KB).

---

## Core concepts

| Concept      | Description                                                         |
| ------------ | ------------------------------------------------------------------- |
| **Path**     | A dot-delimited string addressing a node, e.g. `"user.first_name"`. |
| **Atom**     | A leaf value stored at a path.                                      |
| **Computed** | A derived value recomputed when its dependency paths change.        |
| **Resource** | A server-backed value with `data` / `draft` / status lifecycle.     |
| **Handle**   | An object bound to one path (`store.path(...)`) exposing the API.   |

Numeric path segments index arrays (`"users.0.name"`). A change to a path also
notifies its ancestors and descendants, so subscribing to `"user"` reacts to
`"user.first_name"` edits and vice-versa.

---

## API

Create a store, optionally seeded with initial top-level values:

```ts
const store = create_store({ users: [], settings: {}, auth: null });
```

### Read / write

```ts
store.get(path); // read
store.set(path, value); // write
store.update(path, (current) => next); // functional update
store.delete(path); // remove
```

### React

```ts
const off = store.subscribe(path, (value) => {
  /* ... */
}); // returns unsubscribe

store.compute(path, deps, (...values) => derived); // keep a derived path in sync
const stop = store.effect(deps, (...values) => {
  /* side effect */
});
```

`compute` and `effect` run once immediately, then re-run whenever any dependency
changes.

### Collections

Array helpers that always produce a new array (a missing/non-array value is
treated as `[]`):

```ts
store.push(path, value); // append
store.remove(path, (item) => bool); // drop items where predicate is true
store.map(path, (item) => next); // transform each item
store.clear(path); // set to []
```

### Lifecycle

```ts
store.batch(() => {
  /* many writes */
}); // coalesce notifications into one flush
store.snapshot(); // capture current state
store.undo(); // global undo
store.redo(); // global redo
```

User-facing mutations (`set` / `update` / `delete` and the collection verbs) are
undoable. Derived and internal writes (computed outputs, resource status flags)
are not recorded, so undo steps through _intentful_ edits rather than
bookkeeping.

---

## Declarative initialization

Declare a schema with initial values instead of seeding one path at a time
(written in a single batch):

```ts
store.schema({
  users: [],
  settings: {},
  auth: null,
});
```

---

## Path handles

Bind a path to an object so you don't repeat the string:

```ts
const users = store.path("users");

users.get();
users.push(user);
users.subscribe(console.log);
```

`compute` accepts handles as dependencies and returns a handle:

```ts
const first = store.path("user.first_name");
const last = store.path("user.last_name");

const full_name = store.compute([first, last], (f, l) => `${f} ${l}`);
full_name.get();
```

---

## Resources

A value fetched from the server has three logical versions: canonical server
state (`data`), the editing copy (`draft`), and the change set between them
(`changed`). Declare a resource instead of a plain value:

```ts
store.resource("profile", {
  load: () => api.users.me(),
  save: (changes) => api.patch_user(changes),
});
```

A resource exposes these reactive, path-addressable fields:

| Field     | Meaning                                            |
| --------- | -------------------------------------------------- |
| `data`    | Canonical, last-saved server state.                |
| `draft`   | Currently editable copy.                           |
| `changed` | Patch of fields where `draft` differs from `data`. |
| `dirty`   | `true` when `draft` differs from `data`.           |
| `loading` | `true` during `load()`.                            |
| `saving`  | `true` during `save()`.                            |
| `error`   | Last load/save error, or `null`.                   |

### Lifecycle

```ts
await store.refresh("profile"); // run load(); data ← draft ← server
store.set("profile.draft.first_name", "Alice"); // edit → dirty/changed update
await store.save("profile"); // save(changed); data ← draft
store.revert("profile"); // draft ← data, discard edits
store.undo("profile"); // draft ← previous draft
```

```ts
await store.refresh("profile");
store.get("profile.data"); // { first_name: "John", last_name: "Doe" }
store.get("profile.dirty"); // false

store.set("profile.draft.first_name", "Alice");
store.get("profile.dirty"); // true
store.get("profile.changed"); // { first_name: "Alice" }  ← minimal patch
```

> `save` sends `profile.changed` (a minimal patch), not the whole draft.

### Field-level dirty state

`is_dirty` works at resource and field granularity — handy in forms:

```ts
store.is_dirty("profile"); // resource-level
store.is_dirty("profile.first_name"); // field-level
```

```tsx
<input value={store.get("profile.draft.first_name")} />;
{
  store.is_dirty("profile.first_name") && <small>Modified</small>;
}
<button disabled={!store.get("profile.dirty")}>Save</button>;
```

---

## Architecture

The library is split into focused modules with a shared foundation, so each
piece is independently testable and the public API is just composition.

| Module           | Responsibility                                                   |
| ---------------- | ---------------------------------------------------------------- |
| `types.ts`       | Shared types — `Path`, `StoreCore`, `ResourceConfig`, …          |
| `utils.ts`       | Pure helpers — `deep_equal`, `structured_clone`, `diff_changes`. |
| `path.ts`        | Dot-path resolution — `get_in` / `set_in` / `delete_in`.         |
| `core.ts`        | Reactive engine — state + subscription registry + batching.      |
| `reactive.ts`    | `compute` / `effect`.                                            |
| `collections.ts` | `push` / `remove` / `map` / `clear`.                             |
| `history.ts`     | Global `undo` / `redo` (decorates the core).                     |
| `resource.ts`    | Resource layer — `data` / `draft` / `changed` / status flags.    |
| `schema.ts`      | Declarative initialization.                                      |
| `handle.ts`      | Path handles.                                                    |
| `__init__.ts`    | Public entry — composes everything into `create_store`.          |

Composition wires two cores: a `base` reactive engine and a `tracked` core that
decorates `base` with undo/redo capture. User mutations flow through `tracked`;
derived and internal writes use `base`. All subscriptions live on the shared
`base` registry, so everything reacts uniformly regardless of which core wrote.

---

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit (strict)
npm run build       # emit ESM + CJS + IIFE + .d.ts to dist/
```

Built with [tsup](https://tsup.egoist.dev/); type-checked with TypeScript in
strict mode.
