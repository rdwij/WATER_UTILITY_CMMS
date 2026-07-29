# Asset Locations, Head-Office Divisions, Cost Centers & Assets — Final Implementation Plan (v2)

> **Status**: FINAL — supersedes `asset_location_implementation.md` and `asset_location_implementation.tmp.md`.
> Companion docs:
> - Data migration plan: `plans/asset_location_data_migration_v2.md`
> - Conflicts (resolved): `plans/asset_location_conflicts.md`
> - Original requirements: `plans/asset_location.md`
> - SQL reference: `docs/asset_locations.sql`
> - Divisions proposal (superseded): `plans/asset_location_divisions_proposal.md`

## Context

The Water Utility organization has **two parallel hierarchies under a single Head Office root**, plus a central cost-center catalog, plus asset tracking:

- **Operational tree (5 levels)** — Head Office → **Addl_GM** → RSC → Region → Site (water-delivery operations, Addl_GM sits between Head Office and RSCs to group RSCs by area)
- **Divisions tree (unlimited depth, one type)** — Head Office → Division (HR, Finance, Audit, Tender & Contract, Supply & Materials Management, Planning & Design, Corporate Service, Director Board) → optional sub-division
- **Cost-center catalog** — every Employee, User, Asset, Site, and Sub-Division points at exactly one cost center; internal nodes (Head Office, Addl_GM, RSC, Region, Division top) may be nullable
- **Asset table** — schema + relationships + read-only "Assets under this location" panel on the asset-locations show page. Full Asset CRUD is deferred.

### What already exists in the codebase
- `database/migrations/2026_07_13_145322_create_asset_locations_table.php` creates `asset_locations` with `kalnoy/nestedset` columns (`_lft`, `_rgt`, `parent_id`, `depth`), a `cost_center_id` (declared `unique`), and `asset_location_name`. Missing: `code`, `type`, `branch`, `is_active`, `manager_id`, `description`. Has no `deleted_at` column.
- `app/Models/Asset/AssetLocation.php` uses `Kalnoy\Nestedset\NodeTrait`, but has no `$fillable`, no relationships, no scopes, and a buggy `hasLocationUpper()`.
- No controller, routes, FormRequest, Inertia pages, or sidebar entry exist for asset locations.

