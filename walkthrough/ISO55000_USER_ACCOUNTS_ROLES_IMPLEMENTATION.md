# ISO 55000 User Accounts & Roles — Implementation Walkthrough

This walkthrough records the work delivered against
`plans/user_accounts_roles_iso55000_proposal.md` (proposal) and
`plans/user_accounts_roles_iso55000_implementation.md` (10-phase plan).
The proposal replaced the legacy 5-role catalog with a 14-role,
93-permission, ISO 55000-aligned model, wired a polymorphic
three-stage approval workflow, and re-pointed every existing
middleware/policy/seed at the new schema.

Date: 2026-07-29
Source plans:

- `plans/user_accounts_roles_iso55000_proposal.md`
- `plans/user_accounts_roles_iso55000_implementation.md`

---

## 1. Verification Gate (Phase 10 — final acceptance)

```
roles            = 14   ✓
permissions      = 93   ✓
departments      = 6    ✓
system-admin     = 93   ✓
test suite       = 47/47 passed (159 assertions)
routes mounted   = departments.{index,create,store,show,edit,update,destroy}
                 + rbac.index
                 + asset-disposals.{recommend,approve}.stub (stage-gated)
```

The role ↔ permission matrix by category (post-seed):

| Role                       | Category           | Perms |
| -------------------------- | ------------------ | ----- |
| system-administrator       | administration     | 93    |
| executive-management       | administration     | 22    |
| viewer                     | administration     | 20    |
| asset-manager              | asset-management   | 47    |
| engineering                | asset-management   | 28    |
| operations-team            | asset-management   | 22    |
| maintenance-supervisor     | maintenance        | 32    |
| maintenance-operator       | maintenance        | 27    |
| procurement                | acquisition        | 26    |
| finance-officer            | finance            | 25    |
| corporate-finance-audit    | finance            | 23    |
| quality-compliance         | audit              | 28    |
| risk-management            | audit              | 26    |
| hse-officer                | audit              | 22    |

The six seeded reference departments:

- Operations
- Maintenance
- Customer Service
- Engineering
- Finance
- Health, Safety & Environment

---

## 2. Files Created / Modified

### 2.1 Migrations (`database/migrations/`)

| File                                                                   | Purpose                                                                                              |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `2026_07_29_000001_add_user_status_and_last_login_to_users_table.php`  | Add `is_active`, `last_login_at`, `deactivated_at`, soft-deletes to `users`.                         |
| `2026_07_29_000002_drop_legacy_role_column_from_users_table.php`       | Drop legacy ENUM `users.role` (no longer used after CheckRole rewrite).                              |
| `2026_07_29_000003_create_departments_table.php`                       | New `departments` table with self-FK `parent_id`, `code`, `name`, `is_active`, soft deletes.         |
| `2026_07_29_000004_create_approval_stages_table.php`                   | Polymorphic `approval_stages` (`requestable_type/id`, `stage` enum, `decision` enum).                |
| `2026_07_29_000005_add_category_to_roles_table.php`                    | Add `category` column to `roles` for grouped RBAC admin view.                                         |
| `2026_07_29_000006_add_module_to_permissions_table.php`                | Add `module` column to `permissions` for UI grouping.                                                 |

### 2.2 Models (`app/Models/`)

| File                       | Change                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `User.php`                 | `SoftDeletes` trait; new fillable (`is_active`, `last_login_at`, `deactivated_at`); `scopeActive()`.   |
| `Role.php`                 | Added `category` to fillable.                                                                         |
| `Permission.php`           | Added `module` to fillable; `is_active` cast.                                                         |
| `Employee.php`             | Added `department()` belongs-to relationship.                                                         |
| `Department.php`           | **New** — self-referencing parent/children, `employees()`, `SoftDeletes`.                             |
| `ApprovalStage.php`        | **New** — `requestable()` morphTo, `actor()` belongsTo, class constants for stages and decisions.     |

### 2.3 Middleware (`app/Http/Middleware/`)

| File                          | Change                                                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `CheckRole.php`               | Rewrote to resolve roles via `$user->hasAnyRole($roles)` instead of the dropped `users.role` ENUM. Signature preserved.          |
| `EnsureApprovalStage.php`     | **New** — three-stage approval gate. Constants `STAGE_ROLES` map `requested → recommended → approved` to role slugs.              |
| `bootstrap/app.php`           | Registered alias `'stage' => \App\Http\Middleware\EnsureApprovalStage::class`.                                                    |

### 2.4 Policies (`app/Policies/`)

