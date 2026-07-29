# Asset Locations — Data Migration Plan (Final — v2)

> **Status**: FINAL — supersedes `asset_location_data_migration.md` and `asset_location_data_migration.tmp.md`.
> Companion docs:
> - Implementation plan: `plans/asset_location_implementation_v2.md`
> - Conflicts (resolved): `plans/asset_location_conflicts.md`
> - Original requirements: `plans/asset_location.md`
> - SQL reference: `docs/asset_locations.sql`
> - Divisions proposal (superseded): `plans/asset_location_divisions_proposal.md`

## 0. TL;DR

`docs/asset_locations.sql` (phpMyAdmin dump dated 2026-07-13) contains **107 rows** of real asset_location data in a hierarchy up to 4 levels deep. The migration plan needs:

1. A new data-import migration **M-import** that ingests the 107 rows from the SQL file using kalnoy's `appendToNode()` / `saveAsRoot()`, preserving the tree shape. **Run after M1 (cost_centers table exists) and before M2 (new columns appear).**
2. The 14 legacy root RSCs are attached under a new **Addl_GM layer** that the migration creates between Head Office and the RSCs.
3. 107 cost-centers are created with stable codes derived from the SQL `cost_center_id` values.
4. M2b seeds the **8 corporate divisions** under Head Office and a Head Office cost center after M-import succeeds.

### Final migration order (fresh DB)
```
M0        085000  seed_head_office_root                       (data)
M1        085500  create_cost_centers_table                   (schema)
M-import  090000  import_existing_asset_locations             (data)   ← 107 CCs + 107 ALs + 1 Addl_GM
M2        090500  enrich_asset_locations_table                (schema)
M2b       091000  seed_divisions_and_cost_centers             (data)   ← CC-HEAD-001 + 8 divisions
M3        091500  add_location_and_cost_center_to_users       (schema)
M4        092000  add_location_and_cost_center_to_employees   (schema)
M5        092500  create_assets_table                         (schema)
M6        093000  backfill_and_enforce_cost_center_not_null   (data + schema)
```

Empty-env run: M-import returns early (no SQL file → no data); M0 creates Head Office; M2b creates the 8 corporate divisions and `CC-HEAD-001`. M6 back-fills users/employees.

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
  `asset_location_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL
);

ALTER TABLE `asset_locations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `asset_locations_cost_center_id_unique` (`cost_center_id`),
  ADD KEY `asset_locations__lft__rgt_parent_id_index` (`_lft`,`_rgt`,`parent_id`);
