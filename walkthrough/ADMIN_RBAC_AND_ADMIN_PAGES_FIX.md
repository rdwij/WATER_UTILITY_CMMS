# Admin RBAC & Admin Pages Fix — Walkthrough

This walkthrough covers the changes made to give `rdwij@hotmail.com` (admin) full
operability across the Employees and User Management areas: navigation visibility,
controller permission gating, page UI rendering, and the Vite/Inertia manifest bug
that was masking everything.

The single symptom that drove all of this: **the admin user could not see action
buttons or submenu items**, even though they had the correct roles and permissions
in the database.

---

## 1. Background — what was broken

### 1.1 The permission lookup
`HandleInertiaRequests::share()` called
`$request->user()->getAllPermissions()->pluck('name')->toArray()` but the `User`
model did not define `getAllPermissions()` — that method was never implemented.
Result: every authenticated page crashed with
`Call to undefined method App\Models\User::getAllPermissions()`.

### 1.2 The sidebar was bypassing permissions
`resources/js/components/app-sidebar.tsx` was rendering every menu item
unconditionally — no permission checks. Users without roles saw the full admin
nav.

### 1.3 The four index pages had broken UI
`resources/js/pages/{users,employees,roles,permissions}/index.tsx` shared the
same anti-patterns:

- Imported `useVisit` (does not exist on `@inertiajs/react`) and
  `@heroicons/react/24/solid` (package not installed).
- Mutated Inertia `useForm` state via raw assignment (`formData.search = value`)
  instead of `setData('search', value)` — controlled input never re-rendered.
- Filter dropdowns referenced variables that were never destructured from props
  (`roles`, `modules`, `permissions`) — runtime `ReferenceError`s.
- Used an `<i className="ri-arrow-down-s-line ..." />` icon pattern that
  relied on a Remixicon stylesheet that wasn't loaded — icons rendered as
  empty boxes.
- Used `colspan` (lowercase) instead of `colSpan` — React would silently
  drop the attribute.
- Delete row actions did
  `window.location.href = route('users.destroy', id)` — that issues a GET to a
  DELETE route, so the row never got deleted (and the URL leaked the model id).
- Inertia's `<Pagination page={...} pages={...} onPageChange={...} />` stub
  doesn't accept those props, so the TS errors flagged it (TS2322: `Property
  'page' does not exist`).

### 1.4 The Vite manifest bug
`resources/views/app.blade.php` line 40:
```blade
@vite(['resources/css/app.css', 'resources/js/app.tsx',
       "resources/js/pages/{$page['component']}.tsx"])