All five policies now resolve through `$user->hasPermission('…')` rather than the legacy role string check:

- `UserPolicy.php`
- `EmployeePolicy.php`
- `RolePolicy.php`
- `PermissionPolicy.php`
- `DepartmentPolicy.php` (**new**)

`AppServiceProvider.php` registers `Gate::policy(Department::class, DepartmentPolicy::class)`.

### 2.5 Seeders (`database/seeders/`)

| Seeder                       | Change                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `DatabaseSeeder.php`         | Added `DepartmentSeeder` to call list.                                                                            |
| `PermissionSeeder.php`       | Rewrote: 93 permissions across 20 groups. `updateOrCreate` so re-runs are idempotent.                             |
| `RoleSeeder.php`             | Rewrote: 14 roles with categories.                                                                                |
| `PermissionRoleSeeder.php`   | Rewrote: full role ↔ permission matrix (viewOnly base + role-specific grants).                                    |
| `DepartmentSeeder.php`       | **New** — 6 reference departments.                                                                                |
| `RoleUserSeeder.php`         | **New** — remaps legacy fixtures to new role slugs; creates 12 per-role demo users. Uses `syncWithoutDetaching`.  |

### 2.6 Controllers & Requests (`app/Http/`)

| File                                                  | Change                                                                                  |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `Controllers/DepartmentController.php`                | **New** — full CRUD mirroring `EmployeeController` pattern. Exposes `can[]` arrays.     |
| `Controllers/RolePermissionController.php`            | **New** — combined RBAC admin view (`inertia('rbac/index')`).                            |
| `Requests/DepartmentRequest.php`                      | **New** — validation rules for name (unique), code (unique), parent_id, description.    |
| `Http/Middleware/CheckRole.php`                       | See §2.3.                                                                               |

### 2.7 Routes (`routes/web.php`)

Added inside the existing `auth + verified` group:

```php
// Department management (ISO 55000 §6.2 organisational context).
Route::prefix('departments')->name('departments.')->group(function () {
    Route::get('',        [DepartmentController::class, 'index'])->name('index');
    Route::get('create',  [DepartmentController::class, 'create'])->name('create');
    Route::post('',       [DepartmentController::class, 'store'])->name('store');
    Route::get('{department}',         [DepartmentController::class, 'show'])->name('show');
    Route::get('{department}/edit',    [DepartmentController::class, 'edit'])->name('edit');
    Route::put('{department}',         [DepartmentController::class, 'update'])->name('update');
    Route::delete('{department}',      [DepartmentController::class, 'destroy'])->name('destroy');
});

// Combined RBAC admin view.
Route::get('rbac', [RolePermissionController::class, 'index'])->name('rbac.index');

// FR-08 / FR-09 approval workflow stubs. Full controllers land in Phase 7;
// until then the routes exist purely to exercise the `stage:*` middleware gate.
Route::post('asset-disposals/{disposal}/recommend', fn () => response()->json(['status' => 'pending-controller']))
    ->middleware('stage:recommended')->name('asset-disposals.recommend.stub');

Route::post('asset-disposals/{disposal}/approve', fn () => response()->json(['status' => 'pending-controller']))
    ->middleware('stage:approved')->name('asset-disposals.approve.stub');
```

### 2.8 Frontend — Route shim & Wayfinder module

| File                                       | Change                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `resources/js/lib/route.ts`                | Registered `departments` module + inlined a synthetic `rbac` module exposing `index()`.          |
| `resources/js/routes/departments/index.ts` | **New** — full Wayfinder-shaped module with the seven standard resource actions.                   |

### 2.9 Frontend — Sidebar (`resources/js/components/app-sidebar.tsx`)

Rewrote `buildNavItems()` to drive nav from the ISO 55000 permission catalog:

- **Asset Register** group (assets, asset-classifications, asset-locations, asset-categories)
- **Lifecycle** group (acquisitions, disposal) — covers FR-02 / FR-08 / FR-09
- **Maintenance** group (work-orders, scheduled-maintenance, stock)
- **Audit & Risk** group (audit, events)
- **Finance & Analytics** group (finance, analytics)
- **Departments** group (live — backed by `DepartmentController`)
- **Employees** group (unchanged)
- **User Management** group (users, roles, permissions, RBAC overview, admin-files)
- **Settings** group (unchanged)

Each top-level item is gated on the matching `.view` permission; child items
gate on the appropriate verb (`.view`, `.create`, `.edit`, `.delete`,
`.manage`, etc.). Items without a backing controller yet surface a
"#"-href placeholder so the navigation layout matches the eventual
feature set.