```

Differences from the target Laravel schema (final plan §1 M2):
- SQL has `deleted_at` — target schema does **not**. **Skip `deleted_at`** (C-12 — no rows have `deleted_at IS NOT NULL`).
- SQL has `cost_center_id bigint NOT NULL` — final M2 makes it nullable.
- SQL index name `asset_locations__lft__rgt_parent_id_index` matches kalnoy's default — nothing to remap.
- SQL has no `code`, `type`, `branch`, `is_active`, `manager_id`, `description` columns — M2 adds them.

### 1.2 Row-by-row classification

| `parent_id` | count | description |
|---|---|---|
| `NULL` | 14 | Root RSCs (parent: Addl_GM Node after import) |
| 1 | 15 | Children of "RSC - Western Production" (id=1) |
| 7 | 1 | "Kandy North Region" — child of "RSC - Central" (id=7) |
| 10 | 32 | Children of "RSC - North West" (id=10) |
| 15 | 1 | "Kethhena WTP" — child of "Manager - Kandana WTP" (id=15) |
| 21 | 1 | "Bambukuliya WTP" — child of "Manager - Biyagama WTP" |
| 24 | 18 | Children of "Manager - Kurunegala" |
| 49 | 6 | Children of "Kandy North Region" |
| 58 | 7 | Children of "Manager - Puttalam" |
| 67 | 22 | Children of "Manager - Anuradhapura" |
| 89 | 13 | Children of "Manager - Polonnaruwa" |
| 104 | 3 | Children of "RSC - GC WR" |

**Total: 107 rows.** Max tree depth: **4** (RSC → Manager Region → Site, or RSC → Region → Manager - Kandana WTP → Kethhena WTP — the depth-4 anomaly).

### 1.3 Inferred `type` for each row
SQL has no `type` column. Rules:
- `parent_id IS NULL` AND `asset_location_name LIKE 'RSC%'` → `rsc`
- `parent_id IS NULL` (any other) → `rsc` (safety: any root is an RSC)
- `asset_location_name LIKE 'Manager%'` OR `LIKE 'Workshop%'` (when nested) → `region`
- Otherwise → `site`

### 1.4 Cost-center ID distribution
**107 unique `cost_center_id` values across 107 rows** (one per row; resolve C-02). All IDs are integer multiples of 100 except for some — see §1.6.

### 1.5 Cost-center catalog inference
Each `cost_center_id` becomes one `cost_centers` row. After full migration with SQL data:
- **107** imported cost centers (`CC-011000`, `CC-011108`, …)
- **1** Head Office cost center (`CC-HEAD-001`)
- **8** division cost centers (`CC-DIV-HR-001`, …)
- **Total = 116 cost centers** in a fully-imported env, or **9** in an empty env.

Each cost-center gets:
- `code = 'CC-' . str_pad($cost_center_id, 6, '0', STR_PAD_LEFT)` → e.g. `CC-011000`
- `name = $row->asset_location_name` verbatim
- `is_active = true`

### 1.6 RSC code analysis — `cost_center_id` values ending in `000`
| `cost_center_id` | Name | Inferred type |
|---|---|---|
| 1000, 2000, 3000, 4000, 5000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000 | RSC - … | `rsc` |
| 4300 | Kandy North Region | `region` (despite ending `000`) |

The implementation's `withValidator()` rule "RSC code ends 000" is **dropped** (C-05). Code shape is informational only.

### 1.7 Tree integrity check
Dump's `_lft/_rgt` values look consistent. M-import rebuilds the tree via kalnoy's `appendToNode()` based on `parent_id` and `appendToNode(Head Office's Addl_GM)` for the 14 roots. Tree integrity verified by `fixSubtree()` after import.

### 1.8 Legacy `id` vs `cost_center_id` invariant
**Critical observation**: every row in the SQL dump satisfies `id == cost_center_id` (e.g. id=1 ↔ cost_center_id=11000 — wait, **not** equal). Verifying:
- Row id=1 has `cost_center_id=11000` — id ≠ cost_center_id
- Row id=15 has `cost_center_id=11108` — id ≠ cost_center_id

**Conclusion**: ids and cost-center-ids are **independent**, but `parent_id` always references the legacy `id` (e.g. row id=49 has `parent_id=7`, not `parent_id=4000`). M-import must look up parents by the legacy `id`, NOT by `cost_center_id` (closes C-17).

---

## 2. Revised migration order (final)

```
M0        085000  seed_head_office_root                       (data)
M1        085500  create_cost_centers_table                   (schema)
M-import  090000  import_existing_asset_locations             (data)   ← NEW: between M1 and M2
M2        090500  enrich_asset_locations_table                (schema)
M2b       091000  seed_divisions_and_cost_centers             (data)
M3        091500  add_location_and_cost_center_to_users       (schema)
M4        092000  add_location_and_cost_center_to_employees   (schema)
M5        092500  create_assets_table                         (schema)
M6        093000  backfill_and_enforce_cost_center_not_null   (data + schema)
```

Filename `2026_07_29_090000_import_existing_asset_locations.php` slots cleanly between M1 and M2.

---

## 3. M-import implementation

### 3.1 Purpose
Read the 107-row payload from `docs/asset_locations.sql`, create 107 `cost_centers` rows, create a single `Addl_GM` row (`type = 'addl_gm'`, `branch = 'operational'`, `code = 'OPERATIONS'`) under Head Office, then create 107 `asset_locations` rows under the appropriate parent — preserving the legacy tree shape.

### 3.2 File location and naming
`database/migrations/2026_07_29_090000_import_existing_asset_locations.php`

### 3.3 Code sketch

```php
<?php

use App\Models\Asset\AssetLocation;
use App\Models\CostCenter;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

return new class extends Migration {

    /**
     * Parse a phpMyAdmin `INSERT INTO asset_locations (...) VALUES
     * (...), (...);` dump from disk at runtime. This avoids duplicating
     * the row data inside the migration class — the SQL file is the
     * single source of truth. If the SQL file is missing or empty,
     * the migration is a no-op (handy for empty-env development).
     */
    private function loadLegacyRows(): array
    {
        $path = base_path('docs/asset_locations.sql');
        if (! is_readable($path)) {
            return [];
        }

        $sql = file_get_contents($path);

        // Find the VALUES clause of `INSERT INTO asset_locations (...) VALUES (...)`.
        if (! preg_match('/INSERT\s+INTO\s+`asset_locations`\s*\([^)]*\)\s*VALUES\s*(.*?);/si', $sql, $m)) {
            return [];
        }

        $valuesClause = $m[1];

        // Match each parenthesized row tuple.
        preg_match_all('/\(([^)]*)\)/', $valuesClause, $rowMatches);

        $rows = [];
        foreach ($rowMatches[1] as $tuple) {
            // sql_quoted_strings and ints
            $parts = [];
            $cursor = 0;
            $length = strlen($tuple);
            while ($cursor < $length) {
                if ($tuple[$cursor] === "'") {
                    // SQL-escape '' for a single quote
                    $end = strpos($tuple, "'", $cursor + 1);
                    while ($end !== false && $tuple[$end + 1] === "'") {
                        $end = strpos($tuple, "'", $end + 2);
                    }
                    $parts[] = str_replace("''", "'", substr($tuple, $cursor + 1, $end - $cursor - 1));
                    $cursor = $end + 2;
                } else {
                    $end = strpos($tuple, ',', $cursor) ?: $length;
                    $value = trim(substr($tuple, $cursor, $end - $cursor));
                    $parts[] = $value === 'NULL' ? null : $value;
                    $cursor = $end + 1;
                }
            }
            // Pad to 9 fields (some rows have fewer trailing fields).
            $parts = array_pad(array_map(
                fn ($p) => $p === null ? null : (is_string($p) && ctype_digit($p) ? (int) $p : $p),
                $parts
            ), 9, null);

            [
                $legacyId, $lft, $rgt, $parentId, $costCenterId,
                $name, $createdAt, $updatedAt, $deletedAt,
            ] = array_pad($parts, 9, null);
            if ($deletedAt !== null) {
                continue; // Respect SQL soft-delete marker even though we don't carry the column.
            }
            $rows[] = compact('legacyId', 'parentId', 'costCenterId', 'name');
        }
        return $rows;
    }

    private function inferType(array $row, bool $isRoot): string
    {
        if ($isRoot) return 'rsc';
        $name = $row['name'];
        if (str_starts_with($name, 'Manager') || str_starts_with($name, 'Workshop')) return 'region';
        return 'site';
    }

    public function up(): void
    {
        if (AssetLocation::withoutEvents(fn () => AssetLocation::count()) > 0) {
            return; // already imported — idempotent
        }

        $rows = $this->loadLegacyRows();
        if (empty($rows)) {
            return; // no SQL → empty-env no-op
        }

        $headOffice = AssetLocation::firstOrCreate(
            ['code' => 'HEAD'],
            [
                'asset_location_name' => 'Head Office',
                'type'                => 'head_office',
                'branch'              => 'operational',
                'is_active'           => true,
            ],
        );
        if (! $headOffice->exists) {
            $headOffice->saveAsRoot();
        }

        // Create the single default Addl_GM node.
        $addlGm = AssetLocation::firstOrCreate(
            ['code' => 'OPERATIONS'],
            [
                'asset_location_name' => 'Operations (Addl_GM)',
                'type'                => 'addl_gm',
                'branch'              => 'operational',
                'is_active'           => true,
                'manager_id'          => null,
                'cost_center_id'      => null,
            ],
        );
        if (! $addlGm->exists || $addlGm->parent_id === null) {
            $addlGm->appendToNode($headOffice)->save();
        }

        $byLegacyId = [];

        DB::transaction(function () use ($rows, $addlGm, &$byLegacyId) {
            // Phase 1: create all nodes (cost-centers + asset_locations).
            foreach ($rows as $row) {
                CostCenter::firstOrCreate(
                    ['code' => 'CC-' . str_pad((string) $row['costCenterId'], 6, '0', STR_PAD_LEFT)],
                    ['name' => $row['name'], 'is_active' => true],
                );
            }

            foreach ($rows as $row) {
                $code = 'CC-' . str_pad((string) $row['costCenterId'], 6, '0', STR_PAD_LEFT);
                $costCenter = CostCenter::firstOrCreate(
                    ['code' => $code],
                    ['name' => $row['name'], 'is_active' => true],
                );
                $isRoot = $row['parentId'] === null;
                $node = AssetLocation::create([
                    'asset_location_name' => $row['name'],
                    'code'                => $code,
                    'type'                => $this->inferType($row, $isRoot),
                    'branch'              => 'operational',
                    'is_active'           => true,
                    'cost_center_id'      => $costCenter->id,
                    'manager_id'          => null,
                    'description'         => null,
                ]);
                $byLegacyId[$row['legacyId']] = $node;
            }

            // Phase 2: build parent links via legacy ids (closes C-17).
            foreach ($rows as $row) {
                $node = $byLegacyId[$row['legacyId']];
                if ($row['parentId'] === null) {
                    $node->appendToNode($addlGm)->save();
                } else {
                    $parent = $byLegacyId[$row['parentId']] ?? null;
                    if (! $parent) {
                        throw new \RuntimeException(
                            "Parent legacy id {$row['parentId']} not found for legacy id {$row['legacyId']} ({$row['name']})."
                        );
                    }
                    $node->appendToNode($parent)->save();
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
        AssetLocation::where('code', 'OPERATIONS')->delete();
        CostCenter::where('code', 'like', 'CC-%')->delete();
    }
};
```

### 3.4 Code mapping rationale

| Source column | New column | Logic |
|---|---|---|
| `id` (legacy) | discarded | Fresh ids by `bigIncrements`. Used internally as `$byLegacyId` key. |
| `parent_id` (legacy) | computed | Re-parented at runtime from `$byLegacyId`. |
| `cost_center_id` | `cost_centers.code = 'CC-<padded>'` | Stable identifier; 107 unique codes. |
| `asset_location_name` | `asset_location_name` | Verbatim (incl. "Nothern RSC" typo — C-11, deferred to admin). |
| (inferred) | `type` | `rsc` (root) / `region` (Manager/Workshop nested) / `site` otherwise. |
| (literal) | `branch = 'operational'` | All 107 are operational. |
| (literal) | `is_active = true` | None retired. |
| (literal) | `manager_id = null` | Filled later. |
| (literal) | `description = null` | Not in legacy data. |

### 3.5 Addl_GM treatment (new — answers user's instruction)
- M-import creates a single `Addl_GM` row named **"Operations (Addl_GM)"** (`type='addl_gm'`, `code='OPERATIONS'`) under Head Office.
- All 14 legacy root RSCs are appended under this Addl_GM node.
- After migration, admins may create more Addl_GM nodes and re-parent RSCs into more granular groups (e.g. by geography). This is an admin task, not part of the migration.

### 3.6 Idempotency
```php
if (AssetLocation::withoutEvents(fn () => AssetLocation::count()) > 0) {
    return;
}
```
Running twice = no change.

### 3.7 What M-import does NOT do
- Does NOT create the 8 corporate divisions (M2b).
- Does NOT add new columns to existing schema (M2).
- Does NOT touch `users` or `employees` (M3/M4/M6).

### 3.8 Failure modes & mitigations

| Failure | Mitigation |
|---|---|
| SQL file missing on disk | Returns empty array — M-import is a no-op in empty envs. |
| SQL file parses 0 rows | Same — no-op. |
| Parent legacy id not found for a row | Throws `RuntimeException` with a clear message; the transaction rolls back. |
| FK violation in M2 because `cost_center_id` doesn't exist | Impossible — M-import creates each cost center before the asset_location row that references it. |
| Tree integrity broken after import | `$headOffice->fixSubtree()` at end. |
| Kalnoy `_lft/_rgt` not refreshed | Same fix-up. |
| Duplicate `code` | `firstOrCreate` on `cost_centers.code`; `unique` on `asset_locations.code` enforced by schema. |

---

## 4. Updates to the other migrations

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
        'cost_center_id'      => null, // ← C-06
    ]);
    $root->saveAsRoot();
}
```

If M-import creates Head Office first (code `HEAD`), M0's no-op kick in.

### 4.2 M2 (enrich_asset_locations_table) — back-fill loop
After M-import runs, no rows are missing `code`. The back-fill loop in M2 is a no-op for SQL-imported envs; safety net for empty envs.

### 4.3 M2b (seed_divisions_and_cost_centers) — refactored
- `CC-HEAD-001` cost center — created if not exists (used by M6 fallback).
- 8 corporate divisions under Head Office — each with `branch='division'`, `type='division'`, its own cost center (`CC-DIV-HR-001`, etc.).

### 4.4 M6 (backfill_and_enforce_cost_center_not_null) — fallback chain
```php
$defaultCc = \DB::table('cost_centers')->where('code', 'CC-HEAD-001')->value('id');
if (! $defaultCc) {
    // Safety net (C-07): use first-imported cost-center.
    $defaultCc = \DB::table('cost_centers')->orderBy('id')->value('id');
}
abort_unless($defaultCc, 'No cost centers exist. Cannot back-fill users/employees.');

