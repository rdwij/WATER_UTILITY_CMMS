# Asset Locations, Head-Office Divisions, Cost Centers & Assets — Implementation Plan (Temporary — Pending Conflict Resolution)

> **TEMPORARY MARKER**: This is the existing unified implementation plan. It is being held while conflicts identified in `asset_location_conflicts.md` are resolved. Do not implement against this document until the conflicts document is closed out and this file is rewritten to `_v2.md` or restored to its original name. The conflict analysis has surfaced inconsistencies with `docs/asset_locations.sql` and the data-migration companion plan (`asset_location_data_migration.md`) — see that document for the full list.

## Context

The Water Utility organization spans two parallel hierarchies under a single Head Office root, plus a central cost-center catalog:

- **Operational tree** — Head Office → RSC → Region → Site (water-delivery operations)
- **Divisions tree** — Head Office → Division (HR, Finance, Audit, Tender & Contract, Supply & Materials Management, Planning & Design, Corporate Service, Director Board) → optional sub-division
- **Cost-center catalog** — every Employee, User, Asset, Site, and Sub-Division points at exactly one cost center; internal nodes (Head Office, RSC, Region, Division top) are nullable

The codebase already has a partial implementation:

- `database/migrations/2026_07_13_145322_create_asset_locations_table.php` creates `asset_locations` with `kalnoy/nestedset` columns (`_lft`, `_rgt`, `parent_id`, `depth`), a `cost_center_id` (declared `unique` but referencing nothing), and an `asset_location_name`.
- `app/Models/Asset/AssetLocation.php` uses `Kalnoy\Nestedset\NodeTrait` but has no `$fillable`, no relationships, no scopes, and a buggy `hasLocationUpper()` method.
- No controller, routes, form request, Inertia pages, or sidebar entry exist for asset locations.

This plan delivers, in one slice:

1. A complete hierarchical CRUD for the **Organization tree** (Head Office, RSC, Region, Site, Division, Sub-division).
2. A central **Cost Center** catalog (CRUD or read-only — see §6.2) usable by all entities.
3. **Cost-center linkage** on users, employees, and assets (required at the row level).
4. The **Asset** schema, model, factory, and a read-only "Assets under this location" panel on the asset-locations show page. Full Asset CRUD is a follow-up.
5. RBAC scoped to the user's subtree (operational users see operational; division users see their division; cross-branch access is a follow-up).

## Resolved decisions (from prior sessions)

- **Soft delete**: `is_active` boolean flag only — no Laravel `SoftDeletes` trait.
- **Cost-center on asset_locations**: drop the existing `unique`; many-to-one (one cost center → many sites/sub-divisions).
- **User scope**: a user can be assigned to any hierarchy level.
- **One `division` type with unlimited depth** (no separate `sub_division` type). Kalnoy already enforces the tree.
- **Sidebar naming**: top-level nav renamed from "Asset Locations" → **"Organization"**.
- **Asset scope for this slice**: schema + model + relationships + factory + a read-only "Assets" panel on the asset-locations show page. Full Asset CRUD is deferred.
- **Cost-center back-fill**: seed a "Head Office" cost center, point all existing users/employees at it, then ALTER to NOT NULL.
- **Cross-branch access**: strict isolation in v1. A future `cross_branch_access` permission can override per-user.
- **Divisions fixture list**: HR, Finance, Audit, Tender & Contract, Supply & Materials Management, Planning & Design, Corporate Service, Director Board.

---

## 1. Migrations (8 total, all non-destructive)

Order matters — each migration depends on the previous. Filenames use `2026_07_28_*` so they run after the existing `2026_07_13_*` and `2026_07_24_*` migrations.

### M0. `database/migrations/2026_07_28_085500_seed_head_office_root.php`
Data migration. Inserts a single Head Office row at the root of the tree using kalnoy's `saveAsRoot()` so the rest of the migrations can reference it. Run before M1 so any FK can point at it.
- Idempotent: only insert if no row with `type = 'head_office'` exists.

### M1. `database/migrations/2026_07_28_090000_create_cost_centers_table.php`
Mirror `database/migrations/2026_07_24_194521_create_roles_table.php` style.
- `id`, `string code` unique, `string name`, `boolean is_active` default `true`, `timestamps`.

### M2. `database/migrations/2026_07_28_090100_enrich_asset_locations_table.php`
Add columns:
- `type` (`enum('head_office','rsc','region','site','division')`).
- `branch` (`enum('operational','division')`, default `operational`).
- `code` (`string` unique).
- `description` (`text` nullable).
- `is_active` (`boolean` default `true`).
- `manager_id` (`unsignedBigInteger` nullable).