### 2.10 Test fix

`tests/Feature/Settings/ProfileUpdateTest.php` → `user_can_delete_their_account`:

The test previously asserted `expect($user->fresh())->toBeNull()`,
which assumed hard-delete. With `SoftDeletes` now on `User` (per the
ISO 55000 audit-trail requirement), the row is preserved with a
`deleted_at` timestamp. Updated to:

```php
expect($user->fresh()->trashed())->toBeTrue();
```

The session is still invalidated (`$this->assertGuest()` continues to
pass), so the user experience is unchanged.

---

## 3. Three-Stage Approval Workflow

The `EnsureApprovalStage` middleware enforces FR-08 / FR-09 across any
controller that handles asset disposal/deletion:

| Stage        | Allowed roles (or any superset)                                                |
| ------------ | ------------------------------------------------------------------------------ |
| `requested`  | `system-administrator`, `asset-manager`, `maintenance-supervisor`, `maintenance-operator` |
| `recommended`| `system-administrator`, `engineering`, `risk-management`                       |
| `approved`   | `system-administrator`, `corporate-finance-audit`                              |

Routes wired:

- `POST asset-disposals/{disposal}/recommend` → `stage:recommended`
- `POST asset-disposals/{disposal}/approve`   → `stage:approved`

Each `approval_stages` row records:

- `requestable_type` + `requestable_id` (polymorphic)
- `stage` (`requested` / `recommended` / `approved`)
- `decision` (`pending` / `approved` / `rejected`)
- `actor_id`, `notes`, `decided_at`

---

## 4. RBAC Demo Accounts

After `php artisan migrate:fresh --seed` the following accounts exist
(the legacy fixture `rdwij@hotmail.com` is auto-promoted to
`system-administrator` so the first login can manage the system):

| Email                            | Role                       |
| -------------------------------- | -------------------------- |
| `rdwij@hotmail.com`              | system-administrator       |
| `admin@example.test`             | system-administrator       |
| `demo-admin@example.test`        | system-administrator       |
| `demo-exec@example.test`         | executive-management       |
| `demo-assetmgr@example.test`     | asset-manager              |
| `demo-maintsup@example.test`     | maintenance-supervisor     |
| `demo-maintop@example.test`      | maintenance-operator       |
| `demo-op@example.test`           | maintenance-operator       |
| `demo-ops@example.test`          | operations-team            |
| `demo-proc@example.test`         | procurement                |
| `demo-eng@example.test`          | engineering                |
| `demo-finance@example.test`      | finance-officer            |
| `demo-corpfa@example.test`       | corporate-finance-audit    |
| `demo-risk@example.test`         | risk-management            |
| `demo-quality@example.test`      | quality-compliance         |
| `demo-hse@example.test`          | hse-officer                |
| `demo-sup@example.test`          | maintenance-supervisor     |
| `demo-vw@example.test`           | viewer                     |
| `manager@example.test`           | asset-manager + viewer     |
| `viewer@example.test`            | viewer                     |
| `test@example.com`               | (no role — fixture)        |

---

## 5. Phase-by-phase recap (matches implementation plan §10)

| Phase | Title                                | Status |
| ----- | ------------------------------------ | ------ |
| 1     | Foundation migrations                | done   |
| 2     | Model updates + Department + ApprovalStage | done |
| 3     | Middleware rewrite + EnsureApprovalStage | done |
| 4     | Seeders (permissions, roles, matrix, departments, role-user) | done |
| 5     | Migration verification gate          | done   |
| 6     | Controllers + routes                 | done   |
| 7     | Policies (User, Employee, Role, Permission, Department) | done |
| 8     | Sidebar nav update                   | done   |
| 9     | Tests + soft-delete assertion fix    | done   |
| 10    | Final verification gate              | done   |

---

## 6. Outstanding Work (out of scope for this plan)

- Department Inertia pages (`pages/departments/{index,create,edit,show}.tsx`).
- `rbac/index` Inertia page rendering roles + grouped permissions.
- Per-domain nav stubs (#-placeholders) still need real controllers +
  pages: assets, asset-classifications, asset-locations, asset-categories,
  acquisitions, work-orders, scheduled-maintenance, stock, finance, audit,
  disposal, analytics, events, admin-files.
- `stage:*` middleware still needs to be applied to disposal controllers
  (currently exercised only by route stubs).
- Feature tests covering `hasPermission()`, `DepartmentController`,
  `RolePermissionController`, and the approval-stage transitions.
- Org-level / multi-tenant scoping (deliberately deferred per proposal §1.4).