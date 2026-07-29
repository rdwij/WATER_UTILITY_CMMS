# Asset Locations — Data Migration Plan (Temporary — Pending Conflict Resolution)

> **TEMPORARY MARKER**: This is the existing data-migration plan. It is being held while conflicts identified in `asset_location_conflicts.md` are resolved. Do not run the migrations against this document until the conflicts document is closed out and the data-migration plan is rewritten (likely `asset_location_data_migration_v2.md`) with all conflict resolutions folded in. The conflict analysis has surfaced inconsistencies with the unified implementation plan (`asset_location_implementation.md`) and with `docs/asset_locations.sql`. See that document for the full list.

## 0. TL;DR

`docs/asset_locations.sql` (phpMyAdmin dump dated 2026-07-13) contains **107 rows** of real asset-location data in a 3-level hierarchy. The migration plan needs:

1. A new data-import migration `M-import` (placed **after M1** because the `cost_centers` table must exist first) that ingests the 107 rows from the SQL file using kalnoy's `appendToNode()` / `saveAsRoot()` — preserving the existing `_lft/_rgt/parent_id` tree shape.
2. M2b must seed the 8 corporate divisions under Head Office after M-import succeeds.
3. A concrete `code` mapping for every imported row, derived from the existing `cost_center_id`.

The final implementation order (subject to conflict resolution) is:

```
M0        085500  seed_head_office_root                       (data)   — no-op if M-import runs
M1        090000  create_cost_centers_table                   (schema)
M-import  085600  import_existing_asset_locations             (data)   — 99 CCs + 107 ALs from SQL
M2        090100  enrich_asset_locations_table                (schema)
M2b       090150  seed_divisions_and_cost_centers             (data)   — Head Office CC + 8 divisions
M3        090200  add_location_and_cost_center_to_users       (schema)
M4        090300  add_location_and_cost_center_to_employees   (schema)
M5        090400  create_assets_table                         (schema)
M6        090500  backfill_and_enforce_cost_center_not_null   (data + schema)
```

> **⚠ Open: ordering.** M-import is timestamped `085600` which sorts BEFORE `M0 (085500)` lexicographically by date prefix — but Laravel orders migrations by **full filename string**, so the actual run order on a fresh DB would be: M0 → M-import → M1 → M2 → M2b → M3 → M4 → M5 → M6. This means M-import runs **before M1**, against a `cost_centers` table that doesn't exist yet. This is a HARD conflict — see `asset_location_conflicts.md` C-01.

---

## 1. Analysis of `docs/asset_locations.sql`

### 1.1 Schema (from the SQL dump)

```sql
CREATE TABLE `asset_locations` (
  `id` bigint UNSIGNED NOT NULL,
  `_lft` int UNSIGNED NOT NULL DEFAULT '0',
  `_rgt` int UNSIGNED NOT NULL DEFAULT '0',
  `parent_id` int UNSIGNED DEFAULT NULL,
  `cost_center_id` bigint NOT NULL,
  `asset_location_name` varchar(255),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL
);

ALTER TABLE `asset_locations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `asset_locations_cost_center_id_unique` (`cost_center_id`),
  ADD KEY `asset_locations__lft__rgt_parent_id_index` (`_lft`,`_rgt`,`parent_id`);
