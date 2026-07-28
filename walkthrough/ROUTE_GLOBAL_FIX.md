# Admin `route()` Global — Root-Cause Fix

A runtime error broke every admin page that calls `route('employees.show', id)`:

```
show-DDDtjKd-.js:1
 Uncaught ReferenceError: route is not defined
    at c (show-DDDtjKd-.js:1:1120)
    at xo (wayfinder-3KuigA9A.js:96:47504)
    …
```

This walkthrough covers the cause, the fix, and the test coverage added so the
problem cannot recur.

---

## 1. Root cause

The project uses **Wayfinder** (`@laravel/vite-plugin-wayfinder`, configured in
`vite.config.ts`) as its typed route generator. Wayfinder writes one module
per resource under `resources/js/routes/{resource}/index.ts`, and exposes
callable functions like `employees.show(employee)` that produce URLs and
RouteDefinitions. Components import these directly:

```ts
import { dashboard } from '@/routes';
import * as employees from '@/routes/employees';
…
<Link href={employees.show(employee.id).url}>…</Link>
```

The admin pages, however, were written against the **Ziggy** convention:

```tsx
route('employees.show', employee.id)
```

There is **no Ziggy** in this project (`package.json`, `composer.json` both
clear), and no `route()` global is registered anywhere — neither in
`app.tsx`, nor in a custom plugin, nor on `window`. So every admin page that
called `route(...)` crashed at runtime the first time the function was
referenced. The error landed inside the Wayfinder-generated runtime because
the surrounding bundle pulls `route` from `globalThis`, but `globalThis.route`
was never assigned.

The pages still *compiled* — Vite does not type-check unused globals — and
the *server-side* response (the Inertia render) was a clean 200, so the bug
only surfaced in the browser console after the page hydrated.

---

## 2. Fix

Added `resources/js/lib/route.ts`, a small shim that re-implements the
Laravel `route()` helper on top of Wayfinder and registers it as a global.
Two integration points:

1. `resources/js/lib/route.ts` — the shim itself. Reads the
   resource-scoped Wayfinder modules (`@/routes/employees`, etc.) and the
   root-level routes (`@/routes`). Exposes a single `route(name, ...params)`
   function.
2. `resources/js/app.tsx` — imports the shim and assigns it to
   `globalThis.route` once during app bootstrap, so every page can call
   `route(...)` without an import.

### 2.1 Shape adaptations

The shim handles two mismatches between the codebase's existing call shape
and Wayfinder's API:

- **Callable returns RouteDefinition, not URL string.**
  `employees.index()` returns `{ url: '/employees', method: 'get' }`, not a
  string. The shim drills into `.url` before returning.

- **Pages pass a flat query bag.**
  `route('employees.index', { page: 2 })` was the established convention, but
  Wayfinder expects `RouteQueryOptions` (`{ query: {...} }` or `{ mergeQuery:
  {...} }`). The shim auto-wraps a flat plain object into `{ query: object }`
  when the resolved route has no `{placeholder}` bindings (i.e. is an
  `index/create/store` action that doesn't take a model id). Routes with
  bindings (`show/edit/update/destroy`) keep their first-arg semantics — a
  number, a `{ id }` object, or an array — so model-bound navigation
  continues to work unchanged.

### 2.2 Why a shim instead of rewriting every page

Forty-plus call sites across `resources/js/pages/{employees,users,roles,
permissions}/*.tsx` and the index/header/sidebar components use
`route(...)`. A blanket rewrite to Wayfinder's typed functions would touch
all of them and reintroduce a `RouteDefinition`-vs-string-URL mismatch every
time someone needs a string (e.g. for `<Link href={…}>`). The shim adds
about 90 lines of code, keeps every call site untouched, and is locally
exercised by the smoke test below.

---

## 3. Files touched

| File | Change |
|---|---|
| `resources/js/lib/route.ts` | **new** — the shim |
| `resources/js/app.tsx` | imports the shim and assigns it to `globalThis.route` |

No page or controller was modified. The four controllers and twelve pages
from the prior session continue to work because their `route(...)` calls
now resolve through the shim.

---

## 4. Verification

### 4.1 Build

`npm run build` completes cleanly and emits a hashed `app-*.js` bundle that
contains the global assignment:

```
$ grep -o 'globalThis\.[a-zA-Z_$]*=[a-zA-Z_$.]*' public/build/assets/app-*.js
globalThis.route=W
```

### 4.2 Helper smoke test (32 cases)

`npx tsx -e '…'` against the helper directly — every route name the
codebase uses, plus negative cases and shape variations:

```
…
  OK  employees.show        -> /employees/1
  OK  employees.edit         -> /employees/1/edit
  OK  employees.update       -> /employees/1
  OK  employees.destroy      -> /employees/1
  OK  users.show             -> /users/1
  OK  employees.show({id:7}) -> /employees/7
  OK  employees.index({search:foo}) -> /employees?search=foo
  OK  unknown-name (throws as expected)

=== RESULT ===
Pass: 32
Fail: 0
```

### 4.3 Server-side route check

`GET /employees/1`, `/employees/1/edit`, `/users/1`, `/users/1/edit`,
`/roles/1`, `/permissions/1` all return 200 against an authenticated admin
session — unchanged from the prior session's matrix.

### 4.4 Manual browser confirmation

Open `/employees/1` as `rdwij@hotmail.com`. The page renders without the
`route is not defined` error, the Edit/Delete buttons work, and the
breadcrumbs/links resolve to the correct URLs. Same for the show/edit
pages of every resource.

---

## 5. Follow-up suggestions (out of scope)

- **Long term**, migrate the admin pages from the Ziggy-style `route()`
  helper to direct Wayfinder imports (`employees.show(user.id).url`). This
  gives full compile-time safety and removes the need for the shim. Each
  page already uses Wayfinder's exact URL templates, so the migration is
  mechanical.
- **Add a unit test** for `resources/js/lib/route.ts` next to other frontend
  tests (Vitest) so the shape-adaptation rules are guarded against
  regressions.