### Resolved decisions (locked in for v2)
| Decision | Resolution | Source |
|---|---|---|
| Hierarchy depth | Operational = **5 levels** (Head Office → Addl_GM → RSC → Region → Site). Divisions = unlimited. | User instruction |
| Soft delete | `is_active` boolean flag only — no `SoftDeletes` trait. | prior |
| Cost-center linkage on `asset_locations` | Drop `unique`; many sites → one cost center. | prior |
| `code` format for imported rows | `CC-<zero-padded-cost_center_id>` (e.g. `CC-011000`). Replaces `MIGRATED-XXXXX`. | conflict C-03 |
| Cost-center count from SQL | **107 unique** cost centers (not 99). | conflict C-02 |
| Cross-branch access | Strict isolation in v1. | prior |
| Head Office `cost_center_id` policy | `cost_center_id` left `NULL` for Head Office; `CC-HEAD-001` is a separate cost center for user back-fill. | conflict C-06 |
| M6 cost-center fallback chain | (a) `CC-HEAD-001` → (b) earliest-created `cost_centers` row → abort. | conflict C-07 |
| `code ends 000` validator | Dropped. `type` column classifies rows; code shape is informational. | conflict C-05 |
| Legacy `id` from SQL | Discard; `bigIncrements` assigns fresh. | conflict C-09 |
| `parent_id` in `$fillable` | **Removed** — kalnoy manages tree shape. | conflict C-15 |
| Sidebar name | "Organization" — covers both branches + cost centers + assets. | prior |
| `depth` in fillable | Excluded — kalnoy manages. | conflict C-16 |
| 14 root RSCs from SQL | Attached under default Addl_GM nodes; admin can re-parent. | conflicts C-13 |
| `deleted_at` from SQL | Not imported (column doesn't exist in new schema). | conflict C-12 |
| `manager_id` for imported rows | `null` — to be filled later. | conflict C-10 |

---

## 1. Hierarchy model

```
                              Head Office (head_office, branch=operational, cost_center_id=NULL)
                              │
       ┌──────────────────────┴────────────────────────┐
       │                                               │
   Addl_GM (operational, cost_center_id=NULL)    Divisions tree (branch=division)
       │                                               │
   Addl_GM Node (e.g. "Western Addl_GM")              Division (HR / Finance / Audit / …)
       │                                               │
   RSC  ─ "RSC - Western Production"                  (optional sub-division)
       │
   Region (e.g. "Kandy North Region")
       │
   Site (leaf, MUST have cost_center_id)
```

**Operational levels (5 total)**:
1. `head_office` — single root
2. `addl_gm` — between Head Office and RSCs; groups RSCs by region/area
3. `rsc` — Regional Support Centre
4. `region` — operational region
5. `site` — leaf (water treatment plant, workshop, premises)

**Division levels**: `head_office` → `division` → (unlimited nesting via `division` parent). One type with unlimited depth, as kalnoy enforces.

**Mandatory rules enforced in code (not by enum)**:
- `branch = 'operational'` ⇒ `type ∈ {head_office, addl_gm, rsc, region, site}`
- `branch = 'division'` ⇒ `type ∈ {head_office, division}`
- A `region` or `site` may exist under `addl_gm` only via an `rsc` node in between (i.e. the parent of a `region` is `rsc`, the parent of `rsc` is `addl_gm`).
- `cost_center_id` required on `site` and `division` (leaves of either tree); optional elsewhere.
- Only one `head_office` row (enforced by an index/existence check at seed time).

---

## 2. Migrations (9 total, all non-destructive)

Filenames all use `2026_07_29_*` so they run after the existing `2026_07_13_*` and `2026_07_24_*` migrations. **All conflict resolutions from `asset_location_conflicts.md` are folded into this sequence — see the mapping table at the bottom of this section.**

### M0. `database/migrations/2026_07_29_085000_seed_head_office_root.php`
Data migration. Inserts a single Head Office row at the root using kalnoy's `saveAsRoot()`.
- Idempotent: returns early if any `head_office` row already exists.
- `cost_center_id = NULL`, `branch = 'operational'`, `code = 'HEAD'`, `type = 'head_office'`, `is_active = true`.
- Lands *before* M1 so any FK target can be ready; lands *after* the existing `2026_07_13_*` migrations.

### M1. `database/migrations/2026_07_29_085500_create_cost_centers_table.php`
Mirror `database/migrations/2026_07_24_194521_create_roles_table.php` style.
- `id`, `string code` unique, `string name`, `boolean is_active` default `true`, `timestamps`.

### M-import. `database/migrations/2026_07_29_090000_import_existing_asset_locations.php`
Data migration. Imports the 107 rows from `docs/asset_locations.sql`. Run after M1 so the `cost_centers` table exists, before M2 so the new columns are added after rows are inserted. See companion plan `asset_location_data_migration_v2.md` §3 for details.

### M2. `database/migrations/2026_07_29_090500_enrich_asset_locations_table.php`
Schema migration. Adds columns:
- `type` (`enum('head_office','addl_gm','rsc','region','site','division')`, default `rsc`).
- `branch` (`enum('operational','division')`, default `operational`).
- `code` (`string` unique).
- `description` (`text` nullable).
- `is_active` (`boolean` default `true`).
- `manager_id` (`unsignedBigInteger` nullable, FK→`users.id` `nullOnDelete`).
- Make `cost_center_id` nullable.
- Drop the existing `unique` index on `cost_center_id`.
- Add `foreign('cost_center_id')->references('id')->on('cost_centers')->nullOnDelete()`.
- Add `index('type')`, `index('branch')`, `index('is_active')`.
- Back-fill loop: any row with `code IS NULL` gets `code = 'CC-' . str_pad($cost_center_id, 6, '0', STR_PAD_LEFT)`. No-op after M-import; safety net for empty envs.

### M2b. `database/migrations/2026_07_29_091000_seed_divisions_and_cost_centers.php`
Data migration. Seeds:
- One `CC-HEAD-001` cost center (idempotent on `code`).
- 8 corporate divisions under Head Office: HR, Finance, Audit, Tender & Contract, Supply & Materials Management, Planning & Design, Corporate Service, Director Board. Each has `branch = 'division'`, `type = 'division'`, its own cost center (`CC-DIV-HR-001` etc.).
- `manager_id` is `null` on all seeded rows — admin fills in later.

### M3. `database/migrations/2026_07_29_091500_add_location_and_cost_center_to_users_table.php`
Mirror `database/migrations/2026_07_13_013001_add_role_to_users_table.php` style.
- `$table->foreignId('asset_location_id')->nullable()->after('id')->constrained('asset_locations')->nullOnDelete();`
- `$table->foreignId('cost_center_id')->nullable()->after('asset_location_id')->constrained('cost_centers')->nullOnDelete();`

### M4. `database/migrations/2026_07_29_092000_add_location_and_cost_center_to_employees_table.php`
Same pattern as M3, applied to `employees`.

### M5. `database/migrations/2026_07_29_092500_create_assets_table.php`
- `id`, `asset_location_id` FK→`asset_locations` NOT NULL, `cost_center_id` FK→`cost_centers` NOT NULL, `asset_tag` (string unique), `name` (string), `description` (text nullable), `serial_number` (string nullable), `model_number` (string nullable), `manufacturer` (string nullable), `acquired_at` (date nullable), `status` (`enum('in_service','under_maintenance','retired','disposed')` default `in_service`), `is_active` (boolean default true), `timestamps`.
- Add `index('status')`, `index('asset_location_id')`, `index('cost_center_id')`.

### M6. `database/migrations/2026_07_29_093000_backfill_and_enforce_cost_center_not_null.php`
Data + schema migration. Backfills users/employees to a default cost center, then alters columns to NOT NULL:
1. Try `cost_centers.code = 'CC-HEAD-001'`; if not found, take the lowest-id `cost_centers` row. `abort_unless($default)` if none exists.
2. For every user with `cost_center_id IS NULL`: set it to `$default`.
3. Same for employees.
4. For every asset with `cost_center_id IS NULL`: defensive (none yet) — set to its `assetLocation`'s `cost_center_id` if any, else `$default`.
5. `ALTER TABLE users MODIFY cost_center_id BIGINT UNSIGNED NOT NULL;` (idempotent — only alters if not already NOT NULL).
6. Same for `employees` and `assets`.

### Execution order (fresh DB)
```
M0        085000  seed_head_office_root                       (data)
M1        085500  create_cost_centers_table                   (schema)
M-import  090000  import_existing_asset_locations             (data)   ← 107 cost_centers + 107 asset_locations from SQL
M2        090500  enrich_asset_locations_table                (schema)
M2b       091000  seed_divisions_and_cost_centers             (data)   ← CC-HEAD-001 + 8 divisions
M3        091500  add_location_and_cost_center_to_users       (schema)
M4        092000  add_location_and_cost_center_to_employees   (schema)
M5        092500  create_assets_table                         (schema)
M6        093000  backfill_and_enforce_cost_center_not_null   (data + schema)
```

`php artisan migrate` once after the schema is ready. M0/M1 must run before M-import (FK targets). M2 must run after M-import (so the new columns appear after the rows). M2b must run after M2 (so the new `branch` column exists).

### Conflict → resolution mapping
| Conflict | Resolved by |
|---|---|
| C-01 (M-import ordering) | M-import filename renumbered to `085000`/wait — corrected to `090000` so it slots between M1 (085500) and M2 (090500). |
| C-03 (`code` format) | M2 back-fill now uses `CC-XXXXXX`. |
| C-06 (Head Office cost center) | M0 creates Head Office with `cost_center_id = NULL`. M2b creates `CC-HEAD-001`. |
| C-07 (M6 fallback) | M6 explicitly uses `CC-HEAD-001` → first-imported → abort chain. |
| C-14 (inline duplication of SQL) | M-import reads SQL via `Storage::get('docs/asset_locations.sql')` parsing helper; documented at the top. |
| C-17 (legacy-id-as-cost-center-id invariant) | M-import asserts each row's `id == cost_center_id` and aborts with a clear message otherwise. |
| C-18 (Head Office seeded twice) | M-import's Head Office check uses `code = 'HEAD'`; M0's check uses `type = 'head_office'`. Both idempotent. |

---

## 3. Models

### `app/Models/CostCenter.php` (new)
```php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class CostCenter extends Model
{
    use HasFactory;

    protected $fillable = ['code', 'name', 'is_active'];
    protected $casts = ['is_active' => 'bool'];

    public function assetLocations(): HasMany { return $this->hasMany(AssetLocation::class); }
    public function users(): HasMany             { return $this->hasMany(User::class); }
    public function employees(): HasMany         { return $this->hasMany(Employee::class); }
    public function assets(): HasMany            { return $this->hasMany(Asset::class); }
}
```

### `app/Models/Asset/AssetLocation.php` (full rewrite — preserves namespace)
```php
namespace App\Models\Asset;

use App\Models\Asset;
use App\Models\CostCenter;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Kalnoy\Nestedset\NodeTrait;

class AssetLocation extends Model
{
    use HasFactory, NodeTrait;

    public const BRANCH_OPERATIONAL = 'operational';
    public const BRANCH_DIVISION    = 'division';
    public const BRANCHES = [self::BRANCH_OPERATIONAL, self::BRANCH_DIVISION];

    public const TYPE_HEAD_OFFICE = 'head_office';
    public const TYPE_ADDL_GM     = 'addl_gm';
    public const TYPE_RSC         = 'rsc';
    public const TYPE_REGION      = 'region';
    public const TYPE_SITE        = 'site';
    public const TYPE_DIVISION    = 'division';
    public const TYPES = [
        self::TYPE_HEAD_OFFICE,
        self::TYPE_ADDL_GM,
        self::TYPE_RSC,
        self::TYPE_REGION,
        self::TYPE_SITE,
        self::TYPE_DIVISION,
    ];

    protected $fillable = [
        'asset_location_name',
        'code',
        'type',
        'branch',
        'description',
        'is_active',
        'manager_id',
        'cost_center_id',
        // 'parent_id' and 'depth' intentionally NOT fillable — kalnoy manages
    ];

    protected $casts = ['is_active' => 'bool'];

    public function costCenter(): BelongsTo { return $this->belongsTo(CostCenter::class); }
    public function manager(): BelongsTo    { return $this->belongsTo(User::class, 'manager_id'); }
    public function assets(): HasMany       { return $this->hasMany(Asset::class); }
    public function users(): HasMany        { return $this->hasMany(User::class); }
    public function employees(): HasMany    { return $this->hasMany(Employee::class); }

    public function scopeRoots($q)        { return $q->whereNull('parent_id'); }
    public function scopeOfType($q, $t)  { return $q->where('type', $t); }
    public function scopeOfBranch($q, $b){ return $q->where('branch', $b); }
    public function scopeActive($q)       { return $q->where('is_active', true); }

    public function isHeadOffice(): bool { return $this->type === self::TYPE_HEAD_OFFICE; }
    public function isLeaf(): bool       { return ! $this->children()->exists(); }

    /** Fixed replacement for the buggy hasLocationUpper. */
    public function hasLocationUpper(int $loc_id): bool
    {
        return $this->ancestorsAndSelf()->pluck('id')->contains($loc_id);
    }
}
```

### `app/Models/Asset.php` (new — minimal, in `app/Models/Asset/` namespace already provided for AssetLocation)
- Same shape as in the previous plan: `assetLocation`, `costCenter`, `assets.status` constants.

### `app/Models/User.php` — additions
- Add `'asset_location_id'`, `'cost_center_id'` to the `#[Fillable([...])]` attribute list.
- `assetLocation(): BelongsTo { return $this->belongsTo(AssetLocation::class); }`
- `costCenter(): BelongsTo { return $this->belongsTo(CostCenter::class); }`
- `accessibleAssetLocations(): Builder` (see §4).

### `app/Models/Employee.php` — additions
- Add `'asset_location_id'`, `'cost_center_id'` to `$fillable`.
- `assetLocation(): BelongsTo { return $this->belongsTo(AssetLocation::class); }`
- `costCenter(): BelongsTo { return $this->belongsTo(CostCenter::class); }`

---

## 4. RBAC & Authorization

### Permission keys
Group: `organization` (sister to `settings.view`). Insert into `database/seeders/PermissionSeeder.php` using the same `updateOrCreate(['name' => ...], $permission + ['is_active' => true])` idiom:

```php
['name' => 'organization.view',   'display_name' => 'View Organization',   'group' => 'organization', 'description' => 'See the org tree and individual nodes.'],
['name' => 'organization.create', 'display_name' => 'Create Organization', 'group' => 'organization', 'description' => 'Add new org nodes.'],
['name' => 'organization.edit',   'display_name' => 'Edit Organization',   'group' => 'organization', 'description' => 'Update existing org nodes.'],
['name' => 'organization.delete', 'display_name' => 'Delete Organization', 'group' => 'organization', 'description' => 'Remove org nodes (refused for non-leaves).'],
```

Group: `cost_centers`:
```php
['name' => 'cost_centers.view',   'display_name' => 'View Cost Centers',   'group' => 'cost_centers', 'description' => 'See the cost-center catalog.'],
['name' => 'cost_centers.create', 'display_name' => 'Create Cost Centers', 'group' => 'cost_centers', 'description' => 'Add new cost centers.'],
['name' => 'cost_centers.edit',   'display_name' => 'Edit Cost Centers',   'group' => 'cost_centers', 'description' => 'Update cost centers.'],
['name' => 'cost_centers.delete', 'display_name' => 'Delete Cost Centers', 'group' => 'cost_centers', 'description' => 'Remove cost centers (only if no references).'],
```

### Role grants (in `PermissionRoleSeeder.php`)
- `admin` automatically receives all permissions via `$all`.
- `manager`: add `organization.view`, `organization.create`, `organization.edit`, `cost_centers.view`, `cost_centers.create`, `cost_centers.edit`.
- `supervisor`, `operator`, `viewer`: add `organization.view` and `cost_centers.view` to the existing `readOnly` array.

### `User::accessibleAssetLocations()`
```php
public function accessibleAssetLocations(): \Illuminate\Database\Eloquent\Builder
{
    $q = \App\Models\Asset\AssetLocation::query();
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

### Optional policy
`app/Policies/OrganizationPolicy.php` with `viewAny`, `view`, `create`, `update`, `delete` calling `accessibleAssetLocations()` for view and `hasPermission('organization.X')` for the verbs. Register in `AuthServiceProvider`.

### Cross-branch access (deferred)
Strict isolation in v1. Future enhancement: add `cross_branch_access` boolean on `User` + override in `accessibleAssetLocations()`.

---

## 5. Form Requests

### `app/Http/Requests/OrganizationRequest.php` (renamed from AssetLocationRequest)
Mirrors `app/Http/Requests/EmployeeRequest.php`.

Rules:
```php
'asset_location_name' => ['required', 'string', 'max:150'],
'code'                => ['required', 'string', 'max:50', Rule::unique('asset_locations', 'code')->ignore($this->route('asset_location')?->id)],
'branch'              => ['required', Rule::in(AssetLocation::BRANCHES)],
'type'                => ['required', Rule::in(AssetLocation::TYPES)],
'parent_id'           => ['nullable', 'integer', 'exists:asset_locations,id'],
'cost_center_id'      => ['nullable', 'exists:cost_centers,id', 'required_if:type,site', 'required_if:type,division'],
'manager_id'          => ['nullable', 'exists:users,id'],
'is_active'           => ['boolean'],
'description'         => ['nullable', 'string', 'max:1000'],
```

`withValidator()` business rules (no `code ends 000` — that's dropped per C-05):
- `type=head_office` ⇒ only one allowed (`exists` check).
- `type=site` or `type=division` (leaf) ⇒ `cost_center_id` required (rule already covers this).
- `branch=operational` ⇒ `type` must be one of head_office/addl_gm/rsc/region/site.
- `branch=division` ⇒ `type` must be one of head_office/division.
- If `parent_id` is set, its `branch` must equal the node's `branch` (no mixing).

### `app/Http/Requests/CostCenterRequest.php` (new)
Mirrors `app/Http/Requests/RoleRequest.php`. `code` unique, `name` required, `is_active` bool.

### `app/Http/Requests/AssetRequest.php` (new) — for future use
For now: just a stub file; Asset CRUD is deferred. Required only when Asset CRUD is built.

---

## 6. Controllers

### `app/Http/Controllers/OrganizationController.php` (new)
Mirrors `app/Http/Controllers/EmployeeController.php`.

#### `index(Request $request)`
- Base query: `$request->user()->accessibleAssetLocations()->with(['parent', 'costCenter', 'manager'])`.
- Filters: `search` (matches `asset_location_name`, `code`, `costCenter.code`), `branch`, `type`, `is_active`.
- If `?view=tree`: return `withDepth()->defaultOrder('code')->get()` shape.
- Otherwise: `latest()->paginate(20)->withQueryString()`.
- Return `inertia('organization/index', [...])` with `can` map, `filters`, `branches`, `types`, `costCenters`, `viewMode`.

#### `create(Request $request)`
- `parents`: `$request->user()->accessibleAssetLocations()->whereIn('branch', ['operational'])->get(['id','asset_location_name','code','branch'])` — exclude the current Head Office from selectable parents unless user is admin.
- `branches`: `AssetLocation::BRANCHES`.
- `types`: `AssetLocation::TYPES`.
- `costCenters`: `CostCenter::where('is_active', true)->orderBy('code')->get(['id','code','name'])`.
- `managers`: `User::orderBy('name')->get(['id','name','email'])`.

#### `store(OrganizationRequest $request)`
- `$data = $request->validated();`
- `$node = new AssetLocation($data);`
- If `parent_id` set: `$node->appendToNode(AssetLocation::findOrFail($data['parent_id']))->save();`
- Else: `$node->saveAsRoot();` (only allowed for a single Head Office — controller enforces existence).
- Redirect to `route('organization.index')` with `success` flash.

#### `show(AssetLocation $assetLocation)`
- Authorize via `$request->user()->accessibleAssetLocations()->where('id', $assetLocation->id)->existsOrFail()`.
- Load `$assetLocation->load(['parent','manager','costCenter','children','ancestors','employees.user','users','assets','assets.costCenter'])`.
- Return `inertia('organization/show', [...])`.

#### `edit(AssetLocation $assetLocation)`
- Same as `create` plus `'assetLocation' => $assetLocation->load([...])`.

#### `update(OrganizationRequest $request, AssetLocation $assetLocation)`
- `$data = $request->validated();`
- If `parent_id` changed: `$assetLocation->parent_id = null; $assetLocation->save(); $assetLocation->appendToNode(AssetLocation::findOrFail($data['parent_id']))->save();`
- `$assetLocation->update($data);`
- Redirect to `route('organization.show', $assetLocation)` with `success` flash.

#### `destroy(AssetLocation $assetLocation)`
- If `$assetLocation->children()->exists()`: redirect back with `error` flash ("Cannot delete: has children. Disable instead.").
- Else: `$assetLocation->delete();` then redirect to `index` with `success`.

### `app/Http/Controllers/CostCenterController.php` (new)
Full CRUD mirroring `RoleController`.

### `app/Http/Controllers/AssetController.php` (new — minimal)
Read-only `index` + `show`. CRUD scaffolded but not wired (follow-up).

---

## 7. Routes

In `routes/web.php` inside the existing `auth+verified` middleware group (after `permissions` line 53), add:

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

Route::get('assets',          [AssetController::class, 'index'])->name('assets.index');
Route::get('assets/{asset}',  [AssetController::class, 'show'])->name('assets.show');
```

URL convention: kebab-case `organization`, `cost-centers`, `assets`. Route names: `organization.*`, `assets.*`.

---

## 8. Inertia Pages

All under `resources/js/pages/`. Mirror the `employees/` page structure (table, filters, breadcrumbs, action buttons gated by `can.*`).

### `resources/js/pages/organization/index.tsx`
- Columns: Name, Code, Type (color-coded), Branch, Parent, Cost Center, Manager, Status, Actions.
- Filter form (collapsible): search, branch select, type select, status select, view-mode toggle (table | tree).
- Tree view: `style={{ paddingLeft: depth * 24 }}` and a `CornerDownRight` icon per level. Reuse the same flat component.
- Action buttons gated by `can.{view,edit,delete}`.

### `resources/js/pages/organization/{create,edit}.tsx`
- Fields: name, code, branch (Select from `branches`), type (Select from `types`), parent_id (Select from `parents`), cost_center_id (Select from `costCenters`), manager_id (Select from `managers`), is_active (Checkbox), description (Textarea).
- Branch ↔ type: when branch changes, the type list filters to valid options for that branch.

### `resources/js/pages/organization/show.tsx`
- Hero block: name + code + type badge + branch badge + active/inactive badge.
- Breadcrumbs from `ancestors`, e.g. `Head Office → Operations → Western Production Addl_GM → RSC - Western Production → Kethhena WTP`.
- Cards: Definition, Cost Center, Manager, Addl_GM/RSC/Region/Parent hierarchy, Plus a **Children** table.
- **Assets panel**: read-only `Table` of assets at this node (paginated 10).

### `resources/js/pages/cost-centers/{index,create,edit,show}.tsx`
Mirror `roles/` pages. Filters: search, is_active.

### `resources/js/pages/assets/{index,show}.tsx`
Read-only. Columns: tag, name, assetLocation (breadcrumb), costCenter.code, status, acquired_at, actions.

---

## 9. Sidebar Entry

In `resources/js/components/app-sidebar.tsx`, after the `// --- Employees` block, add:

```ts
function buildOrganizationNav(user): NavItem[] {
    if (
        user?.permissions?.includes('organization.view') ||
        user?.permissions?.includes('organization.create')
    ) {
        return [{
            title: 'Organization',
            href: '#',
            icon: MapPin,
            children: [
                user?.permissions?.includes('organization.view') && {
                    title: 'All Nodes', href: organization.index(), icon: Network,
                },
                user?.permissions?.includes('organization.view') && {
                    title: 'Cost Centers', href: costCenters.index(), icon: DollarSign,
                },
                user?.permissions?.includes('organization.create') && {
                    title: 'New Node', href: organization.create(), icon: Plus,
                },
                user?.permissions?.includes('assets.view') && {
                    title: 'Assets', href: assets.index(), icon: Wrench,
                },
            ].filter(Boolean) as NavItem[],
        }];
    }
    return [];
}
```

Plus imports: `MapPin, Network, DollarSign, Wrench`, `* as organization`, `* as costCenters`, `* as assets` from the generated routes. Push the result into `items`.

---

## 10. Wayfinder Routes

After routes are registered, run `php artisan wayfinder:generate`. The command generates:
- `resources/js/routes/organization/index.ts` (named: `index`, `create`, `store`, `show`, `edit`, `update`, `destroy`)
- `resources/js/routes/cost-centers/index.ts` (resource-named)
- `resources/js/routes/assets/{index,show}.ts`

Confirm the exact command name against `vendor/laravel/wayfinder/src/Commands/` before running.

---

## 11. Factories

- `database/factories/CostCenterFactory.php` (`code` unique, `name`, `is_active`).
- `database/factories/AssetLocationFactory.php` (`type`, `branch`, `is_active`, optional `parent_id` via kalnoy).
- `database/factories/HeadOfficeFactory.php` (calls `saveAsRoot()`).
- `database/factories/AssetFactory.php` (`asset_tag` unique, `name`, `status`).
- Patch `database/factories/UserFactory.php` to include `asset_location_id` and `cost_center_id`.

---

## 12. Tests (Pest 4)

`tests/Feature/Admin/OrganizationTest.php` — comprehensive coverage of the new tree:
1. Admin sees the full tree regardless of assignment.
2. Site user sees only their own site.
3. Region user sees region + child sites.
4. RSC user sees RSC + descendants.
5. Addl_GM user sees Addl_GM + all descendants (now skipping down to the leaves).
6. Head Office user sees everything (org-wide).
7. Create appends to a parent without breaking `_lft/_rgt/depth`.
8. Reassign parent updates the tree.
9. Branch cross-parenting is denied (e.g. trying to nest a `region` under a `division`).
10. Delete on a non-leaf returns an error.
11. Permission enforcement on POST/PUT/DELETE.
12. `is_active` toggle hides nodes in the index filter.
13. Type-specific validator rules (site requires cost_center, head_office single-instance).
14. **Specific to Addl_GM**: test that a new `region` cannot be created directly under `addl_gm` (must go via `rsc`).

`tests/Feature/Admin/CostCenterTest.php`:
1. Create/update/delete Catalog.
2. Code uniqueness.
3. Back-fill produces correct total (107 + 1 + 8 = 116 cost-centers after a fresh DB run with SQL data).
4. Fallback logic in M6 (mock `CC-HEAD-001` absent → uses earliest).

`tests/Feature/Admin/AssetTest.php` (stub for now — CRUD not in scope).

`tests/Feature/Admin/UserEmployeeCostCenterTest.php`:
1. M6 back-fill populates empty user/employee `cost_center_id` to Head Office CC.
2. Validation: trying to create a user/employee without `cost_center_id` fails after M6.

---

## 13. Implementation Order

1. **Migrations** in filename order: M0 → M1 → M-import → M2 → M2b → M3 → M4 → M5 → M6.
   - For empty envs: M-import is a no-op (returns early when no SQL data is found on disk).
   - For SQL-imported envs: M-import populates 107 cost-centers + 107 asset-locations.
2. **Models**: `CostCenter.php` → `AssetLocation.php` (full rewrite) → `Asset.php` (minimal) → patch `User.php` and `Employee.php`.
3. **Seeders**: extend `PermissionSeeder.php` (8 new permissions) and `PermissionRoleSeeder.php` (role grants).
4. **Factories**.
5. **FormRequests**: `OrganizationRequest`, `CostCenterRequest`, `AssetRequest` (stub).
6. **Controllers**: `OrganizationController`, `CostCenterController`, `AssetController` (minimal).
7. **Routes** in `routes/web.php`.
8. **Wayfinder regen** (`php artisan wayfinder:generate`).
9. **Inertia pages**: `organization/{index,create,edit,show}.tsx`, `cost-centers/{index,create,edit,show}.tsx`, `assets/{index,show}.tsx`.
10. **Sidebar** entry in `app-sidebar.tsx`.
11. **Tests** in `tests/Feature/Admin/`.
12. **Validation**: `composer test`, `npm run types:check`, `npm run lint:check`, `npm run build`.

---

## 14. Critical Files to Modify

- `database/migrations/2026_07_13_145322_create_asset_locations_table.php` — referenced only; M2 is a separate migration.
- 9 new migrations under `database/migrations/2026_07_29_*.php`.
- `app/Models/Asset/AssetLocation.php` — full rewrite.
- `app/Models/CostCenter.php` (new).
- `app/Models/Asset.php` (new, minimal).
- `app/Models/User.php` — add `assetLocation()`, `costCenter()`, `accessibleAssetLocations()` and the `cost_center_id`/`asset_location_id` to `#[Fillable([...])]`.
- `app/Models/Employee.php` — add to `$fillable` and add the two relationships.
- `app/Http/Requests/OrganizationRequest.php` (new).
- `app/Http/Requests/CostCenterRequest.php` (new).
- `app/Http/Requests/AssetRequest.php` (new, stub).
- `app/Http/Controllers/OrganizationController.php` (new).
- `app/Http/Controllers/CostCenterController.php` (new).
- `app/Http/Controllers/AssetController.php` (new, minimal).
- `app/Policies/OrganizationPolicy.php` (new — optional but recommended).
- `app/Providers/AuthServiceProvider.php` — register the policy (optional).
- `routes/web.php` — register `organization.*` and `cost-centers` resource and `assets.*`.
- `database/seeders/PermissionSeeder.php` — add 8 new permissions.
- `database/seeders/PermissionRoleSeeder.php` — add grants to manager/supervisor/operator/viewer.
- `database/factories/CostCenterFactory.php` (new).
- `database/factories/AssetLocationFactory.php` (new).
- `database/factories/HeadOfficeFactory.php` (new).
- `database/factories/AssetFactory.php` (new).
- `database/factories/UserFactory.php` — add 2 fillable keys.
- `resources/js/pages/organization/{index,create,edit,show}.tsx`.
- `resources/js/pages/cost-centers/{index,create,edit,show}.tsx`.
- `resources/js/pages/assets/{index,show}.tsx`.
- `resources/js/components/app-sidebar.tsx` — add the Organization block.
- `tests/Feature/Admin/OrganizationTest.php` (new).
- `tests/Feature/Admin/CostCenterTest.php` (new).
- `tests/Feature/Admin/AssetTest.php` (new, basic).
- `tests/Feature/Admin/UserEmployeeCostCenterTest.php` (new).

## 15. Existing Patterns to Reuse

- `app/Http/Controllers/EmployeeController.php` — full CRUD pattern, `can` map shape (lines 56-61), pagination, lookup for `create`/`edit`.
- `app/Http/Requests/EmployeeRequest.php` — FormRequest conventions; the unique-on-update trick at line 25 with `request()->route('...')?->id`.
- `app/Models/User.php` — `hasPermission()`, `hasAllPermission()`, `hasAnyRole()` helpers; PHP-attribute `#[Fillable([...])]` style.
- `app/Models/Employee.php` — `belongsTo`/`hasMany` relationship style.
- `database/seeders/PermissionSeeder.php` — `updateOrCreate(['name' => ...], $permission + ['is_active' => true])` idiom.
- `database/seeders/PermissionRoleSeeder.php` — `$all`/`$readOnly`/`$grants` map; `Role::permissions()->sync(...)` for idempotency.
- `resources/js/pages/employees/{index,create,edit,show}.tsx` — page structure, breadcrumbs, `useForm`, Inertia table layout.
- `resources/js/components/app-sidebar.tsx` — `buildNavItems(user)` pattern; permission gating per item.
- `kalnoy/nestedset`'s `NodeTrait` — `parent()`, `children()`, `ancestors()`, `descendants()`, `ancestorsAndSelf()`, `appendToNode()`, `saveAsRoot()`, `withDepth()`, `defaultOrder()`, `fixSubtree()`.

## 16. Verification

End-to-end manual smoke test (after `composer test` and lint/type/build all pass):

1. `php artisan migrate:fresh --seed`
2. `npm run build`
3. `php artisan serve` + open the app, log in as `admin@example.test`.
4. Sidebar → **Organization** → confirm a 5-level tree: Head Office → Addl_GM → RSC → Region → Site.
5. Switch to **Cost Centers** sub-item — confirm seeded cost centers are listed (116 in SQL-imported env, 9 in empty env).
6. Create: Addl_GM → RSC → Region → Site. Confirm depth increments correctly and `_lft/_rgt` look right.
7. Edit: change a site's parent — confirm breadcrumb updates.
8. Delete: try to delete a Region — confirm refusal flash.
9. Asset panel on a Site's show page.
10. Log in as a non-admin user assigned to a single site; confirm scoped access.
11. Validation:
   - Create a `region` with no parent → should fail (must be under an `rsc`).
   - Create a `region` directly under `addl_gm` → should fail (parent of region must be rsc).
   - Create a `site` without `cost_center_id` → should fail.
   - Cross-branch parenting (operational under division) → should fail.
12. `composer test` — all Pest tests pass.
13. Run validation snippet (data-migration §6) and confirm 116 cost centers, 8 divisions, tree integrity.

---

## 17. Risks / Out of Scope

- **Asset CRUD is not in this slice** — only schema, relationships, and a read-only panel. Asset CRUD is a follow-up.
- **Cross-branch access** not supported in v1.
- **AssetLocation fixture data beyond seeded Head Office + 8 divisions** is a follow-up. M-import seeds the SQL data on import-ready envs.
- **Optional policy** recommended but not required; controllers' inline `hasPermission` checks are equivalent.
- **Wayfinder command name** should be confirmed.
- The 14 imported root RSCs land under a **default Addl_GM node named "Operations"** (created by M-import as a sibling category). Admins may re-parent them under more specific Addl_GM nodes after running M-import; that's not in the migration.
- **Addl_GM clustering** — the data has 14 root RSCs that could be clustered into several Addl_GM nodes (e.g. by geographic area: Western, Northern, Central, etc.). The migration creates a single "Operations" Addl_GM by default; grouping is an admin task.

---

## 18. Status

This is the **final** plan for v2. All 20 conflicts identified in `asset_location_conflicts.md` are resolved — see §2 for the per-conflict mapping.