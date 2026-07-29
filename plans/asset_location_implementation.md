# Asset Locations, Head-Office Divisions, Cost Centers & Assets — Unified Implementation Plan

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

This is the query controllers use for `index`, the `parents` lookup in `create`/`edit`, and the `show`/`update`/`destroy` authorization checks. Strict branch isolation is enforced by the fact that an operational user can only be assigned to an operational node, and a division user only to a division node — the helper scopes to their subtree, which lives entirely on one branch.

### Cross-branch access (deferred)
No cross-branch support in v1. Future enhancement: add `cross_branch_access` boolean on the `User` model + a corresponding override in `accessibleAssetLocations()`.

### Optional policy
`app/Policies/OrganizationPolicy.php` with `viewAny`, `view`, `create`, `update`, `delete` calling `accessibleAssetLocations()` for `viewAny`/`view` and `$user->hasPermission('organization.X')` for the verbs. Register in `AuthServiceProvider`. Skip if it slows the slice — controller-level checks via `hasPermission` are equivalent.

---

## 4. Form Request

### `app/Http/Requests/OrganizationRequest.php` (new — note rename)
Mirrors `app/Http/Requests/EmployeeRequest.php`. The resource is the organization tree.

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

For `code` uniqueness on update, use `'unique:asset_locations,code,'.($this->route('asset_location')?->id ?? '0')` — same shape as `EmployeeRequest::rules()`.

`authorize()` returns `true`.

Add `withValidator()`:
- `type=head_office` → `parent_id` must be null; only one row with `type=head_office` allowed (check via `AssetLocation::where('type', 'head_office')->count()` in the rule or app-level).
- `type in (rsc, region, site)` → `branch` must equal `operational`.
- `type=division` → `branch` must equal `division`.
- `type=rsc` → `code` must end in `000`.
- `type in (site, division leaf)` → `cost_center_id` is required.

### `app/Http/Requests/CostCenterRequest.php` (new)
Mirrors `app/Http/Requests/RoleRequest.php` (minimal):
- `code` required, string, unique (excluding self on update).
- `name` required, string.
- `is_active` boolean.

### `app/Http/Requests/AssetRequest.php` (new)
Mirrors `EmployeeRequest` shape. Required only for the future Asset CRUD — define the skeleton now so the FormRequest pattern is documented.

---

## 5. Controllers

### `app/Http/Controllers/OrganizationController.php` (new — note rename from `AssetLocationController`)
Mirrors `app/Http/Controllers/EmployeeController.php` (its `can` map shape at lines 56-61, pagination, lookups for `create`/`edit`).

**`index(Request $request)`**
- Base query: `$request->user()->accessibleAssetLocations()->with(['parent', 'costCenter', 'manager'])`.
- Filters: `search` (matches `asset_location_name`, `code`, `costCenter.code`), `type`, `branch`, `is_active`.
- If `?view=tree`: return `withDepth()->defaultOrder('code')->get()` shape (`tree` prop, with `_lft/_rgt/depth` so the frontend can indent).
- Otherwise: `latest()->paginate(20)->withQueryString()`.
- Return `inertia('organization/index', [...])` with `can` map, `filters`, `types`, `branches`, `costCenters`, `viewMode`.

**`create()`**
- `parents`: rows the user can attach under, filtered by their subtree and by branch/type rules. For an operational RSC user → all `region` rows under their RSC; for a division user → rows in their division subtree; for a Head Office user → all roots (operational RSCs and divisions). Site users see no parents (must be promoted).
- `costCenters`: `CostCenter::where('is_active', true)->orderBy('code')->get(['id','code','name'])`.
- `managers`: `User::orderBy('name')->get(['id','name','email'])`.
- `types`: `AssetLocation::TYPES`.
- `branches`: `AssetLocation::BRANCHES`.

**`store(OrganizationRequest $request)`**
- `$data = $request->validated();`
- `$node = new AssetLocation($data);`
- If `parent_id` set: `$parent = AssetLocation::findOrFail($data['parent_id']); $node->appendToNode($parent)->save();`
- Else: `$node->saveAsRoot();` (only admin can do this — FormRequest and controller should both guard).
- Redirect to `route('organization.index')` with `success` flash.

**`show(AssetLocation $assetLocation)`**
- Authorize via `$request->user()->accessibleAssetLocations()->where('id', $assetLocation->id)->existsOrFail()`.
- Load `$assetLocation->load(['parent', 'manager', 'costCenter', 'children', 'ancestors', 'employees.user', 'users', 'assets', 'assets.costCenter'])`.
- Return `inertia('organization/show', [...])` — the show page also embeds an "Assets" panel using the read-only list of `$assetLocation->assets`.

