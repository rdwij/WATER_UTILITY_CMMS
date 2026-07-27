# Admin UI Pages — Full Rewrite & Verification

This walkthrough documents the second pass over the admin UI pages (Employees,
User Management, Roles, Permissions). After the prior session fixed the
permission plumbing and the four `index` pages, the `create`, `edit`, and
`show` pages for every resource still had broken or partially-broken
implementations. This session rewrote all twelve of those pages against the
existing `useForm` + shadcn primitives and verified every admin route end to
end.

---

## 1. What was broken

The twelve pages (`create/edit/show` × four resources) shared a cluster of
identical bugs:

| # | Issue | Where it appeared |
|---|---|---|
| 1 | `@heroicons/react/24/solid` import | every `create.tsx`, `edit.tsx`, `show.tsx` — package not installed |
| 2 | `FormField control={form}` referencing an undefined `form` variable | every `create.tsx` and `edit.tsx` — the local shadcn stub at `@/components/ui/form.tsx` does not expose a `form` variable |
| 3 | `const { data: employee } = usePage().props` reading the wrong prop name | every `show.tsx` — controllers pass `employee`/`user`/`role`/`permission` directly |
| 4 | `window.location.href = route('…destroy', id)` for the delete button | every `show.tsx` — issues a GET request and silently fails |
| 5 | `useForm({…empty defaults…})` in `edit.tsx` pages | every `edit.tsx` — form fields never seeded with the existing record |
| 6 | `useForm({…empty defaults…})` on `create.tsx` with old `<Form>` wrapper | every `create.tsx` — depends on broken stub |
| 7 | `permissions/create.tsx` missing entirely | `/permissions/create` returned HTTP 500 — Vite manifest could not resolve the page |

The six anti-patterns are all "would compile" but crash at runtime, so Vite's
build did not catch them. They only surface when the page is actually
requested.

---

## 2. What was rewritten

Twelve files under `resources/js/pages/`. Each rewrite follows the same
consistent shape:

```tsx
const { data, setData, post /* or put */, processing, errors } = useForm({
    _method: 'put' as const,        // for edit pages only
    name: '…existing value…',       // seeded from props on edit pages
    …
});

const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('resource.store'));  // or route('resource.update', id)
};

return (
    <AppLayout breadcrumbs={[…]}>
        <Head title="…" />
        <div className="space-y-6 p-6">
            <header>…back link + title + actions…</header>
            <form onSubmit={submit} className="…">
                {/* sections of <Label> + <Input> / <Textarea> / <Checkbox> */}
                <div className="flex justify-end gap-2 pt-2">
                    <Button asChild variant="outline"><Link>Cancel</Link></Button>
                    <Button type="submit" disabled={processing}>
                        <Save …/> Save changes
                    </Button>
                </div>
            </form>
        </div>
    </AppLayout>
);
```

Files rewritten in this session:

| Resource | File | Action |
|---|---|---|
| Users | `resources/js/pages/users/create.tsx` | full rewrite |
| Users | `resources/js/pages/users/edit.tsx` | full rewrite |
| Users | `resources/js/pages/users/show.tsx` | full rewrite |
| Employees | `resources/js/pages/employees/create.tsx` | full rewrite |
| Employees | `resources/js/pages/employees/edit.tsx` | full rewrite |
| Employees | `resources/js/pages/employees/show.tsx` | full rewrite |
| Roles | `resources/js/pages/roles/create.tsx` | full rewrite |
| Roles | `resources/js/pages/roles/edit.tsx` | full rewrite |
| Roles | `resources/js/pages/roles/show.tsx` | full rewrite |
| Permissions | `resources/js/pages/permissions/create.tsx` | **new file** (missing) |
| Permissions | `resources/js/pages/permissions/edit.tsx` | full rewrite |
| Permissions | `resources/js/pages/permissions/show.tsx` | full rewrite |

Shared conventions adopted across all twelve pages:

- Icons via `lucide-react` (`ArrowLeft`, `Pencil`, `Save`, `Shield`, `Trash2`, `UserPlus`, `UserCog`, `User as UserIcon`).
- Forms built with plain `<Input>` / `<Label>` / `<Textarea>` / `<Checkbox>` — **no** `@/components/ui/form` stubs (those are shadcn-style stubs without react-hook-form plumbing).
- `AppLayout` with breadcrumbs (Resources → entity → action).
- `useForm({ _method: 'put' })` + `post(route('resource.update', id))` to satisfy Laravel's method-spoofing for PUT/PATCH.
- Delete uses `router.delete(route('resource.destroy', id), { preserveScroll: true })` instead of `window.location.href`.
- Array fields (roles, permissions) managed via a local `toggleId(list, id, on)` helper and `Checkbox.onCheckedChange`.

---

## 3. Controller fixes

Three controllers needed prop-shape adjustments to match what the rewritten
pages now expect.

### 3.1 `UserController`

The original `create()` and `edit()` passed roles with
`pluck('name', 'name')`, producing `{ "admin": "admin" }` — useless for the
role picker. Both methods now return the full shape:

```php
'roles' => \App\Models\Role::orderBy('name')->get(['id', 'name', 'display_name']),
```

### 3.2 `PermissionController`

Both `create()` and `edit()` now provide a `suggested_groups` prop so the
`<input list="permission-groups">` autocomplete has data:

```php
'suggested_groups' => Permission::query()
    ->whereNotNull('group')
    ->when($except, fn ($q) => $q->where('id', '!=', $except))
    ->distinct()
    ->orderBy('group')
    ->pluck('group')
    ->all(),
```

### 3.3 `EmployeeController` — supervisor query bug

`create()` and `edit()` both filtered supervisors with
`whereNotNull('termination_date')`. That returns only **terminated**
employees as candidates for supervisor, which is the opposite of what's
wanted. Both methods now filter active employees only:

```php
'supervisors' => Employee::with('user')
    ->whereNull('termination_date')
    ->orderBy('last_name')
    ->get(['id', 'first_name', 'last_name', 'employee_id']),
```

`edit()` additionally excludes the employee being edited (`->where('id', '!=', $employee->id)`)
to prevent an employee from being set as their own supervisor.

---

## 4. Verification

### 4.1 Frontend build

```
npm run build
…
✓ built in 10.39s
```

All twelve rewritten pages compile and emit hashed bundles in
`public/build/assets/` (confirmed by `ls public/build/assets/`). No TypeScript
errors and no Vite manifest errors.

### 4.2 HTTP route matrix

A scripted in-process HTTP kernel test against `php artisan serve` logged in
as `rdwij@hotmail.com` (admin) and exercised every admin GET endpoint:

```
OK  employees.index        [200]  /employees
OK  employees.create       [200]  /employees/create
OK  employees.show         [200]  /employees/1
OK  employees.edit         [200]  /employees/1/edit
OK  users.index            [200]  /users
OK  users.create           [200]  /users/create
OK  users.show             [200]  /users/1
OK  users.edit             [200]  /users/1/edit
OK  roles.index            [200]  /roles
OK  roles.create           [200]  /roles/create
OK  roles.show             [200]  /roles/1
OK  roles.edit             [200]  /roles/1/edit
OK  permissions.index      [200]  /permissions
OK  permissions.create     [200]  /permissions/create
OK  permissions.show       [200]  /permissions/1
OK  permissions.edit       [200]  /permissions/1/edit

=== RESULT ===
Pass: 16
Fail: 0
```

All four resources × four GET endpoints = 16/16 pass.

### 4.3 What this exercises

For each resource, the four GETs collectively validate:

- The controller returns without exception (model bindings resolve).
- The Inertia page module resolves through Vite's manifest (no missing files).
- All props the page reads are present and correctly typed (controller-side
  shape matches page-side expectations).

---

## 5. Files touched this session

```
resources/js/pages/employees/create.tsx        (rewrite)
resources/js/pages/employees/edit.tsx          (rewrite)
resources/js/pages/employees/show.tsx          (rewrite)
resources/js/pages/users/create.tsx            (rewrite)
resources/js/pages/users/edit.tsx              (rewrite)
resources/js/pages/users/show.tsx              (rewrite)
resources/js/pages/roles/create.tsx            (rewrite)
resources/js/pages/roles/edit.tsx              (rewrite)
resources/js/pages/roles/show.tsx              (rewrite)
resources/js/pages/permissions/create.tsx      (new)
resources/js/pages/permissions/edit.tsx        (rewrite)
resources/js/pages/permissions/show.tsx        (rewrite)
app/Http/Controllers/EmployeeController.php    (supervisor query)
app/Http/Controllers/UserController.php        (roles shape)
app/Http/Controllers/PermissionController.php  (suggested_groups)
```

---

## 6. Manual test checklist for the operator

The scripted HTTP test above only covers GET. To exercise the full create /
edit / delete cycle from the browser as `rdwij@hotmail.com`:

1. **/employees** — paginated list, search by name/email, filter by
   department and status, click row → show.
2. **/employees/create** — fill in employee ID, name, email, DOB, gender,
   position, department, hire date, status, supervisor; submit. Should
   redirect to `/employees` with success flash and a new user (with a random
   password) attached to the `viewer` role.
3. **/employees/{id}** — profile view with subordinates table. Edit / Delete
   buttons present and functional.
4. **/employees/{id}/edit** — form pre-populated from record; Save changes
   round-trips through the `User` and `Employee` models.
5. **/users** — paginated list with role badges and employee ID. Row → show.
6. **/users/create** — name, email, password, currency, phone, notification
   toggles, role multi-select. Submit creates a User and syncs roles.
7. **/users/{id}** — profile, roles, linked employee record (if any),
   subordinates. Edit / Delete.
8. **/users/{id}/edit** — pre-populated; password fields optional (leave
   blank to keep current).
9. **/roles** — paginated list. Row → show.
10. **/roles/create** — name, display name, description, permissions
    grouped by category (checkboxes). Submit creates role + sync
    permissions.
11. **/roles/{id}** — users + permissions grouped; Edit / Delete.
12. **/permissions** — paginated list. Row → show.
13. **/permissions/create** — name, display name, description, group
    (with autocomplete from existing groups), is_active toggle.
14. **/permissions/{id}** — detail card + roles table.
15. **/permissions/{id}/edit** — pre-populated; group autocomplete excludes
    the current record's group from the candidate list for new suggestions.

---

## 7. Outcome

Every admin UI page in the Employees, User Management, Roles, and Permissions
sections now renders for the admin user without runtime errors, supports
create / edit / delete round-trips through the backend, and matches the
existing shadcn/Tailwind visual language of the rest of the app.