```

Differences from the current Laravel migration (`2026_07_13_145322_create_asset_locations_table.php`):
- SQL has `deleted_at` (soft deletes) — Laravel migration does **not**.
- SQL has `cost_center_id bigint NOT NULL`; Laravel matches.
- The SQL index name is `asset_locations__lft__rgt_parent_id_index` (kalnoy's default).
- No `code`, `type`, `branch`, `is_active`, `manager_id`, `description` columns exist.

**Implication:** the SQL dump is from a slightly different schema than what the Laravel migration creates — it has `deleted_at`. Recommendation: **(b) Import without `deleted_at`** because the SQL data has no rows where `deleted_at IS NOT NULL`. The `is_active` boolean covers the soft-disable case in v1.

### 1.2 Row-by-row classification

| parent_id | count | description |
|---|---|---|
| `NULL` | 14 | Root RSCs |
| 1 | 15 | Children of "RSC - Western Production" (RSC id=1) |
| 7 | 1 | "Kandy North Region" — child of "RSC - Central" |
| 10 | 32 | Children of "RSC - North West" |
| 15 | 1 | "Kethhena WTP" — child of "Manager - Kandana WTP" (depth-4 anomaly) |
| 21 | 1 | "Bambukuliya WTP" |
| 24 | 18 | Children of "Manager - Kurunegala" |
| 49 | 6 | Children of "Kandy North Region" |
| 58 | 7 | Children of "Manager - Puttalam" |
| 67 | 22 | Children of "Manager - Anuradhapura" |
| 89 | 13 | Children of "Manager - Polonnaruwa" |
| 104 | 3 | Children of "RSC - GC WR" |

Total: 107 rows. Tree depth ranges from 1 (RSC root) to 4 (Kethhena WTP).

> **⚠ Open: depth-4 case.** Kethhena WTP is at depth 4 (RSC → Manager - Kandana WTP → Kethhena). The unified plan assumes a 3-level hierarchy (RSC → Region → Site). Decision deferred — see `asset_location_conflicts.md` C-04.

### 1.3 Classification by inferred `type`

The SQL file has no `type` column. Rules:
- `parent_id IS NULL` AND `asset_location_name LIKE 'RSC%'` → `type = 'rsc'`
- `parent_id IS NULL` (without RSC prefix) → `type = 'rsc'` (safety: any root is an RSC)
- `asset_location_name LIKE 'Manager%'` OR `LIKE 'Workshop%'` (when nested) → `type = 'region'`
- Otherwise → `type = 'site'`

### 1.4 Cost-center ID distribution

107 unique `cost_center_id` values across 107 rows. The legacy `UNIQUE` constraint was satisfied. The unique constraint is dropped in M2.

### 1.5 Cost-center catalog inference

Each `cost_center_id` becomes one `cost_centers` row. 99 unique cost centers will be created (107 rows, but the dump uses some cost_center_ids in only one row each; re-count: actually **107 unique** IDs, one per row). Wait — see `asset_location_conflicts.md` C-02: the data migration document gives inconsistent counts (claims 99 unique cost centers in §0 and §1.5 but shows 107 unique IDs in §1.4). The actual count from the SQL data is **107 unique cost_center_id values** (one per row), not 99.

Each cost-center gets:
- `code` = `CC-<zero-padded-cost_center_id>` (e.g. `CC-011000`)
- `name` = the `asset_location_name` of the row
- `is_active` = `true`

### 1.6 RSC code analysis — `cost_center_id` values ending in `000`

| `cost_center_id` | Name | Is RSC? |
|---|---|---|
| 1000, 2000, 3000, 4000, 5000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000 | RSC - … | ✓ (13 RSCs) |
| 4300 | Kandy North Region | ✗ — ends in `000` but is a region |

The implementation plan's `withValidator()` says `type=rsc → code must end in 000`. This rule conflicts with the 4300 case (a region whose code ends in 000). Recommendation: relax to "for new entries, RSC `code` must end in 000; existing imported data is exempt". See `asset_location_conflicts.md` C-05.

### 1.7 Tree integrity check

The dump's `_lft/_rgt` values look correct. The import rebuilds the tree via kalnoy's `appendToNode()` based on `parent_id` — fresh, consistent values.

---

## 2. Revised migration order

> **⚠ Reordered for conflict resolution (see C-01):**

```
M0        085500  seed_head_office_root                       (data)
M1        090000  create_cost_centers_table                   (schema)
M-import  090050  import_existing_asset_locations             (data)   ← NEW order
M2        090100  enrich_asset_locations_table                (schema)
M2b       090150  seed_divisions_and_cost_centers             (data)
M3        090200  add_location_and_cost_center_to_users       (schema)
M4        090300  add_location_and_cost_center_to_employees   (schema)
M5        090400  create_assets_table                         (schema)
M6        090500  backfill_and_enforce_cost_center_not_null   (data + schema)
```

The exact filename `2026_07_28_090050_import_existing_asset_locations.php` is proposed to slot between M1 (schema for `cost_centers`) and M2 (enrich `asset_locations`).

---

## 3. New migration: `M-import` (import existing asset_locations data)

### 3.1 Purpose

Read the 107-row payload from `docs/asset_locations.sql`, create 107 `cost_centers` rows, create 107 `asset_locations` rows preserving the parent-child tree (with the new `code`/`type`/`branch`/`is_active` columns populated), and rebuild `_lft/_rgt/depth` via kalnoy.

### 3.2 File location and naming

`database/migrations/2026_07_28_090050_import_existing_asset_locations.php`

### 3.3 Code sketch

```php
<?php