// Update users.
\DB::table('users')->whereNull('cost_center_id')->update(['cost_center_id' => $defaultCc]);
// Update employees.
\DB::table('employees')->whereNull('cost_center_id')->update(['cost_center_id' => $defaultCc]);
// Update assets (none expected yet).
\DB::table('assets')->whereNull('cost_center_id')->update([
    'cost_center_id' => $defaultCc,
]);

// Then alter columns to NOT NULL (idempotent).
\DB::statement('ALTER TABLE users MODIFY cost_center_id BIGINT UNSIGNED NOT NULL');
\DB::statement('ALTER TABLE employees MODIFY cost_center_id BIGINT UNSIGNED NOT NULL');
\DB::statement('ALTER TABLE assets MODIFY cost_center_id BIGINT UNSIGNED NOT NULL');
```

---

## 5. Final execution order

```bash
php artisan migrate
# Internally runs:
#   M0        → inserts Head Office (or skipped if M-import created it)
#   M1        → creates cost_centers table
#   M-import  → parses docs/asset_locations.sql, creates 107 cost centers,
#               1 Addl_GM ("Operations"), 107 asset_locations, fixes subtree
#   M2        → adds new columns to asset_locations, adds FKs, drops unique
#   M2b       → seeds CC-HEAD-001 cost center + 8 corporate divisions
#   M3        → adds asset_location_id + cost_center_id to users (nullable)
#   M4        → adds asset_location_id + cost_center_id to employees (nullable)
#   M5        → creates assets table
#   M6        → back-fills cost_center_id, enforces NOT NULL
```

In an env without `docs/asset_locations.sql`:
- M-import is a no-op.
- M0 creates Head Office.
- M2b creates divisions.
- M6 back-fills users/employees from `CC-HEAD-001`.

---

## 6. Validation commands

```bash
php artisan tinker