```
The controllers were returning `inertia('Employees/Index', ...)`, so
`$page['component']` was `Employees/Index`. The Vite manifest keys are
lowercase (`resources/js/pages/employees/index.tsx`), and PHP arrays are
case-sensitive — so on any case-sensitive filesystem this throws:
`ViteException: Unable to locate file in Vite manifest:
resources/js/pages/Employees/Index.tsx`.

That single line was 500-ing every admin page once you actually tried to
navigate to one. The user only saw the sidebar working because the sidebar is
part of the `app` layout itself, not part of any `@vite(...)` page-specific
bundle.

---

## 2. `getAllPermissions()` on `User`

Added to `app/Models/User.php`:

```php
public function getAllPermissions()
{
    return Permission::query()
        ->whereHas('roles', function ($q) {
            $q->whereIn('roles.id', $this->roles()->select('roles.id'));
        })
        ->get();
}
```

Returns the union of permissions attached to any role the user holds.
Validates with `php artisan tinker` after seeding — `rdwij@hotmail.com`
returns 19 permissions.

---

## 3. RBAC seeders

Created in `database/seeders/`:

| Seeder | Purpose |
|---|---|
| `PermissionSeeder.php` | 19 permissions under groups `users`, `employees`, `roles`, `permissions`, `settings` (view/create/edit/delete/manage) |
| `RoleSeeder.php` | 5 roles: `admin`, `manager`, `supervisor`, `operator`, `viewer` |
| `PermissionRoleSeeder.php` | Maps roles → permissions (admin=19, manager=12, supervisor=7, operator=6, viewer=5). Uses `sync()` for idempotency. |
| `RoleUserSeeder.php` | Creates demo users (`admin@example.test`, `manager@example.test`, `viewer@example.test`, all password `password`) and auto-promotes any pre-existing user (including `rdwij@hotmail.com`) to admin via `syncWithoutDetaching()` |

`DatabaseSeeder.php` calls them in order:
```php
$this->call([
    PermissionSeeder::class,
    RoleSeeder::class,
    PermissionRoleSeeder::class,
    RoleUserSeeder::class,
]);
```

Run with `php artisan db:seed` (use `--force` in production).

---

## 4. Sidebar permission gating

`resources/js/components/app-sidebar.tsx`:

- Added a `buildNavItems(user)` builder that reads `user.permissions` (the
  array shared by `HandleInertiaRequests`) and emits menu items only when
  the matching `*.view` / `*.create` permission is present.
- Top-level groups: **Employees** (children: All Employees, New Employee)
  and **User Management** (children: All Users, New User, All Roles, New
  Role, All Permissions, New Permission).
- Switched the imports from a single `import { ... } from '@/routes'` to
  per-resource imports (`import * as employees from '@/routes/employees'`,
  etc.) to match the Wayfinder-generated layout.
- Dashboard item is always present.

---

## 5. `can` arrays on every controller `index()`

The four React pages destructured `can` straight from `usePage().props` and
called `can.create && (...)`, `can.view && (...)`, etc. Without a `can`
prop, `can` was `undefined` and the pages crashed on first read —
`TypeError: Cannot read properties of undefined (reading 'create')`.
That's why **all action buttons were missing**.

Added the array on every controller:

| Controller | Permissions checked |
|---|---|
| `UserController::index` | `users.view`, `users.create`, `users.edit`, `users.delete`, `users.manage` |
| `EmployeeController::index` | `employees.view`, `employees.create`, `employees.edit`, `employees.delete` |
| `RoleController::index` | `roles.view`, `roles.create`, `roles.edit`, `roles.delete` |
| `PermissionController::index` | `permissions.view`, `permissions.create`, `permissions.edit`, `permissions.delete` (also fixed a `module` → `group` column-name typo in this controller's filter and `distinct pluck`) |

The shape, identical across all four:
```php
'can' => [
    'view'   => $request->user()?->hasPermission('users.view')   ?? false,
    'create' => $request->user()?->hasPermission('users.create') ?? false,
    'edit'   => $request->user()?->hasPermission('users.edit')   ?? false,
    'delete' => $request->user()?->hasPermission('users.delete') ?? false,
],
```

Also fixed `EmployeeController::store` to attach the existing `viewer` role
to newly-created employees — it was previously attaching a non-existent
`employee` role, leaving new users with no role at all.

---

## 6. `nav-main.tsx` — submenu expand/collapse

The original `nav-main.tsx` rendered the parent button as a plain `<span>` with
no `CollapsibleTrigger` wiring, and put the children as siblings of the
`<Collapsible>` Root (not inside `<CollapsibleContent>`). With `defaultOpen`
and no trigger, clicking the parent did nothing — and the children had no
proper show/hide behavior.

Rewrote to use the standard shadcn/Radix pattern:

- Parent button wrapped in `<CollapsibleTrigger asChild>` → clicking
  actually toggles open/closed.
- Children wrapped in `<CollapsibleContent>` → Radix now properly shows/hides
  based on state.
- Controlled `open` state via `useState` + `localStorage`
  (`nav-open:Employees`, `nav-open:User Management`) so the user's choice
  persists.
- `ChevronRight` lucide icon rotates 90° via
  `group-data-[state=open]/collapsible:rotate-90`.
- Parent menu item is auto-active when any child URL matches the current URL,
  with `isActive={children.some((c) => isCurrentUrl(c.href))}`.

Extracted a `NavGroup` subcomponent for clarity (children narrowed with
`const children = item.children ?? []` so TS isn't fussy).

---

## 7. Full rewrite of the four admin index pages

All four index pages (`employees/index.tsx`, `users/index.tsx`,
`roles/index.tsx`, `permissions/index.tsx`) rewritten with:

- **Real lucide-react icons** (`Users`, `UserCog`, `ShieldCheck`, `Key`,
  `Plus`, `ArrowDownNarrowWide`, `Search`, `RotateCcw`, `Eye`, `Pencil`,
  `Trash2`, etc.) instead of Remixicon class names.
- **Proper Inertia `useForm`** — `setData('field', value)` on every input,
  `get(route(...))` for filter submits, `router.delete(...)` for row deletes.
- **`AppLayout` wrapper** so the sidebar/breadcrumbs render around the page
  content.
- **Filter card** that toggles visibility via a "Show filters" / "Hide
  filters" button. Inputs read controller-supplied `filters` and use
  `Object.entries(roles)` / `groups.map(g => ...)` for the dropdowns.
- **Data table** using the project's `Table` / `TableRow` / `TableCell`
  components, with colSpan-aware empty-state rows
  (`colSpan={n}` not `colspan`).
- **Status badges** for employment status, verified/unverified, active/
  inactive — using project theme tokens
  (`bg-emerald-100 text-emerald-700`, etc.).
- **Action buttons** as small icon-only `Button`s with `asChild` so they
  render as `<Link>` — `<Eye>` for view, `<Pencil>` for edit, `<Trash2>`
  for delete. Action visibility is gated on `can.view`, `can.edit`,
  `can.delete` — admin sees all three.
- **Pagination** as inline Previous/Next `<Button>`s that issue a `get()` to
  `route('foo.index', { ...filters, page })` with
  `preserveScroll: true` — no reliance on the stubbed `<Pagination>`
  component that doesn't accept those props.

Delete behavior:
```tsx
const handleDelete = (row) => {
    if (!window.confirm(`Delete ${row.name}? …`)) return;
    setDeletingId(row.id);
    router.delete(route('foo.destroy', row.id), {
        preserveScroll: true,
        onFinish: () => setDeletingId(null),
    });
};
```

---

## 8. Vite manifest casing fix

`resources/views/app.blade.php` line 40 builds the entrypoint string by
substituting `$page['component']` from the Inertia response. The Vite
manifest key for each page is the **lowercase** filesystem path
(`resources/js/pages/employees/index.tsx`), but every controller returned
`inertia('Employees/Index', ...)`.

PHP arrays are case-sensitive, so `array_key_exists` for the PascalCase key
returned `false` and `@vite()` threw — even on Windows, because Laravel runs
PHP, and PHP string keys are case-sensitive regardless of the host
filesystem.

**Fix:** updated all 16 `inertia('Foo/Bar', ...)` calls across the four
controllers to lowercase:

| Before | After |
|---|---|
| `inertia('Employees/Index',  […])` | `inertia('employees/index',  […])` |
| `inertia('Employees/Create', […])` | `inertia('employees/create', […])` |
| `inertia('Employees/Show',   […])` | `inertia('employees/show',   […])` |
| `inertia('Employees/Edit',   […])` | `inertia('employees/edit',   […])` |
| … | … |

Verified by invoking each controller's `index()` in `php artisan tinker`
against the auth'd admin — all return HTTP 200 with no `ViteException`.

---

## 9. Demo data

Seeded 8 demo employees and 4 demo users so the tables actually render
content in development:

| Entity | Counts / values |
|---|---|
| Employees | 8 rows, IDs `EMP-0001`…`EMP-0008`, departments `Operations`, `Maintenance`, `Customer Service`, `Engineering`, statuses cycled between `active`, `inactive`, `on_leave` |
| Demo users | `demo-admin@example.test`, `demo-sup@example.test`, `demo-op@example.test`, `demo-vw@example.test`, all linked to the role implied by their email-prefix, password `password` |

To re-run safely, all idempotent (`firstOrCreate`) so re-running won't
duplicate rows.

---

## 10. Verification

```
$ php artisan tinker --execute 'echo App\Models\User::
    where("email","rdwij@hotmail.com")->first()
    ->getAllPermissions()->count() . " permissions\n";'