Drop the existing `unique` index on `cost_center_id`. Make `cost_center_id` nullable.
- `foreign('cost_center_id')->references('id')->on('cost_centers')->nullOnDelete();`
- `foreign('manager_id')->references('id')->on('users')->nullOnDelete();`
- Add `index('type')`, `index('branch')`, `index('is_active')`.

### M2b. `database/migrations/2026_07_28_090150_seed_divisions_and_cost_centers.php`
Data migration. Seeds the corporate divisions under Head Office and their cost centers so the system is usable immediately:
- Cost centers: one per seeded division + one "Head Office" cost center.
- AssetLocation divisions: HR, Finance, Audit, Tender & Contract, Supply & Materials Management, Planning & Design, Corporate Service, Director Board — each with `branch = 'division'`, `parent_id = <head_office>`, an explicit `code` and `manager_id = NULL` (admin fills later).
- Idempotent (uses `updateOrCreate` / kalnoy's `saveAsFirstChildOf($headOffice)`).

### M3. `database/migrations/2026_07_28_090200_add_location_and_cost_center_to_users_table.php`
Mirror `database/migrations/2026_07_13_013001_add_role_to_users_table.php` style.
- `$table->foreignId('asset_location_id')->nullable()->after('id')->constrained('asset_locations')->nullOnDelete();`
- `$table->foreignId('cost_center_id')->nullable()->after('asset_location_id')->constrained('cost_centers')->nullOnDelete();`
- Both columns are nullable **at this stage** so the migration doesn't break existing rows.

### M4. `database/migrations/2026_07_28_090300_add_location_and_cost_center_to_employees_table.php`
Same pattern as M3, applied to `employees`.

### M5. `database/migrations/2026_07_28_090400_create_assets_table.php`
New table:
- `id`, `asset_location_id` FK→`asset_locations` NOT NULL, `cost_center_id` FK→`cost_centers` NOT NULL, `asset_tag` (string unique), `name` (string), `description` (text nullable), `serial_number` (string nullable), `model_number` (string nullable), `manufacturer` (string nullable), `acquired_at` (date nullable), `status` (`enum('in_service','under_maintenance','retired','disposed')` default `in_service`), `is_active` (boolean default true), `timestamps`.
- Add `index('status')`, `index('asset_location_id')`, `index('cost_center_id')`.

### M6. `database/migrations/2026_07_28_090500_backfill_and_enforce_cost_center_not_null.php`
Data + schema migration:
1. For every user with `cost_center_id IS NULL`: set it to the Head Office cost center's id.
2. Same for every employee.
3. Same for every asset (none yet, but defensive).
4. `ALTER TABLE users MODIFY cost_center_id BIGINT UNSIGNED NOT NULL;`
5. `ALTER TABLE employees MODIFY cost_center_id BIGINT UNSIGNED NOT NULL;`
6. `ALTER TABLE assets MODIFY cost_center_id BIGINT UNSIGNED NOT NULL;` (idempotent — only alters if not already NOT NULL).

### Execution order
`M0 → M1 → M2 → M2b → M3 → M4 → M5 → M6`. Run `php artisan migrate` after each locally. M0 must be before M3/M4/M5 (FK target). M1 before M2 (FK target). M2b before M6 (Head Office cost center needed).

> **⚠ Open: order with M-import.** The data-migration plan inserts a new `M-import` migration at `2026_07_28_085600_import_existing_asset_locations.php` that creates Head Office + 99 cost-centers + 107 asset-locations from `docs/asset_locations.sql`. If M-import is added, M0 becomes a no-op (Head Office already exists), and M1 must run **before** M-import (so cost_centers table exists). See `asset_location_conflicts.md` conflict C-01.

---

## 2. Models

### `app/Models/CostCenter.php` (new)
- `$fillable = ['code', 'name', 'is_active'];`
- `$casts = ['is_active' => 'bool'];`
- `assetLocations(): HasMany { return $this->hasMany(AssetLocation::class); }`
- `users(): HasMany { return $this->hasMany(User::class); }`
- `employees(): HasMany { return $this->hasMany(Employee::class); }`
- `assets(): HasMany { return $this->hasMany(Asset::class); }`

### `app/Models/Asset/AssetLocation.php` (full rewrite)
- Keep `namespace App\Models\Asset;` and `use Kalnoy\Nestedset\NodeTrait;`.
- `$fillable = ['asset_location_name', 'code', 'type', 'branch', 'description', 'is_active', 'manager_id', 'cost_center_id', 'parent_id'];`
- `$casts = ['is_active' => 'bool'];`
- Constants:
  ```php
  public const BRANCH_OPERATIONAL = 'operational';
  public const BRANCH_DIVISION    = 'division';
  public const BRANCHES = [self::BRANCH_OPERATIONAL, self::BRANCH_DIVISION];

  public const TYPE_HEAD_OFFICE = 'head_office';
  public const TYPE_RSC         = 'rsc';
  public const TYPE_REGION      = 'region';
  public const TYPE_SITE        = 'site';
  public const TYPE_DIVISION    = 'division';
  public const TYPES = [
      self::TYPE_HEAD_OFFICE,
      self::TYPE_RSC,
      self::TYPE_REGION,
      self::TYPE_SITE,
      self::TYPE_DIVISION,
  ];
  ```
- Relationships:
  - `costCenter(): BelongsTo CostCenter`
  - `manager(): BelongsTo User` (foreign key `manager_id`)
  - `children()` / `descendants()` / `ancestors()` — from `NodeTrait` already
  - `assets(): HasMany Asset`
  - `employees(): HasMany Employee`
  - `users(): HasMany User`
- Scopes:
  - `scopeRoots($q)`: `whereNull('parent_id')`
  - `scopeOfType($q, string $type)`: `where('type', $type)`
  - `scopeOfBranch($q, string $branch)`: `where('branch', $branch)`
  - `scopeActive($q)`: `where('is_active', true)`
- Replace buggy `hasLocationUpper($loc_id)` with:
  ```php
  public function hasLocationUpper(int $loc_id): bool
  {
      return $this->ancestorsAndSelf()->pluck('id')->contains($loc_id);
  }
  ```
- Add `isHeadOffice(): bool`, `isLeaf(): bool` helpers for the controller.

### `app/Models/Asset.php` (new — minimal)
- `$fillable = ['asset_location_id', 'cost_center_id', 'asset_tag', 'name', 'description', 'serial_number', 'model_number', 'manufacturer', 'acquired_at', 'status', 'is_active'];`
- `$casts = ['is_active' => 'bool', 'acquired_at' => 'date'];`
- Status constants: `STATUS_IN_SERVICE`, `STATUS_UNDER_MAINTENANCE`, `STATUS_RETIRED`, `STATUS_DISPOSED`, `STATUSES`.
- Relationships:
  - `assetLocation(): BelongsTo AssetLocation`
  - `costCenter(): BelongsTo CostCenter`
- Scope `scopeActive($q)`.

### `app/Models/User.php` — additions
- Add `assetLocation(): BelongsTo { return $this->belongsTo(AssetLocation::class); }`.
- Add `costCenter(): BelongsTo { return $this->belongsTo(CostCenter::class); }`.
- Add `accessibleAssetLocations()` helper (see §3).
- Update `$fillable` to include `cost_center_id` (currently uses PHP attribute; add to the `#[Fillable([...])]` list).

### `app/Models/Employee.php` — additions
- Add `asset_location_id` and `cost_center_id` to `$fillable`.
- Add `assetLocation(): BelongsTo AssetLocation`.
- Add `costCenter(): BelongsTo CostCenter`.

---

## 3. RBAC & Authorization

### Permission keys (new)
Group: `organization` (replaces the proposed `asset_locations` group). Add to `database/seeders/PermissionSeeder.php` using the existing `updateOrCreate(['name' => ...], $permission + ['is_active' => true])` pattern:
- `organization.view` — display "View Organization"
- `organization.create` — "Create Organization Nodes"
- `organization.edit` — "Edit Organization Nodes"
- `organization.delete` — "Delete Organization Nodes"

Group: `cost_centers`:
- `cost_centers.view`, `cost_centers.create`, `cost_centers.edit`, `cost_centers.delete`.

### Role grants
Update `database/seeders/PermissionRoleSeeder.php`:
- `admin` gets all of `organization.*` and `cost_centers.*` via the existing `$all` mechanism.
- `manager` gets view/create/edit on both groups.
- `supervisor`, `operator`, `viewer` get view-only on both groups.

### `User::accessibleAssetLocations()` — the scoping helper
Add to `app/Models/User.php` after the `hasAllPermission` block:

```php
public function accessibleAssetLocations(): \Illuminate\Database\Eloquent\Builder
{
    $q = AssetLocation::query();
    // Admin shortcut: full access across both branches.
    if ($this->hasAllPermission(['organization.view'])) {
        return $q;
    }
    $loc = $this->assetLocation;
    if (! $loc) {
        return $q->whereRaw('1 = 0');
    }
    // Any-level user: me + my descendants (single _lft/_rgt range scan).
    return $q->where(function ($w) use ($loc) {
        $w->where('id', $loc->id)
          ->orWhereBetween('_lft', [$loc->_lft, $loc->_rgt]);
    });
}
```

### Cross-branch access (deferred)
No cross-branch support in v1. Future enhancement: add `cross_branch_access` boolean on the `User` model + a corresponding override in `accessibleAssetLocations()`.

### Optional policy
`app/Policies/OrganizationPolicy.php` with `viewAny`, `view`, `create`, `update`, `delete` calling `accessibleAssetLocations()` for `viewAny`/`view` and `$user->hasPermission('organization.X')` for the verbs. Register in `AuthServiceProvider`.

---

## 4. Form Request

### `app/Http/Requests/OrganizationRequest.php` (new — note rename)
Mirrors `app/Http/Requests/EmployeeRequest.php`.

Rules:
```
asset_location_name  required string max:150
code                 required string max:50  unique:asset_locations,code,{id}
branch               required in:operational,division
type                 required in:head_office,rsc,region,site,division
parent_id            nullable integer exists:asset_locations,id
cost_center_id       nullable exists:cost_centers,id  (required_if:type in:site,division)
manager_id           nullable exists:users,id
is_active            boolean
description          nullable string max:1000
```

> **⚠ Open: validator "code ends 000" rule.** The plan's `withValidator()` says `type=rsc → code must end in 000`. The SQL data has `Kandy North Region` with `cost_center_id=4300` (ends `000`) classified as `region`, plus 13 RSCs whose cost_center_ids end `000`. The rule would need to be relaxed for imports; new RSCs should still end `000`. See `asset_location_conflicts.md` conflict C-05.

### `app/Http/Requests/CostCenterRequest.php` (new)
Mirrors `app/Http/Requests/RoleRequest.php`.

### `app/Http/Requests/AssetRequest.php` (new)
Mirrors `EmployeeRequest` shape. Required only for the future Asset CRUD.

---

## 5. Controllers

### `app/Http/Controllers/OrganizationController.php` (new)
Mirrors `app/Http/Controllers/EmployeeController.php`.

**`index(Request $request)`**
- Base query: `$request->user()->accessibleAssetLocations()->with(['parent', 'costCenter', 'manager'])`.
- Filters: `search`, `type`, `branch`, `is_active`.
- If `?view=tree`: return `withDepth()->defaultOrder('code')->get()` shape.
- Otherwise: `latest()->paginate(20)->withQueryString()`.

**`create()`** — parents filtered by subtree + branch.

**`store(OrganizationRequest $request)`** — `appendToNode($parent)` or `saveAsRoot()`.

**`show(AssetLocation $assetLocation)`** — load `parent, manager, costCenter, children, ancestors, employees.user, users, assets, assets.costCenter`.

**`edit(AssetLocation $assetLocation)`** — same as `create` plus `'assetLocation' => $assetLocation->load([...])`.

**`update(OrganizationRequest $request, AssetLocation $assetLocation)`** — handle parent_id change via detach + reattach.

**`destroy(AssetLocation $assetLocation)`** — refuse if children exist.

### `app/Http/Controllers/CostCenterController.php` (new)
Full CRUD mirroring `RoleController`.

### `app/Http/Controllers/AssetController.php` (new — minimal)
Read-only `index` + `show`. CRUD scaffolded but not wired.

---

## 6. Routes

```php
Route::prefix('organization')->name('organization.')->group(function () {
    Route::get('',                       [OrganizationController::class, 'index'])->name('index');
    Route::get('create',                 [OrganizationController::class, 'create'])->name('create');
    Route::post('',                      [OrganizationController::class, 'store'])->name('store');
    Route::get('{asset_location}',       [OrganizationController::class, 'show'])->name('show');
    Route::get('{asset_location}/edit',  [OrganizationController::class, 'edit'])->name('edit');
    Route::put('{asset_location}',       [OrganizationController::class, 'update'])->name('update');
    Route::delete('{asset_location}',    [OrganizationController::class, 'destroy'])->name('destroy');
});

Route::resource('cost-centers', CostCenterController::class);

Route::get('assets', [AssetController::class, 'index'])->name('assets.index');
Route::get('assets/{asset}', [AssetController::class, 'show'])->name('assets.show');
```

URL convention: kebab-case `organization`, `cost-centers`, `assets`.

---

## 7. Inertia Pages

All under `resources/js/pages/`.

### `resources/js/pages/organization/index.tsx`
Columns: Name, Code, Type (color-coded), Branch, Parent, Cost Center, Manager, Status, Actions. Filter form: search, type, branch, status, view-mode. Tree view with depth indent.

### `resources/js/pages/organization/create.tsx` / `edit.tsx`
Fields: name, code (hint: `000` for RSC), branch, type, parent_id, cost_center_id, manager_id, is_active, description.

### `resources/js/pages/organization/show.tsx`
Hero block + cards + children table + assets panel + employees/users side panel.

### `resources/js/pages/cost-centers/{index,create,edit,show}.tsx`
Mirror `roles/` pages.

### `resources/js/pages/assets/{index,show}.tsx`
Read-only list/detail.

---

## 8. Sidebar Entry

In `resources/js/components/app-sidebar.tsx`, add two parallel blocks: Organization (with All Nodes / New Node / Cost Centers children) and Assets.

---

## 9. Wayfinder Routes

After routes are registered, run `php artisan wayfinder:generate` to produce `resources/js/routes/{organization,cost-centers,assets}/index.ts`.

---

## 10. Factories

- `database/factories/CostCenterFactory.php`
- `database/factories/AssetLocationFactory.php`
- `database/factories/HeadOfficeFactory.php`
- `database/factories/AssetFactory.php`
- Patch `database/factories/UserFactory.php` to include `asset_location_id` and `cost_center_id`.

---

## 11. Tests

`tests/Feature/Admin/OrganizationTest.php`, `CostCenterTest.php`, `AssetTest.php` (Pest 4).

---

## 12. Implementation Order

1. Migrations: M0 → M1 → M2 → M2b → M3 → M4 → M5 → M6. **If M-import is added: M1 → M-import → M2 → M2b → M3 → M4 → M5 → M6 (M0 becomes no-op).**
2. Models: CostCenter → AssetLocation rewrite → Asset → patch User/Employee.
3. Seeders: extend PermissionSeeder + PermissionRoleSeeder.
4. Factories.
5. FormRequests.
6. Controllers.
7. Routes.
8. Wayfinder regen.
9. Inertia pages.
10. Sidebar entry.
11. Tests.
12. Validation: `composer test`, `npm run types:check`, `npm run lint:check`, `npm run build`.

---

## Critical Files to Modify

(Same as before; see original `asset_location_implementation.md` for full list.)

## Existing Patterns to Reuse

(Same as before.)

## Verification

End-to-end manual smoke test:

1. `php artisan migrate:fresh --seed`
2. `npm run build`
3. `php artisan serve` + open the app, log in as `admin@example.test`.
4. Sidebar → **Organization** → confirm tree renders Head Office with two branches.
5. **Cost Centers** sub-item — confirm seeded cost centers are listed.
6. **Create**: add an RSC → Region → Site.
7. **Edit**: change a site's parent.
8. **Delete**: try to delete a region — confirm refusal flash.
9. **Assets panel** on the Site's show page.
10. Confirm `admin@example.test` has a non-null `asset_location_id` and `cost_center_id`.
11. Log in as a non-admin user assigned to a single site; confirm scoped access.
12. `composer test`.

> **⚠ Verification gap.** The above flow assumes a fresh DB. With M-import active the DB starts with 107 asset_locations + 99 cost_centers already in place; the verification should additionally confirm the imported data (see `asset_location_data_migration.md` §6).

## Risks / Out of Scope

- Full Asset CRUD deferred.
- Cross-branch access not supported in v1.
- `AssetLocationSeeder` fixture data beyond seeded Head Office + 8 divisions is a follow-up.
- Optional policies recommended but not required.
- Wayfinder command name should be confirmed.
- Proposal file `plans/asset_location_divisions_proposal.md` is superseded.

---

## Status: TEMPORARY

This document is held while `asset_location_conflicts.md` is reviewed. Do not implement against this version. After the conflicts are resolved, the final plan will be written to a new file (or this one restored to `asset_location_implementation.md`) with all conflict resolutions folded in.