**`edit(AssetLocation $assetLocation)`**
- Same as `create` plus `'assetLocation' => $assetLocation->load(['parent','costCenter','manager'])`.

**`update(OrganizationRequest $request, AssetLocation $assetLocation)`**
- `$data = $request->validated();`
- If `parent_id` changed: detach then reattach using `$assetLocation->parent_id = null; $assetLocation->save(); $assetLocation->appendToNode($parent)->save();` (kalnoy's safe pattern).
- `$assetLocation->update($data);`
- Redirect to `route('organization.show', $assetLocation)` with `success` flash.

**`destroy(AssetLocation $assetLocation)`**
- If `$assetLocation->children()->exists()`: redirect back with `error` flash ("Cannot delete: has children. Disable instead.").
- Otherwise `$assetLocation->delete();` and redirect to `index` with `success`.

### `app/Http/Controllers/CostCenterController.php` (new)
Full CRUD mirroring `OrganizationController`. Resource name `cost-centers`. Mirrors `RoleController` shape — simpler since no tree.

### `app/Http/Controllers/AssetController.php` (new — minimal)
For this slice, the controller is **read-only**. The action `index` and `show` provide data, but `create`/`store`/`edit`/`update`/`destroy` are scaffolded but not wired (return 404 or "coming soon"). A future slice can complete the CRUD using the same pattern as `OrganizationController`. The show page of an asset-location will embed the read-only `assets.index` data via the relationship loaded in `OrganizationController::show()`.

---

## 6. Routes

In `routes/web.php` after the existing `permissions` block (line 53), inside the `auth+verified` group:

```php
// Organization tree (asset_locations)
Route::prefix('organization')->name('organization.')->group(function () {
    Route::get('',                       [OrganizationController::class, 'index'])->name('index');
    Route::get('create',                 [OrganizationController::class, 'create'])->name('create');
    Route::post('',                      [OrganizationController::class, 'store'])->name('store');
    Route::get('{asset_location}',       [OrganizationController::class, 'show'])->name('show');
    Route::get('{asset_location}/edit',  [OrganizationController::class, 'edit'])->name('edit');
    Route::put('{asset_location}',       [OrganizationController::class, 'update'])->name('update');
    Route::delete('{asset_location}',    [OrganizationController::class, 'destroy'])->name('destroy');
});

// Cost Centers
Route::resource('cost-centers', CostCenterController::class);

// Assets (read-only in this slice)
Route::get('assets', [AssetController::class, 'index'])->name('assets.index');
Route::get('assets/{asset}', [AssetController::class, 'show'])->name('assets.show');
```

URL convention: kebab-case `organization`, `cost-centers`, `assets`. Route names: `organization.*`, `cost-centers.*`, `assets.*`.

---

## 7. Inertia Pages

All under `resources/js/pages/`. Mirror the `employees/` pages line-for-line.

### `resources/js/pages/organization/index.tsx`
- Columns: Name, Code, Type (color-coded badge by type), Branch (operational/division badge), Parent, Cost Center, Manager, Status, Actions.
- Filter form: search, type select, branch select, status select, view-mode toggle (table | tree).
- **Tree view mode**: render `withDepth()` output as a list with `style={{ paddingLeft: depth * 24 }}` and a `CornerDownRight` icon per level. Group by branch visually (operational first, then divisions, both under the Head Office row).
- Action buttons (gated by `can.*`): View (`eye`), Edit (`pencil`), Delete (`trash`).
- "New Node" CTA gated by `can.create`.

### `resources/js/pages/organization/create.tsx`
- Fields: `asset_location_name` (Input), `code` (Input, with hint to end in `000` for RSC), `branch` (Select), `type` (Select that filters by branch), `parent_id` (Select, fetched from `parents`), `cost_center_id` (Select, required for `site`/`division` leaf), `manager_id` (Select, optional), `is_active` (Checkbox), `description` (Textarea).
- `useForm({...defaults})` then `post(route('organization.store'))`.
- Breadcrumbs: Organization → New.

### `resources/js/pages/organization/edit.tsx`
- Same fields as `create`, populated from `assetLocation`.
- `_method: 'put' as const` in `useForm`, `post(route('organization.update', id))`.
- Breadcrumbs: Organization → `{name}` → Edit.

### `resources/js/pages/organization/show.tsx`
- Hero block: name + code + branch badge + type badge + active/inactive badge.
- Breadcrumbs built from `ancestors` (Head Office → RSC → Region → Site, or Head Office → HR Division → Sub-division).
- Cards: Definition (name/code/type/branch/description/is_active), Cost Center, Manager.
- **Children Table**: direct children with type/branch badges.
- **Assets Panel**: read-only table of `assets` belonging to this location with columns Asset Tag, Name, Status, Acquired At. Header has "View all assets in subtree" link to `assets.index` filtered by branch.
- **Employees & Users side panel**: count + link to a future filtered employees view.

### `resources/js/pages/cost-centers/{index,create,edit,show}.tsx`
Mirror `resources/js/pages/roles/` (since Role CRUD is the simplest existing pattern).

### `resources/js/pages/assets/{index,show}.tsx`
Read-only list and detail. Mirror the `employees/index.tsx` table but drop the action buttons (no CRUD in this slice). Add a "Filter by Location" select.

### UI components used (all in `resources/js/components/ui/`)
`Button`, `Input`, `Label`, `Textarea`, `Select`, `Checkbox`, `Table*`, `Badge`, `Card`.

---

## 8. Sidebar Entry

In `resources/js/components/app-sidebar.tsx`:

1. Add imports:
   - `import * as organization from '@/routes/organization';`
   - `import * as costCenters from '@/routes/cost-centers';`
   - `import * as assets from '@/routes/assets';`
   - `import { Building2, Network, Plus, MapPin, Wallet, Package } from 'lucide-react';`
2. After the `// --- Employees` block, add two parallel blocks inside `buildNavItems(user)`:

```ts
// --- Organization (asset locations + divisions)
if (
    user?.permissions?.includes('organization.view') ||
    user?.permissions?.includes('organization.create')
) {
    items.push({
        title: 'Organization',
        href: '#',
        icon: Building2,
        children: [
            user?.permissions?.includes('organization.view') && {
                title: 'All Nodes',
                href: organization.index(),
                icon: Network,
            },
            user?.permissions?.includes('organization.create') && {
                title: 'New Node',
                href: organization.create(),
                icon: Plus,
            },
            user?.permissions?.includes('cost_centers.view') && {
                title: 'Cost Centers',
                href: costCenters.index(),
                icon: Wallet,
            },
        ].filter(Boolean) as NavItem[],
    });
}

// --- Assets
if (user?.permissions?.includes('organization.view')) {
    items.push({
        title: 'Assets',
        href: assets.index(),
        icon: Package,
    });
}
```

---

## 9. Wayfinder Routes

After the routes are registered, run:

```bash
php artisan wayfinder:generate
```

(Confirm exact command name against `vendor/laravel/wayfinder/src/Commands/`.) This produces:
- `resources/js/routes/organization/index.ts`
- `resources/js/routes/cost-centers/index.ts`
- `resources/js/routes/assets/index.ts`

No manual route file creation needed — just import the namespaces as shown in §8.

---

## 10. Factories

New factories for tests + seeders:

- `database/factories/CostCenterFactory.php` — generates `code`, `name`, `is_active`.
- `database/factories/AssetLocationFactory.php` — accepts `parent` and `type`/`branch` overrides; uses kalnoy's `createAsChildOf($parent)` to attach.
- `database/factories/HeadOfficeFactory.php` — wraps `AssetLocationFactory` with `type=head_office`, `parent_id=null`, `saveAsRoot`.
- `database/factories/AssetFactory.php` — generates `asset_tag`, `name`, `status`, `is_active`, plus valid `asset_location_id` and `cost_center_id` from a parent factory state.

Update existing factories:
- `database/factories/UserFactory.php` — add `asset_location_id` and `cost_center_id` to its definition (use the Head Office defaults if not overridden).

---

## 11. Tests

Create `tests/Feature/Admin/OrganizationTest.php`, `tests/Feature/Admin/CostCenterTest.php`, `tests/Feature/Admin/AssetTest.php` (Pest 4, in-memory SQLite).

Pattern: mirror `tests/Feature/DashboardTest.php` for the bare `actingAs`/`get(route(...))` shape.

### OrganizationTest cases
1. **Guests redirected** to login on `organization.index`.
2. **Admin sees all** nodes in `index` regardless of assignment.
3. **Site user sees only their own site** (no ancestors, no siblings, no other sites).
4. **Region user sees their region + child sites** but not other regions.
5. **Division user (HR Manager) sees their division + child sub-divisions** but not operational data.
6. **RSC user sees RSC + all operational descendants** but not division data.
7. **Head Office user sees the entire tree** (both branches).
8. **Create updates `_lft/_rgt`** — POST to `store` with `parent_id`; assert `parent->children->count === 1` and the child's `_lft` is between `parent->_lft` and `parent->_rgt`, with `depth === parent->depth + 1`.
9. **Reassign parent updates tree** — change `parent_id` on update; assert `_lft/_rgt` recalculated.
10. **Delete with children is refused** — `destroy` returns redirect with `error` flash.
11. **Permission enforcement** — without `organization.create`, POST returns 403.
12. **Type-specific validation** — RSC `code` not ending `000` fails; `site` without `cost_center_id` fails; `division` `branch` mismatch fails; second `head_office` creation is blocked.
13. **Cost-center linkage** — every user/employee created through fixtures has `cost_center_id` NOT NULL after the migration.

### CostCenterTest cases
1. CRUD (create, view, edit, delete) for the catalog.
2. Cost-center can be linked from many asset locations (no unique constraint).

### AssetTest cases
1. Read-only `index` and `show` work.
2. Asset always requires `cost_center_id` and `asset_location_id`.

---

## 12. Implementation Order

1. **Migrations**: M0 → M1 → M2 → M2b → M3 → M4 → M5 → M6. Run `php artisan migrate` locally between each to confirm FK validity.
2. **Models**: `CostCenter.php` → `AssetLocation.php` (full rewrite) → `Asset.php` (new) → patch `User.php` and `Employee.php`.
3. **Seeders**: extend `PermissionSeeder.php` (new `organization.*` + `cost_centers.*` permissions) and `PermissionRoleSeeder.php` (new grants); run `php artisan db:seed` (idempotent via `updateOrCreate` + `sync`).
4. **Factories**: `CostCenterFactory`, `AssetLocationFactory`, `HeadOfficeFactory`, `AssetFactory`. Patch `UserFactory` to include the new FKs.
5. **FormRequests**: `OrganizationRequest`, `CostCenterRequest`, `AssetRequest`.
6. **Controllers**: `OrganizationController`, `CostCenterController`, `AssetController` (minimal read-only).
7. **Routes** in `routes/web.php`.
8. **Wayfinder regen** (`php artisan wayfinder:generate`).
9. **Inertia pages**: `organization/{index,create,edit,show}.tsx`, `cost-centers/{index,create,edit,show}.tsx`, `assets/{index,show}.tsx`.
10. **Sidebar** entry in `app-sidebar.tsx`.
11. **Tests** `tests/Feature/Admin/{OrganizationTest,CostCenterTest,AssetTest}.php`.
12. **Validation**: `composer test`, `npm run types:check`, `npm run lint:check`, `npm run build`.

---

## Critical Files to Modify

**New (created by this slice)**
- `database/migrations/2026_07_28_085500_seed_head_office_root.php`
- `database/migrations/2026_07_28_090000_create_cost_centers_table.php`
- `database/migrations/2026_07_28_090100_enrich_asset_locations_table.php`
- `database/migrations/2026_07_28_090150_seed_divisions_and_cost_centers.php`
- `database/migrations/2026_07_28_090200_add_location_and_cost_center_to_users_table.php`
- `database/migrations/2026_07_28_090300_add_location_and_cost_center_to_employees_table.php`
- `database/migrations/2026_07_28_090400_create_assets_table.php`
- `database/migrations/2026_07_28_090500_backfill_and_enforce_cost_center_not_null.php`
- `app/Models/CostCenter.php`
- `app/Models/Asset.php`
- `app/Http/Requests/OrganizationRequest.php`
- `app/Http/Requests/CostCenterRequest.php`
- `app/Http/Requests/AssetRequest.php`
- `app/Http/Controllers/OrganizationController.php`
- `app/Http/Controllers/CostCenterController.php`
- `app/Http/Controllers/AssetController.php`
- `app/Policies/OrganizationPolicy.php` (optional but recommended)
- `app/Policies/CostCenterPolicy.php` (optional but recommended)
- `app/Providers/AuthServiceProvider.php` (register policies)
- `resources/js/pages/organization/{index,create,edit,show}.tsx`
- `resources/js/pages/cost-centers/{index,create,edit,show}.tsx`
- `resources/js/pages/assets/{index,show}.tsx`
- `database/factories/CostCenterFactory.php`
- `database/factories/AssetLocationFactory.php`
- `database/factories/HeadOfficeFactory.php`
- `database/factories/AssetFactory.php`
- `tests/Feature/Admin/OrganizationTest.php`
- `tests/Feature/Admin/CostCenterTest.php`
- `tests/Feature/Admin/AssetTest.php`

**Modified**
- `app/Models/Asset/AssetLocation.php` — full rewrite (see §2)
- `app/Models/User.php` — add `assetLocation()`, `costCenter()`, `accessibleAssetLocations()`, update `$fillable`
- `app/Models/Employee.php` — add `assetLocation()`, `costCenter()`, update `$fillable`
- `database/factories/UserFactory.php` — add `asset_location_id` + `cost_center_id`
- `routes/web.php` — register `organization.*`, `cost-centers.*`, `assets.*` resource routes
- `database/seeders/PermissionSeeder.php` — add `organization.*` + `cost_centers.*` permissions
- `database/seeders/PermissionRoleSeeder.php` — add new grants to admin/manager/readOnly lists
- `resources/js/components/app-sidebar.tsx` — add Organization + Assets nav entries

**Referenced but unchanged**
- `database/migrations/2026_07_13_145322_create_asset_locations_table.php` — M2 is a separate migration that enriches the table created here.

---

## Existing Patterns to Reuse

- `app/Http/Controllers/EmployeeController.php` — full CRUD pattern, `can` map shape (lines 56-61), pagination, lookups for `create`/`edit` (lines 1-170).
- `app/Http/Controllers/RoleController.php` — simpler CRUD for the CostCenter controller (since CostCenter has no tree).
- `app/Http/Requests/EmployeeRequest.php` — FormRequest conventions; the unique-on-update trick at line 25.
- `app/Http/Requests/RoleRequest.php` — minimal FormRequest for CostCenter.
- `app/Models/Employee.php` — `belongsTo`/`hasMany` relationships, `$fillable` style, `SoftDeletes` (note: do not adopt SoftDeletes for AssetLocation).
- `database/seeders/PermissionSeeder.php` — `updateOrCreate(['name' => ...], $permission + ['is_active' => true])` idiom.
- `database/seeders/PermissionRoleSeeder.php` — the `$grants` map and `readOnly`/`manager` arrays.
- `resources/js/pages/employees/{index,create,edit,show}.tsx` — page structure, breadcrumbs, useForm, Inertia table layout.
- `resources/js/pages/roles/{index,create,edit,show}.tsx` — simpler page structure for CostCenter.
- `resources/js/components/app-sidebar.tsx` — `buildNavItems(user)` permission gating pattern.
- `kalnoy/nestedset`'s `NodeTrait` — `parent()`, `children()`, `ancestors()`, `descendants()`, `ancestorsAndSelf()`, `appendToNode()`, `saveAsRoot()`, `withDepth()`, `defaultOrder()`.

---

## Verification

End-to-end manual smoke test (after `composer test` and the lint/type/build checks pass):

1. `php artisan migrate:fresh --seed`
2. `npm run build`
3. `php artisan serve` + open the app, log in as `admin@example.test`.
4. Sidebar → **Organization** → confirm tree renders Head Office with two branches: operational (RSC → Region → Site) and divisions (HR, Finance, Audit, Tender & Contract, Supply & Materials Management, Planning & Design, Corporate Service, Director Board).
5. Switch to **Cost Centers** sub-item — confirm seeded cost centers are listed.
6. **Create**: add an RSC (`code` ending `000`, no parent) → add a Region under it → add a Site under the Region with a cost center assigned. Repeat for a new division (e.g. "Legal") under Head Office.
7. **Edit**: change a site's parent to a different region; reload show page and confirm breadcrumb reflects the new path.
8. **Delete**: try to delete a region — confirm refusal flash. Set `is_active = false` on the region instead and confirm it disappears from the default index filter.
9. **Assets panel** on the Site's show page — confirm an empty Assets table with the "View all assets in subtree" link.
10. Open the Users page (existing feature) — confirm `admin@example.test` has a non-null `asset_location_id` (Head Office) and `cost_center_id` (Head Office cost center).
11. Log in as a non-admin user assigned to a single site; confirm `organization.index` shows only that site, the **Assets** nav item is hidden, and **Cost Centers** sub-item is gated.
12. `composer test` — all Pest tests pass.

---

## Risks / Out of Scope

- **Full Asset CRUD** is deferred to a follow-up. This slice ships the schema, model, factory, and a read-only `index`/`show` for assets (visible as a panel on the organization show page).
- **Cross-branch access** is not supported in v1. Strict subtree isolation is enforced via `accessibleAssetLocations()`.
- **`AssetLocationSeeder` fixture data** beyond the seeded Head Office + 8 divisions is left to a follow-up once the schema stabilizes.
- The optional `OrganizationPolicy` / `CostCenterPolicy` are recommended but not required; controller-level `hasPermission` checks are equivalent.
- Wayfinder command name should be confirmed against `vendor/laravel/wayfinder/src/Commands/` before running.
- The proposal file at `plans/asset_location_divisions_proposal.md` is now superseded by this plan and can be archived or deleted.