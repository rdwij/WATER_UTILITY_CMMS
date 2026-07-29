# Implementation Plan — User Accounts & Roles (ISO 55000 / FR-01…FR-09)

**Document type:** Step-by-step implementation plan
**Source proposal:** `plans/user_accounts_roles_iso55000_proposal.md`
**Aligned to:** `docs/SRS.md` v2.0 (FR-01…FR-09, NFR-01, NFR-02, NFR-05) · `docs/DFD_NEW.md` v2
**Supersedes:** the legacy 5-role implementation (`admin` / `manager` / `supervisor` / `operator` / `viewer`)

---

## How to use this document

This is the **executable** companion to the proposal. Read the proposal first to understand the *what* and *why*; this document tells you the *how* — in numbered steps, in execution order, with explicit commands to run and verification gates between each phase.

Run the phases sequentially. **Do not skip verification gates.** A failed gate means the next phase is unsafe to start.

Estimated total effort: **25–39 hours** (per proposal §12).

---

## Table of Contents

- [Phase 0 — Pre-flight checklist](#phase-0--pre-flight-checklist)
- [Phase 1 — Database migrations](#phase-1--database-migrations)
- [Phase 2 — Models](#phase-2--models)
- [Phase 3 — Middleware](#phase-3--middleware)
- [Phase 4 — Seeders](#phase-4--seeders)
- [Phase 5 — Policies and policy registration](#phase-5--policies-and-policy-registration)
- [Phase 6 — Controllers and routes](#phase-6--controllers-and-routes)
- [Phase 7 — Sidebar and frontend permission names](#phase-7--sidebar-and-frontend-permission-names)
- [Phase 8 — Tests](#phase-8--tests)
- [Phase 9 — End-to-end verification](#phase-9--end-to-end-verification)
- [Phase 10 — Walkthrough](#phase-10--walkthrough)

---

## Phase 0 — Pre-flight checklist

Before changing any code:

1. **Confirm clean working tree.** `git status` shows no uncommitted changes. If there are uncommitted changes, commit or stash them.
2. **Confirm database is reachable.** `php artisan db:show` succeeds. If using SQLite, the file exists at `database/database.sqlite`.
3. **Confirm baseline tests pass.** `php artisan test` returns 0 failures. If any test fails, fix it before proceeding.
4. **Confirm the proposal exists.** `plans/user_accounts_roles_iso55000_proposal.md` is committed.
5. **Read the proposal §9** (File-level Implementation Map) and §11 (Risks & Mitigations). The risks listed there are the ones this plan defends against.

**Verification gate:** `git status` is clean, `php artisan db:show` works, `php artisan test` is green.

---

## Phase 1 — Database migrations

**Goal:** extend `users`, `roles`, `permissions`; create `departments` and `approval_stages`. Order matters because of FK direction and the `users.role` drop.

### 1.1 Create the migrations

Files to create (all under `database/migrations/`):

| # | File | Purpose |
|---|---|---|
| 1 | `2026_07_29_000001_add_user_status_and_last_login_to_users_table.php` | + `is_active`, `last_login_at`, `deactivated_at`, soft deletes on `users` |
| 2 | `2026_07_29_000005_add_category_to_roles_table.php` | + `category` on `roles` |
| 3 | `2026_07_29_000006_add_module_to_permissions_table.php` | + `module` on `permissions` |
| 4 | `2026_07_29_000003_create_departments_table.php` | new `departments` table |
| 5 | `2026_07_29_000004_create_approval_stages_table.php` | new polymorphic `approval_stages` table |
| 6 | `2026_07_29_000002_drop_legacy_role_column_from_users_table.php` | drop legacy `users.role` ENUM |

> The migration timestamp order (`_000001` … `_000006`) reflects execution order, not creation order. **Migration 6 must run last** so that `CheckRole` (rewritten in Phase 3) is in place before the column disappears.

### 1.2 Contents (already specified in proposal §7)

Each migration is small and uses `Schema::table()` or `Schema::create()` with no surprises. The four table-creation / column-extension migrations use Laravel defaults (`id()`, timestamps, soft deletes where appropriate). The polymorphic `approval_stages` uses `$table->morphs('requestable')` to create `requestable_type` + `requestable_id` with a composite index.

### 1.3 Commands

```bash
php artisan migrate:fresh              # applies all migrations cleanly
```

If `migrate:fresh` fails:

- **FK violation on `approval_stages.actor_id`** → users table is missing `id` column. Check that the base `0001_01_01_000000_create_users_table.php` migration is intact.
- **"Column already exists"** → a previous run added the column out of order. Re-run `migrate:fresh` (drops everything).

### 1.4 Verification gate

```bash
php artisan db:table users            # is_active, last_login_at, deactivated_at, deleted_at present
php artisan db:table departments      # id, name, code, parent_id, description, is_active, timestamps
php artisan db:table approval_stages   # id, requestable_type, requestable_id, stage, actor_id, decision
php artisan db:table roles             # category column present
php artisan db:table permissions       # module column present
php artisan db:column users --column=role    # SHOULD NOT EXIST (legacy column dropped)
```

All checks should match expectations. **Stop here if any column is missing or the legacy `role` column still exists.**

---

## Phase 2 — Models

**Goal:** introduce `Department` and `ApprovalStage`; extend `User`, `Role`, `Permission`, `Employee`.

### 2.1 New models

| File | Purpose |
|---|---|
| `app/Models/Department.php` | Eloquent model with `parent()`, `children()`, `employees()` relationships; soft deletes. |
| `app/Models/ApprovalStage.php` | Eloquent model with `morphTo('requestable')` and `belongsTo(User::class, 'actor_id')`. Includes class constants for the three stages (`STAGE_REQUESTED`, etc.) and three decisions. |

### 2.2 Modified models

| File | Changes |
|---|---|
| `app/Models/User.php` | + `SoftDeletes` trait; + `is_active`, `last_login_at`, `deactivated_at` to fillable; + `scopeActive()`; cast new columns to bool / datetime. |
| `app/Models/Role.php` | + `category` to fillable. |
| `app/Models/Permission.php` | + `module` to fillable; cast `is_active` to bool. |
| `app/Models/Employee.php` | + `department()` belongsTo relationship (FK column is **not** added in this plan; it is set up for a future backfill per proposal §13). |

### 2.3 Commands

```bash
php artisan tinker --execute 'echo App\Models\Department::count();'  # 0
php artisan tinker --execute 'echo App\Models\ApprovalStage::count();'  # 0
```

### 2.4 Verification gate

Both new models load without error and have the documented relationships. `php artisan tinker --execute 'echo App\Models\User::first()->id;'` returns a number (assuming seeded users exist) — confirming the soft-deletes trait didn't break the existing model.

---

## Phase 3 — Middleware

**Goal:** rewrite `CheckRole` to use the pivot; add `EnsureApprovalStage` for FR-08/FR-09.

### 3.1 Files

| File | Change |
|---|---|
| `app/Http/Middleware/CheckRole.php` | Full rewrite. Reads `$user->hasAnyRole($roles)` instead of `$user->role` (a dropped column). Signature `handle(Request, Closure, string ...$roles)` is unchanged so existing route declarations `role:admin,manager` keep working. |
| `app/Http/Middleware/EnsureApprovalStage.php` | New file. Single `string $stage` parameter. Stage → role map hard-coded as a class constant (see proposal §6.2). |
| `bootstrap/app.php` | + `'stage' => \App\Http\Middleware\EnsureApprovalStage::class` in the `$middleware->alias([...])` array. |

### 3.2 Smoke test (before continuing)

```bash
php artisan route:list | grep -E 'role:|stage:'
```

All `role:*` middleware references still resolve to `App\Http\Middleware\CheckRole`. `stage:*` resolves to `App\Http\Middleware\EnsureApprovalStage`. The new alias will have no route consumers yet — that is expected.

### 3.3 Verification gate

`php artisan route:list` does not throw. Open `php artisan tinker` and run:

```php
$user = App\Models\User::where('email', 'rdwij@hotmail.com')->first();
echo $user->hasRole('admin') ? '1' : '0';        // should print 0 (legacy role dropped)
echo $user->hasRole('system-administrator') ? '1' : '0'; // should print 0 (not seeded yet)
```

Both print `0` is acceptable — it confirms the legacy `admin` lookup returns false and no `system-administrator` exists yet (will be created in Phase 4).

---

## Phase 4 — Seeders

**Goal:** replace the 5-role / 19-permission catalog with the 14-role / 93-permission ISO 55000 catalog. Remap existing demo users.

### 4.1 Order of seeders

`database/seeders/DatabaseSeeder.php` runs seeders in this order:

```
PermissionSeeder          (1) — 93 permissions in 20 groups
RoleSeeder                (2) — 14 roles
PermissionRoleSeeder      (3) — full role ↔ permission matrix
DepartmentSeeder          (4) — NEW: at least 6 departments
RoleUserSeeder            (5) — demo users + remap legacy fixtures
```

### 4.2 New / rewritten files

| File | Purpose |
|---|---|
| `database/seeders/PermissionSeeder.php` | Full rewrite. Defines the 93 permissions from proposal §4.2. Uses `updateOrCreate(['name' => …], $attrs)` for idempotency. |
| `database/seeders/RoleSeeder.php` | Full rewrite. Defines the 14 roles from proposal §3. |
| `database/seeders/PermissionRoleSeeder.php` | Full rewrite. Implements the matrix from proposal §5. Uses `sync()` for idempotency. |
| `database/seeders/RoleUserSeeder.php` | Full rewrite. Implements the remap table from proposal §8. |
| `database/seeders/DepartmentSeeder.php` | New. Seeds ≥ 6 representative departments (Operations, Maintenance, Customer Service, Engineering, Finance, HSE). |
| `database/seeders/DatabaseSeeder.php` | Adds `DepartmentSeeder::class` to the `call([...])` array, between `PermissionRoleSeeder` and `RoleUserSeeder`. |

### 4.3 Idempotency requirement

All seeders must be **idempotent** — re-running `php artisan db:seed` must not duplicate rows and must not change the resulting permission/role state. `updateOrCreate` and `sync` are the building blocks.

### 4.4 Commands

```bash
php artisan migrate:fresh --seed
```

### 4.5 Verification gate

```bash
php artisan tinker --execute '
    echo "roles=" . App\Models\Role::count() . PHP_EOL;
    echo "perms=" . App\Models\Permission::count() . PHP_EOL;
    echo "depts=" . App\Models\Department::count() . PHP_EOL;
    echo "system-admin perms=" . App\Models\User::where("email","rdwij@hotmail.com")->first()->getAllPermissions()->count() . PHP_EOL;
'
```

Expected output:

```
roles=14
perms=93
depts=6
system-admin perms=93
```

If `system-admin perms` is **less than 93**, the remap in `RoleUserSeeder` did not happen — check that the seeder runs *after* `RoleSeeder` and `PermissionRoleSeeder`.

---

## Phase 5 — Policies and policy registration

**Goal:** introduce policy classes and register them so `$user->can(...)` calls resolve correctly.

### 5.1 Files

| File | Permission gates |
|---|---|
| `app/Policies/UserPolicy.php` | `viewAny`, `view`, `create`, `update`, `delete`, `manage` — each maps to one of `users.view/create/edit/delete/manage`. |
| `app/Policies/EmployeePolicy.php` | `viewAny`, `view`, `create`, `update`, `delete` — each maps to one of `employees.view/create/edit/delete`. |
| `app/Policies/RolePolicy.php` | `viewAny`, `view`, `create`, `update`, `delete` — each maps to one of `roles.view/create/edit/delete`. |
| `app/Policies/PermissionPolicy.php` | `viewAny`, `view`, `create`, `update`, `delete` — each maps to one of `permissions.view/create/edit/delete`. |
| `app/Policies/DepartmentPolicy.php` | `viewAny`, `view`, `create`, `update`, `delete` — each maps to one of `departments.view/create/edit/delete`. |
| `app/Providers/AppServiceProvider.php` | + `Gate::policy(\App\Models\Department::class, \App\Policies\DepartmentPolicy::class);` to the existing `registerPolicies()` block. |

### 5.2 Verification gate

```bash
php artisan tinker --execute '
    $u = App\Models\User::where("email","rdwij@hotmail.com")->first();
    echo $u->can("view", App\Models\User::class) ? "1" : "0";
'
```

Should print `1`. If it prints `0`, the policy is not registered — re-check `AppServiceProvider::registerPolicies()`.

---

## Phase 6 — Controllers and routes

**Goal:** add the DepartmentController + approval-stage route stubs; the existing 4 controllers' `can[]` arrays are reused unchanged.

### 6.1 Files

| File | Purpose |
|---|---|
| `app/Http/Controllers/DepartmentController.php` | **New.** Mirrors `EmployeeController` (full CRUD with search/filter, `can[]` array, `inertia('departments/...')` responses). |
| `app/Http/Requests/DepartmentRequest.php` | **New.** Form request with `name`, `code`, `parent_id`, `description`, `is_active` rules. |
| `routes/web.php` | Add `Route::resource('departments', DepartmentController::class)` inside the existing `auth` + `verified` middleware group. Add approval-stage route stubs (gated by `stage:*` middleware) at the end of the same group. |

### 6.2 Route stubs for FR-08/FR-09

These are placeholders so the RBAC pipeline is fully wired. The actual disposal controller is a separate plan per proposal §13.

```php
// FR-08 / FR-09 approval workflow route stubs.
Route::post('asset-disposals/{disposal}/recommend', function () {
    return back()->with('info', 'Disposal recommendation endpoint — full implementation in plans/asset_disposal_workflow_implementation.md');
})->middleware(['auth', 'stage:recommended'])->name('asset-disposals.recommend.stub');

Route::post('asset-disposals/{disposal}/approve', function () {
    return back()->with('info', 'Disposal approval endpoint — full implementation in plans/asset_disposal_workflow_implementation.md');
})->middleware(['auth', 'stage:approved'])->name('asset-disposals.approve.stub');
```

### 6.3 Commands

```bash
php artisan route:list --path=departments
php artisan route:list | grep disposal
```

### 6.4 Verification gate

- `GET /departments` → 200 (or login redirect) — not 500.
- `POST /asset-disposals/0/recommend` as `viewer` → 403 (because `viewer` is not in `STAGE_ROLES['recommended']`).
- `POST /asset-disposals/0/recommend` as `rdwij@hotmail.com` (system-administrator) → 200 with the placeholder message.

---

## Phase 7 — Sidebar and frontend permission names

**Goal:** ensure the new domain permission names (`users.manage`, `departments.view`, `disposal.view`, etc.) render their corresponding sidebar groups correctly.

### 7.1 Files

| File | Change |
|---|---|
| `resources/js/components/app-sidebar.tsx` | The existing `buildNavItems()` reads `user.permissions`. Add new permission gates for `departments.view`, `disposal.view`, `finance.view`, `audit.view`, `analytics.view`, `work-orders.view`, `acquisitions.view`, `stock.view`, `events.view`. Pattern is identical to the existing `users.view` / `employees.view` checks — only the names change. |

### 7.2 Smoke test

```bash
npm run build
npm run types:check
```

Both succeed without errors.

### 7.3 Verification gate

Open `/dashboard` as `rdwij@hotmail.com` in a browser. The sidebar shows groups for **Administration** (Users, Employees, Departments, Roles, Permissions), **Asset Management**, **Maintenance** (Work Orders, Schedules), **Acquisition**, **Stock**, **Finance**, **Audit**, **Disposal** — the groups for which the user holds at least one `view` permission.

Log out, log in as `viewer@example.test`. Sidebar collapses to **Administration** + read-only Asset Management entries (action buttons hidden). No "New X" buttons visible.

---

## Phase 8 — Tests

**Goal:** automated coverage for the new RBAC + approval stage gate.

### 8.1 Test files to create

| File | Coverage |
|---|---|
| `tests/Feature/Admin/UserControllerTest.php` | `system-administrator` can create / edit / delete; `viewer` cannot. |
| `tests/Feature/Admin/EmployeeControllerTest.php` | `system-administrator` can create / edit / delete; `viewer` cannot. |
| `tests/Feature/Admin/RoleControllerTest.php` | `system-administrator` can edit; `viewer` cannot. |
| `tests/Feature/Admin/PermissionControllerTest.php` | Only `system-administrator` can edit. |
| `tests/Feature/Admin/DepartmentControllerTest.php` | `system-administrator` can CRUD; `viewer` cannot. |
| `tests/Feature/Middleware/CheckRoleTest.php` | User without required role gets 403; user with role passes. |
| `tests/Feature/Middleware/EnsureApprovalStageTest.php` | `disposal.approve` rejected for `risk-management`; accepted for `corporate-finance-audit`. |
| `tests/Unit/UserGetAllPermissionsTest.php` | `getAllPermissions()` returns the union across roles; ≤ 3 queries on the 14-role / 93-permission fixture. |

### 8.2 Pest pattern

Use the existing Pest style (`it('does X', function () { … }`); use `actingAs($user)` from Laravel's test helpers; use `RefreshDatabase` for feature tests; use the existing `User::factory()` for fixtures.

### 8.3 Commands

```bash
php artisan test --filter=UserController
php artisan test --filter=EmployeeController
php artisan test --filter=RoleController
php artisan test --filter=PermissionController
php artisan test --filter=DepartmentController
php artisan test --filter=CheckRole
php artisan test --filter=EnsureApprovalStage
php artisan test tests/Unit/UserGetAllPermissionsTest.php
```

### 8.4 Verification gate

All eight test files pass. If a test fails, fix the underlying code (or the test) before moving on — **do not skip tests**.

---

## Phase 9 — End-to-end verification

**Goal:** confirm every FR-01…FR-09 acceptance criterion from proposal §10.2.

### 9.1 Commands

```bash
php artisan migrate:fresh --seed
php artisan test                              # full test suite
npm run build
npm run types:check
php artisan route:list | grep -E 'disposal|departments|users|employees|roles|permissions'
```

### 9.2 Manual checklist

| FR | Action | Expected |
|---|---|---|
| FR-01 | Log in as `rdwij@hotmail.com` → dashboard renders | 200 OK |
| FR-01 | Log in as each demo user (14 in total) → all succeed | 200 OK |
| FR-02 | `/users` shows all demo users | list visible |
| FR-02 | "New User" → submit → appears in list | created |
| FR-03 | `/settings/profile` → change name → save | name updated |
| FR-04 | `/users` as `viewer` → no action buttons | read-only |
| FR-04 | `/users` as `system-administrator` → all buttons | full |
| FR-05 | `/employees` shows 8 demo employees | list visible |
| FR-05 | Create / edit / delete test employee | works |
| FR-08 | `POST /asset-disposals/0/recommend` as `viewer` | 403 |
| FR-08 | `POST /asset-disposals/0/recommend` as `system-administrator` | 200 |
| FR-09 | Same as FR-08 (shared engine) | |
| NFR-01 | Logged-out `/dashboard` | redirect to login |
| NFR-02 | `/users/create` as `viewer` | 403 |
| NFR-05 | Sidebar groups render under correct operational areas | confirmed |

### 9.3 Verification gate

Every row in §9.2 passes. Any failure is a release blocker.

---

## Phase 10 — Walkthrough

**Goal:** leave a record of what was changed and how to verify it.

### 10.1 Create

`walkthrough/USER_ACCOUNTS_ROLES_ISO55000_IMPLEMENTATION.md` — follow the same shape as `walkthrough/ADMIN_RBAC_AND_ADMIN_PAGES_FIX.md`:

1. Background — what was wrong before (legacy `users.role` ENUM, generic 5 roles).
2. What was added — the 14 roles, 93 permissions, `Department`, `ApprovalStage`, `EnsureApprovalStage`.
3. Files touched — grouped by phase (DB / models / middleware / seeders / policies / routes / frontend).
4. Verification — output of the smoke-test commands run in Phase 9.

### 10.2 Verification gate

The walkthrough file is committed. It includes the **exact** output of:

```bash
php artisan tinker --execute 'echo App\Models\Role::count() . " roles, " . App\Models\Permission::count() . " permissions\n";'
```

Expecting: `14 roles, 93 permissions`.

---

## Rollback plan

If a phase must be rolled back:

1. `git revert` the commit(s) introduced in that phase.
2. `php artisan migrate:fresh --seed` restores the legacy 5-role catalog (because the new seeders also rebuild the legacy state on a fresh DB; **no**, they do not — they only build the new state).
3. If a partial state is in the DB after a half-completed migration, drop and recreate:
   ```bash
   php artisan migrate:fresh
   ```
4. Restore the previous commit's `users.role` ENUM column by re-running the dropped migration's `down()` method manually (only if needed for forensic recovery).

---

## Out of scope (per proposal §13)

The following are **not** part of this implementation plan:

- Corporate / regional / site organizational-level scope on employees.
- Full `AssetDisposalController` UI for FR-08 / FR-09 (the approval-stage route stubs are placeholders).
- Backfill `employees.department_id` from the legacy text column.
- In-app chat (NFR-12).
- Notifications (SMS / Email / WhatsApp).
- Two-factor enforcement policy.

---

*End of Implementation Plan — execute phases 0–10 in order. Each phase has a verification gate; do not advance until the gate passes.*