# 1. Head Office + Addl_GM
> \App\Models\Asset\AssetLocation::where('code','HEAD')->count();               // 1
> \App\Models\Asset\AssetLocation::where('code','OPERATIONS')->count();         // 1

# 2. Imported rows
> \App\Models\Asset\AssetLocation::where('code','like','CC-%')->count();        // 107 (or 0 in empty env)

# 3. 8 corporate divisions
> \App\Models\Asset\AssetLocation::where('type','division')->count();           // 8

# 4. Cost-center total
> \App\Models\CostCenter::count();                                              // 116 with SQL data, 9 in empty env

# 5. Tree integrity
> $r = \App\Models\Asset\AssetLocation::where('code','HEAD')->first();
> $r->fixSubtree();
> $r->save();
> \App\Models\Asset\AssetLocation::withDepth()->defaultOrder()->get(['code','depth','parent_id','_lft','_rgt'])->each(fn($n) => print(str_repeat('  ', $n->depth)."{$n->code} (depth {$n->depth})\n"));

# 6. Kethhena WTP depth-4 path
> \App\Models\Asset\AssetLocation::where('code','CC-011116')->first()->ancestors()->pluck('code');
// => ['HEAD', 'OPERATIONS', 'CC-011000', 'CC-011108', 'CC-011116']