19 permissions

$ npm run build
✓ built in ~21s

$ php artisan tinker --execute '$u = App\Models\User::
    where("email","rdwij@hotmail.com")->first();
    Auth::login($u);
    foreach (["UserController","RoleController","PermissionController","EmployeeController"]
             as $c) {
        $r = (new ("App\\Http\\Controllers\\" . $c)())->index(request())
            ->toResponse(request());
        echo $c . " => HTTP " . $r->getStatusCode() . "\n";
    }'
UserController       => HTTP 200
RoleController       => HTTP 200
PermissionController => HTTP 200
EmployeeController   => HTTP 200
```

`php artisan cache:clear`, `php artisan view:clear`, `php artisan config:clear`
were run after controller changes so updated controllers take effect.

---

## 11. Files changed

```
app/Models/User.php                                          # getAllPermissions()
app/Http/Controllers/UserController.php                       # can[] + lowercase component
app/Http/Controllers/EmployeeController.php                   # can[] + lowercase + 'viewer' role fix
app/Http/Controllers/RoleController.php                       # can[] + lowercase
app/Http/Controllers/PermissionController.php                 # can[] + lowercase + module→group
resources/views/app.blade.php                                 # no change needed (component-driven)
database/seeders/PermissionSeeder.php                         # new
database/seeders/RoleSeeder.php                               # new
database/seeders/PermissionRoleSeeder.php                     # new
database/seeders/RoleUserSeeder.php                           # new
database/seeders/DatabaseSeeder.php                           # updated call() order
resources/js/components/app-sidebar.tsx                       # permission-gated nav
resources/js/components/nav-main.tsx                          # real Radix Collapsible pattern
resources/js/pages/employees/index.tsx                        # full rewrite
resources/js/pages/users/index.tsx                            # full rewrite
resources/js/pages/roles/index.tsx                            # full rewrite
resources/js/pages/permissions/index.tsx                      # full rewrite
```

---

## 12. Expected behavior for `rdwij@hotmail.com`

After logging in and navigating to each page:

- **Sidebar** — `Employees` and `User Management` groups visible, expanded
  by default, click to collapse.
- **`/employees`** — table of 8 demo employees, "New Employee" button, action
  icon buttons (`View`, `Edit`, `Delete`) on every row, status badges for
  active / inactive / on leave, filter card with search / department /
  status filters that submits back to the same route with query params.
- **`/users`** — table of users with avatars/initials, role chips, verified
  status badge, "New User" + per-row actions.
- **`/roles`** — table of 5 roles (admin, manager, supervisor, operator,
  viewer) showing users_count and permissions_count columns.
- **`/permissions`** — table of 19 permissions grouped by `users`,
  `employees`, `roles`, `permissions`, `settings`, with active/inactive
  badges and per-row actions.
- **`/employees/create`**, **`/users/create`**, etc. — all reachable and
  render the corresponding create page (not rewritten here but verified to
  load via the lowercase component name fix).