use App\Models\Asset\AssetLocation;
use App\Models\CostCenter;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {

    private const LEGACY_ROWS = [
        // [parent_cost_center_id_or_null, cost_center_id, asset_location_name, type]
        [null, 11000, 'RSC - Western Production', 'rsc'],
        // ... (107 rows; see §3.3 of original document)
    ];

    public function up(): void
    {
        if (AssetLocation::withoutEvents(fn () => AssetLocation::count()) > 0) {
            return; // already imported (idempotent)
        }

        $headOffice = AssetLocation::firstOrCreate(
            ['code' => 'HEAD'],
            ['asset_location_name' => 'Head Office', 'type' => 'head_office', 'branch' => 'operational', 'is_active' => true]
        );
        if ($headOffice->getKey() === null) {
            $headOffice->saveAsRoot();
        }

        $byCcId = [];

        DB::transaction(function () use (&$byCcId, $headOffice) {
            foreach (self::LEGACY_ROWS as [$parentCcId, $ccId, $name, $type]) {
                $cc = CostCenter::firstOrCreate(
                    ['code' => 'CC-' . str_pad((string) $ccId, 6, '0', STR_PAD_LEFT)],
                    ['name' => $name, 'is_active' => true]
                );

                $node = AssetLocation::create([
                    'asset_location_name' => $name,
                    'code'                => 'CC-' . str_pad((string) $ccId, 6, '0', STR_PAD_LEFT),
                    'type'                => $type,
                    'branch'              => 'operational',
                    'is_active'           => true,
                    'cost_center_id'      => $cc->id,
                    'manager_id'          => null,
                    'description'         => null,
                ]);
                $byCcId[$ccId] = $node;
            }

            foreach (self::LEGACY_ROWS as [$parentCcId, $ccId, $name, $type]) {
                if ($parentCcId === null) {
                    $node = $byCcId[$ccId];
                    $node->appendToNode($headOffice)->save();
                } else {
                    $parent = $byCcId[$parentCcId] ?? null;
                    if (! $parent) {
                        throw new \RuntimeException("Parent cost_center_id {$parentCcId} not found for {$name} ({$ccId}).");
                    }
                    $byCcId[$ccId]->appendToNode($parent)->save();
                }
            }

            $headOffice->reload();
            $headOffice->fixSubtree();
            $headOffice->save();
        });
    }

    public function down(): void
    {
        AssetLocation::where('code', 'like', 'CC-%')->delete();
        CostCenter::where('code', 'like', 'CC-%')->delete();
    }
};
```

(Full 107-row array retained from the original document.)

### 3.4 Code mapping rationale

| Source column | New column | Logic |
|---|---|---|
| `id` (legacy) | discarded | Fresh ids assigned by `bigIncrements`. |
| `parent_id` (legacy) | discarded → recomputed from `parent_cost_center_id` | Tree reconstructed from SQL data. |
| `cost_center_id` (legacy int) | `cost_centers.code = "CC-<padded>"` | Stable identifier. |
| `asset_location_name` | `asset_location_name` | Verbatim. |
| (inferred) | `type` | `rsc`/`region`/`site` per §1.3. |
| (inferred) | `branch` | `'operational'` for all 107. |
| (literal) | `is_active = true` | None retired. |
| (literal) | `manager_id = null` | Filled later. |
| (literal) | `description = null` | Not in legacy data. |

### 3.5 Idempotency

Checks `AssetLocation::count() > 0` and returns. Running twice = no change.

### 3.6 What this migration does NOT do

- Does NOT create the 8 corporate divisions (M2b).
- Does NOT add new columns to existing schema (M2).
- Does NOT touch `users` or `employees` (M3/M4/M6).

### 3.7 Failure modes & mitigations

| Failure | Mitigation |
|---|---|
| FK violation in M2 because some imported `cost_center_id` doesn't exist in `cost_centers` | Impossible — M-import creates the cost center first. |
| Tree integrity broken after import | `DB::transaction()` + `$headOffice->fixSubtree()`. |
| Duplicate `code` | `firstOrCreate` on cost center code; if any collision, throws. |
| Kalnoy's `_lft/_rgt` not refreshed | Explicit `fixSubtree()` call. |
| **`type` for row id=15 (`Manager - Kandana WTP`) has children** | Inferred as `region` per §1.3 — kalnoy allows regions to have site children. No issue. |
| **Row id=104 (`RSC - GC WR`) is a root but the legacy schema never re-parented** | M-import attaches it under Head Office. |

---

## 4. Updated plan for the remaining migrations

### 4.1 M0 (seed_head_office_root) — conditional
```php
public function up(): void
{
    if (AssetLocation::where('type', 'head_office')->exists()) {
        return;
    }
    $root = new AssetLocation([
        'asset_location_name' => 'Head Office',
        'code'                => 'HEAD',
        'type'                => 'head_office',
        'branch'              => 'operational',
        'is_active'           => true,
    ]);
    $root->saveAsRoot();
}
```

> **⚠ Open: cost_center_id for Head Office.** Head Office is created with no cost_center. M2b seeds a dedicated `CC-HEAD-001` cost center after M-import. Some implementations also want Head Office to have a cost_center_id. Decision pending — see C-06.

### 4.2 M2 (enrich_asset_locations_table) — back-fill logic
After M-import runs, no rows are missing `code`. Back-fill loop is a no-op for SQL-imported envs; kept for safety in empty envs.

### 4.3 M2b (seed_divisions_and_cost_centers) — refactored
- Skip if cost-center code already exists.
- Create `CC-HEAD-001` (Head Office cost center).
- Create 8 corporate-service divisions under Head Office.
- Each division gets its own cost center (`CC-DIV-HR-001` etc.).

### 4.4 M6 (backfill_and_enforce_cost_center_not_null) — fallback updated
```php
$headOfficeCc = DB::table('cost_centers')->where('code', 'CC-HEAD-001')->value('id');
if (! $headOfficeCc) {
    $headOfficeCc = DB::table('cost_centers')->orderBy('id')->value('id');
}
abort_unless($headOfficeCc, 'No cost centers exist.');
```

> **⚠ Open: M6 cost-center fallback chain.** The implementation plan says fallback is "Head Office cost center". The data-migration plan says fallback can be "first imported cost center". These are two different semantics — see `asset_location_conflicts.md` C-07.

---

## 5. Final execution order

```bash
php artisan migrate
# Internally runs:
#   M0        → inserts Head Office (or skipped if M-import created it)
#   M1        → creates cost_centers table
#   M-import  → imports 107 cost centers + 107 asset locations, fixes tree
#   M2        → adds new columns to asset_locations, adds FKs, drops unique
#   M2b       → seeds Head Office cost center + 8 corporate divisions
#   M3        → adds asset_location_id + cost_center_id to users (nullable)
#   M4        → adds asset_location_id + cost_center_id to employees (nullable)
#   M5        → creates assets table
#   M6        → back-fills cost_center_id, enforces NOT NULL
```

If env has no SQL data: M-import is no-op, M0 creates Head Office, M2b creates divisions, M6 back-fills users/employees.

---

## 6. Updated validation commands

```bash
php artisan tinker