# 7. Branch coverage
> \App\Models\Asset\AssetLocation::where('branch','operational')->count();      // 109 (108 = 1 Head Office + 1 Addl_GM + 107 imported)
> \App\Models\Asset\AssetLocation::where('branch','division')->count();         // 8

# 8. Users/Employees NOT NULL after M6
> \App\Models\User::whereNull('cost_center_id')->count();                       // 0
> \App\Models\Employee::whereNull('cost_center_id')->count();                   // 0

# 9. Tests
php artisan test
```

---

## 7. Open questions (resolved for v2)

| # | Question | Resolution |
|---|---|---|
| 1 | `code` format for imported asset-locations | **`CC-<zero-padded-cost_center_id>`** (e.g. `CC-011000`). |
| 2 | Should the legacy `id` be preserved? | **Discard**; `bigIncrements` assigns fresh. Used internally as `$byLegacyId` key during import. |
| 3 | `Kethhena WTP` depth-4 — collapse or keep? | **Keep** — kalnoy manages unlimited depth. |
| 4 | `cost_center_id = 4300` ("Kandy North Region" ends `000`) — promote to `rsc`? | **Keep as `region`** — the `code ends 000` validator is dropped. |
| 5 | `asset_location_name` typo "Nothern RSC" — keep or fix? | **Keep verbatim**; rename is an admin task. |
| 6 | `asset_location_name` extra-space anomalies — keep or normalize? | **Keep verbatim**. |
| 7 | 14 root RSCs attach under Head Office or Addl_GM? | **Attach under the default Addl_GM "Operations"** (new layer added per user instruction). |
| 8 | `deleted_at` column — skip SoftDeletes? | **Skip** — column doesn't exist in target schema. |
| 9 | How many unique cost centers? | **107 unique** imported from SQL — resolves C-02. |

---

## 8. Files Created / Modified by Migrations

**New files**:
- `database/migrations/2026_07_29_085000_seed_head_office_root.php` (M0)
- `database/migrations/2026_07_29_085500_create_cost_centers_table.php` (M1)
- `database/migrations/2026_07_29_090000_import_existing_asset_locations.php` (M-import) — parses `docs/asset_locations.sql`
- `database/migrations/2026_07_29_090500_enrich_asset_locations_table.php` (M2)
- `database/migrations/2026_07_29_091000_seed_divisions_and_cost_centers.php` (M2b)
- `database/migrations/2026_07_29_091500_add_location_and_cost_center_to_users_table.php` (M3)
- `database/migrations/2026_07_29_092000_add_location_and_cost_center_to_employees_table.php` (M4)
- `database/migrations/2026_07_29_092500_create_assets_table.php` (M5)
- `database/migrations/2026_07_29_093000_backfill_and_enforce_cost_center_not_null.php` (M6)

**Read-only references**:
- `docs/asset_locations.sql` — SQL parser reads this on import.

**Not modified**:
- `database/migrations/2026_07_13_145322_create_asset_locations_table.php`

---

## 9. Conflict resolution log

All 20 conflicts from `asset_location_conflicts.md` are resolved by this v2 plan in conjunction with `asset_location_implementation_v2.md`:

| Conflict | Resolved by |
|---|---|
| C-01 (M-import ordering) | Filename `090000` slots between M1 (`085500`) and M2 (`090500`). |
| C-02 (cost-center count) | Standardized on **107 unique**, 116 total in a fully-imported env. |
| C-03 (`code` format) | `CC-XXXXXX` adopted everywhere. |
| C-04 (depth-4) | Kalnoy unlimited-depth acknowledged; "3-level" wording dropped from implementation. |
| C-05 (code ends 000) | Validator rule dropped. |
| C-06 (Head Office cost_center) | `cost_center_id = NULL` for Head Office; `CC-HEAD-001` is a separate entity. |
| C-07 (M6 fallback) | Explicit chain `CC-HEAD-001` → first-imported → abort. |
| C-08 (branch assignment) | `branch='operational'` explicit on all 107 imported rows. |
| C-09 (legacy id) | Discarded; `bigIncrements` assigns fresh. |
| C-10 (manager_id) | `null` for all 107 imported rows; admin fills later. |
| C-11 (typo "Nothern RSC") | Kept verbatim; admin rename task. |
| C-12 (deleted_at) | Not imported. |
| C-13 (14 root RSCs) | Attached under the new **Operations Addl_GM** node. |
| C-14 (inline SQL duplication) | M-import parses `docs/asset_locations.sql` from disk at runtime. No inline array. |
| C-15 (parent_id in fillable) | Removed from `$fillable` (implementation). |
| C-16 (depth in fillable) | Removed from `$fillable` (implementation). |
| C-17 (parent lookup by legacy id) | `$byLegacyId` keyed by legacy `id`. Validates "id refs legacy id" invariant — `parent_id = 7` looks up `$byLegacyId[7]`, not `$byLegacyId['CC-004000']`. |
| C-18 (Head Office seeded twice) | M-import and M0 use different `code`/`type` checks; both idempotent. |
| C-19 (M2 back-fill no-op) | Implementation acknowledges it's a safety net for empty envs. |
| C-20 (self-inconsistency) | §0, §1.5, §6 all say 107 / 116 consistently. |

---

## 10. Status

Final. All conflicts closed. The full implementation lives across `asset_location_implementation_v2.md` (this v2's sibling).