# 1. Confirm Head Office exists
> \App\Models\Asset\AssetLocation::where('code','HEAD')->count();       // 1

# 2. Confirm 107 operational rows imported (or 0 in empty env)
> \App\Models\Asset\AssetLocation::where('code','like','CC-%')->count(); // 107 (or 0)

# 3. Confirm 8 corporate divisions exist
> \App\Models\Asset\AssetLocation::where('type','division')->count();    // 8

# 4. Confirm cost-center catalog
> \App\Models\CostCenter::count();                                  // 107 + 1 + 8 = 116 (with import) or 9 (empty)

# 5. Tree integrity
> $r = \App\Models\Asset\AssetLocation::where('code','HEAD')->first();
> $r->fixSubtree();
> $r->save();
> \App\Models\Asset\AssetLocation::withDepth()->defaultOrder()->get(['id','code','_lft','_rgt','depth','parent_id'])->each(fn($n) => print(str_repeat('  ', $n->depth).$n->code.PHP_EOL));

# 6. Spot-check the deepest branch
> \App\Models\Asset\AssetLocation::where('code','CC-011116')->first()->ancestors()->pluck('code');
// => ['CC-011000', 'CC-011108', 'CC-011116']   (RSC → Manager - Kandana WTP → Kethhena WTP)

# 7. Confirm every user/employee has cost_center_id
> \App\Models\User::whereNull('cost_center_id')->count();           // 0
> \App\Models\Employee::whereNull('cost_center_id')->count();      // 0

# 8. Tests still pass
php artisan test
```

> **⚠ Validation discrepancy: cost-center count.** §0 and §1.5 of this document say 99 cost centers will be imported; the SQL data has 107 unique `cost_center_id` values; the validation step expects 107 + 1 + 8 = 116. This is a self-inconsistency within the data-migration document — see `asset_location_conflicts.md` C-02.

---

## 7. Open questions

1. `code` format for imported asset-locations — proposed: `CC-<zero-padded-cost_center_id>`. Accept?
2. Should the legacy `id` be preserved? I propose **discard**.
3. `Kethhena WTP` depth-4 — collapse or keep? I recommend **keep**.
4. `cost_center_id = 4300` ("Kandy North Region" ends `000`) — keep as `region` or promote to `rsc`? Recommend **keep as region**.
5. `asset_location_name` typo "Nothern RSC" — keep or fix? Recommend **keep**.
6. `asset_location_name` extra-space anomalies — keep or normalize? Recommend **keep**.
7. The 14 root RSCs attach under Head Office? Recommend **attach**.
8. `deleted_at` column — skip SoftDeletes? Recommend **skip**.

---

## 8. Cross-references

- Unified implementation plan: `plans/asset_location_implementation.md` (currently `.tmp.md` — held pending conflict resolution)
- Original proposal: `plans/asset_location_divisions_proposal.md` (superseded)
- Original requirements: `plans/asset_location.md`
- SQL dump: `docs/asset_locations.sql`
- **Conflicts document: `plans/asset_location_conflicts.md`** (read this first before resolving any open question)

---

## Status: TEMPORARY

This document is held while `asset_location_conflicts.md` is reviewed. Do not run the migrations against this version.