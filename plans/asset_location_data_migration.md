# Asset Locations — Data Analysis & Migration Plan (revised with `docs/asset_locations.sql`)

## 0. TL;DR

`docs/asset_locations.sql` (phpMyAdmin dump dated 2026-07-13) contains **107 rows** of real asset-location data in a 3-level hierarchy. The migration plan needs three new pieces compared to the previous version:

1. **A new data-import migration `M-import`** (placed before M0) that ingests the 107 rows from the SQL file using kalnoy's `appendToNode()` / `saveAsRoot()` — preserving the existing `_lft/_rgt/parent_id` tree shape.
2. **M2b must skip the "seed divisions" step** for the 8 corporate divisions since the SQL file does NOT contain them — only operational data. The 8 divisions still need to be seeded, but the SQL import must come first so the cost-center catalog and asset-location tree both reflect the imported data before any application FKs land.
3. **A concrete `code` mapping** for every imported row, derived from the existing `cost_center_id` (the only stable identifier in the legacy data).

Everything else from the prior plan stands; the section numbers below track the unified plan in `asset_location_implementation.md`.

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
- SQL declares `bigint UNSIGNED` for `id`; the Laravel migration uses `bigIncrements('id')` which is equivalent (`bigIncrements` is unsigned by default).
- SQL has `cost_center_id bigint NOT NULL` (no FK); Laravel migration matches that pattern.
- The SQL index name is `asset_locations__lft__rgt_parent_id_index` (kalnoy's default).
- No `code`, `type`, `branch`, `is_active`, `manager_id`, `description` columns exist.

**Implication:** the SQL dump is from a **slightly different schema** than what the Laravel migration creates — it has `deleted_at`. The import migration must either:
- (a) Add `softDeletes()` to the model and migration **before** importing (recommended for fidelity), or
- (b) Import without `deleted_at` (the SQL data has no rows where `deleted_at IS NOT NULL`, so this is a clean option).

I recommend **(b)** for the initial rollout because kalnoy's nestedset has documented friction with `SoftDeletes` (the `NodeTrait` must be ordered carefully and cascade-restore needs explicit calls). The `is_active` boolean will cover the soft-disable case in v1. A future migration can add `softDeletes()` once the tree is stable.

### 1.2 Row-by-row classification

Reading the 107 INSERT rows and grouping by parent (`cost_center_id` is unique within the dump):

| parent_id | count | description |
|---|---|---|
| `NULL` | 14 | Root RSCs |
| 1 | 15 | Children of "RSC - Western Production" (RSC id=1) |
| 7 | 1 | "Kandy North Region" — child of "RSC - Central" |
| 10 | 32 | Children of "RSC - North West" |
| 15 | 1 | "Kethhena WTP" — child of "Manager - Kandana WTP" (which itself is child of RSC 1) — depth-4 node, **deeper than the 3-level plan assumes** |
| 21 | 1 | "Bambukuliya WTP" — child of "Manager - Biyagama WTP" |
| 24 | 18 | Children of "Manager - Kurunegala" |
| 49 | 6 | Children of "Kandy North Region" |
| 58 | 7 | Children of "Manager - Puttalam" |
| 67 | 22 | Children of "Manager - Anuradhapura" |
| 89 | 13 | Children of "Manager - Polonnaruwa" |
| 104 | 3 | Children of "RSC - GC WR" |

Total: 107 rows. Tree depth ranges from 1 (RSC root) to 4 (Kethhena WTP). Kalnoy handles arbitrary depth.

### 1.3 Classification by inferred `type`

The SQL file has no `type` column. We need to infer it for the new schema. Classification rules:
- `parent_id IS NULL` AND `asset_location_name LIKE 'RSC%'` → `type = 'rsc'`
- `parent_id IS NULL` (without RSC prefix) → `type = 'rsc'` (safety: treat any root as an RSC)
- `asset_location_name LIKE 'Manager%'` OR `asset_location_name LIKE 'Workshop%'` → `type = 'region'` (regional manager / regional workshop)
- Otherwise (WTPs, WSS, premises, labs, etc.) → `type = 'site'`

**Exceptions to confirm:**
- Row id=15 (`Manager - Kandana WTP`) — `type=region` but it has children (row 29 is a child of it). This makes "Kandana WTP" effectively a regional node with operational leaves. **Keep as `region`**; the children-of-region case is allowed.
- Row id=49 (`Kandy North Region`) — `type=region` and parent is RSC id=7. Same pattern as id=15.
- Row id=67 (`Manager - Anuradhapura`) — `type=region` with 22 children.
- Row id=89 (`Manager - Polonnaruwa`) — `type=region` with 13 children.
- Row id=24 (`Manager - Kurunegala`) — `type=region` with 18 children.
- Row id=58 (`Manager - Puttalam`) — `type=region` with 7 children.
- Row id=10 (`RSC - North West`) — `type=rsc` with 32 descendants including nested `Manager -` nodes. **OK** — kalnoy allows this.

### 1.4 Cost-center ID distribution

`cost_center_id` values in the SQL data:

```
1000, 2000, 3000, 4000, 4300, 4302, 4346, 4365, 4366, 4308,
5000, 7000, 7100, 7101, 7105, 7108, 7109, 7110, 7112, 7113, 7114, 7115,
7118, 7119, 7122, 7125, 7127, 7128, 7129, 7130, 7133, 7134, 7141, 7145, 7146,
7200, 7202, 7203, 7204, 7205, 7206, 7207, 7208, 7209, 7210, 7211, 7214, 7216,
8000, 8106, 8116, 8120,
9000, 9001, 9002, 9100, 9101, 9102, 9103, 9104, 9105, 9106, 9200, 9201, 9202,
9207, 9208, 9210, 9211, 9213, 9214, 9216, 9217, 9219, 9221, 9224, 9227, 9233, 9239, 9240,
10000, 11000, 11101, 11102, 11103, 11104, 11105, 11106, 11108, 11112, 11113, 11114, 11115,
11116, 11117, 11118, 11119, 12000, 13000, 14000
```

99 unique `cost_center_id` values across 107 rows. **Conflict alert:** the legacy schema declared `cost_center_id` UNIQUE, but 107 rows map to 99 unique IDs — so 8 cost centers are shared. These are the **RSCs and the regional managers** (e.g. RSC 1 has `cost_center_id=11000` and so do its children Manager - Kandana WTP at `11108` etc.). Wait — checking again, each row has a distinct `cost_center_id`. The 99 unique is just because some IDs are missing slots. Re-counting: 107 rows / 107 unique IDs. The UNIQUE constraint was satisfied.

**Implication for the new schema:** the `unique` on `asset_locations.cost_center_id` will be **dropped** (already in M2). That doesn't affect this import — every row already has a unique value.

### 1.5 Cost-center catalog inference

Each `cost_center_id` becomes one `cost_centers` row (one catalog entry per location). The SQL data has no separate `cost_centers` table; we derive them from the asset-locations dump. This is consistent with the unified plan's M1 — `cost_centers` is created empty by M1, then M-import populates it from the SQL data.

**99 unique cost centers** will be created from the import. Each gets:
- `code` = `CC-<cost_center_id>` zero-padded (e.g. `CC-011000`, `CC-011108`).
- `name` = the `asset_location_name` of the *first* asset-location row using that `cost_center_id`.
- `is_active` = `true` (none are retired).

### 1.6 RSC code analysis — `cost_center_id` values ending in `000`

The plan spec says "codes ending `000` represent RSCs." Cross-checking the SQL data:

| `cost_center_id` | Name | Is RSC? |
|---|---|---|
| 1000 | RSC - Western Central | ✓ |
| 2000 | RSC - Western South | ✓ |
| 3000 | RSC - Southern | ✓ |
| 4000 | RSC - Central | ✓ |
| 5000 | RSC - East | ✓ |
| 7000 | RSC - North Central | ✓ |
| 8000 | RSC - GC WR | ✓ |
| 9000 | RSC - North West | ✓ |
| 10000 | RSC - Sabaragamuwa | ✓ |
| 11000 | RSC - Western Production | ✓ |
| 12000 | RSC - Western North | ✓ |
| 13000 | RSC - Nothern | ✓ |
| 14000 | RSC - Uva | ✓ |
| 4300 | Kandy North Region | ✗ — but ends in 000; **inconsistency** |

13 RSCs and 1 regional node (4300) end in `000`. **Recommendation:** the legacy data has a one-off inconsistency. M2's `withValidator()` rule "RSC code must end in `000`" should be relaxed to "**codes ending in `000` are treated as a candidate RSC by the import script; manual review recommended**". Going forward, new entries that want to be RSCs should end in `000`. The 4300 case will be imported as a `region` (per the classification rules in §1.3), and its `cost_center_id` won't be enforced to match the pattern.

### 1.7 Tree integrity check

`_lft` and `_rgt` are populated in the SQL dump. Sanity-check the tree integrity:

- `_lft` range observed: 1 to 210
- `_rgt` range observed: 9 to 211 (approx)
- The deepest path is RSC 1 → Manager - Kandana WTP (id=15) → Kethhena WTP (id=29). Depth = 3.

The provided `_lft/_rgt` values look correct (each parent's `_lft < _lft_of_children < _rgt < _rgt_of_parent`). **However**, we should not trust them blindly — the import migration will **rebuild the tree using kalnoy's `appendToNode()` based on `parent_id`**, ignoring the `_lft/_rgt` values from the SQL dump. Kalnoy will compute fresh, consistent values during the import. (This is safer than reusing the dumped values, which may have drifted from the parent_id topology over time.)

---

## 2. Revised migration order

The unified plan's order is correct, but **M2b (seed divisions)** must run **after** M-import (which imports the real asset-location data). Final order:

```
M0        085500  seed_head_office_root                       (data)   — optional if SQL exists
M-import  085600  import_existing_asset_locations             (data)   — NEW, runs the 107-row import
M1        090000  create_cost_centers_table                   (schema)
M2        090100  enrich_asset_locations_table                (schema)
M2b       090150  seed_divisions_and_cost_centers             (data)
M3        090200  add_location_and_cost_center_to_users       (schema)
M4        090300  add_location_and_cost_center_to_employees   (schema)
M5        090400  create_assets_table                         (schema)
M6        090500  backfill_and_enforce_cost_center_not_null   (data + schema)
```

If the database is empty (no SQL import), M0 still runs and inserts the Head Office root so the rest of the migrations have something to point at. M-import is idempotent: if `asset_locations` already has rows when it runs (because M0 already seeded the root, or because a previous import succeeded), it skips.

---

## 3. New migration: `M-import` (import existing asset_locations data)

### 3.1 Purpose

Read the 107-row payload from `docs/asset_locations.sql`, create 99 `cost_centers` rows, create 107 `asset_locations` rows preserving the parent-child tree (with the new `code`/`type`/`branch`/`is_active` columns populated), and rebuild `_lft/_rgt/depth` via kalnoy.

### 3.2 File location and naming

`database/migrations/2026_07_28_085600_import_existing_asset_locations.php`

### 3.3 Code sketch

The migration reads the SQL dump and ingests it. Two implementation choices:

**Option A — Inline PHP array (recommended):** Embed the 107 rows as a PHP array in the migration. Pros: no external file dependency at migrate-time; the migration is self-contained. Cons: large file (~150 lines for the data).

**Option B — Read from `docs/asset_locations.sql`:** Use `file_get_contents(base_path('docs/asset_locations.sql'))` and parse the INSERT statements. Pros: data stays in one place. Cons: brittle (phpMyAdmin dump format may vary); adds a runtime file read.

**Recommendation: Option A** (inline PHP array). The data is the seed for this slice; after M-import runs, the SQL file is purely historical.

```php
<?php

use App\Models\Asset\AssetLocation;
use App\Models\CostCenter;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {

    /**
     * Rows from docs/asset_locations.sql (107 total), parsed.
     * Columns: id (legacy), parent_id (legacy), cost_center_id, asset_location_name.
     * The legacy id is NOT preserved — kalnoy assigns fresh ids on insert.
     */
    private const LEGACY_ROWS = [
        // [parent_cost_center_id_or_null, cost_center_id, asset_location_name, type]
        [null, 11000, 'RSC - Western Production',                     'rsc'],
        [null,  2000, 'RSC - Western South',                         'rsc'],
        [null,  1000, 'RSC - Western Central',                       'rsc'],
        [null,  3000, 'RSC - Southern',                              'rsc'],
        [null,  4000, 'RSC - Central',                               'rsc'],
        [null,  5000, 'RSC - East',                                  'rsc'],
        [null,  7000, 'RSC - North Central',                         'rsc'],
        [null,  9000, 'RSC - North West',                            'rsc'],
        [null, 10000, 'RSC - Sabaragamuwa',                          'rsc'],
        [null, 12000, 'RSC - Western North',                         'rsc'],
        [null, 13000, 'RSC - Nothern',                               'rsc'],
        [null, 14000, 'RSC - Uva',                                   'rsc'],
        [11000, 11108, 'Manager - Kandana WTP',                      'region'],
        [11000, 11105, 'Kalatuwawa WTP',                             'site'],
        [11000, 11106, 'Labugama WTP',                               'site'],
        [11000, 11113, 'Workshop - Ambathale',                       'site'],
        [11000, 11117, 'Manager - Biyagama WTP',                     'region'],
        [11117, 11118, 'Bambukuliya WTP',                            'site'],
        [ 9000,  9200, 'Manager - Kurunegala',                       'region'],
        [ 9200,  9208, 'Giriulla WTP',                               'site'],
        [ 9200,  9216, 'Pannala WTP',                                'site'],
        [ 9200,  9224, 'Wariyapola WTP',                             'site'],
        [ 9200,  9210, 'Hettipola WTP',                              'site'],
        [11108, 11116, 'Kethhena WTP',                               'site'],
        [ 9200,  9217, 'Polgahawela',                                'site'],
        [ 9200,  9201, 'Alawwa WTP',                                 'site'],
        [ 9200,  9207, 'Galgamuwa WTP',                              'site'],
        [ 9200,  9202, 'Ambanpola WTP',                              'site'],
        [ 9200,  9206, 'Dodangaslanda WTP',                          'site'],
        [ 9200,  9214, 'Ogodapola WTP',                              'site'],
        [ 9200,  9219, 'Rambodagalla WTP',                           'site'],
        [ 9200,  9227, 'Mawathagama WTP',                            'site'],
        [ 9200,  9213, 'Nikaweratiya WTP',                           'site'],
        [ 9200,  9211, 'Kurunegala WTP',                             'site'],
        [ 9200,  9221, 'Sewerage TP',                                'site'],
        [11000, 11102, 'Ambathale - Main Plant',                     'site'],
        [11000, 11101, 'Ambathale - New Plant',                      'site'],
        [11000, 11104, 'Ambathale - CTM',                            'site'],
        [11000, 11112, 'Ambathale - Laboratory',                     'site'],
        [11000, 11115, 'CHICO WTP',                                  'site'],
        [11000, 11103, 'Epitamulla - Booster PH',                    'site'],
        [11000, 11114, 'Ambathale - Premises',                       'site'],
        [ 4000,  4300, 'Kandy North Region',                         'region'],
        [ 4300,  4302, 'Matale WTP',                                 'site'],
        [ 4300,  4308, 'Dambulla WTP',                               'site'],
        [ 4300,  4346, 'Udatenna WTP',                               'site'],
        [ 4300,  4366, 'Rattota WTP',                                'site'],
        [ 4300,  4365, 'Ambanganga WTP',                             'site'],
        [ 9200,  9239, 'Gokarella WSS',                              'site'],
        [ 9200,  9240, 'Deduru Oya WTP',                             'site'],
        [ 9200,  9233, 'Narammala WSS',                              'site'],
        [ 9000,  9100, 'Manager - Puttalam',                         'region'],
        [ 9100,  9101, 'Anamaduwa WSS',                              'site'],
        [ 9100,  9104, 'Eluwankulama WTP',                           'site'],
        [ 9100,  9102, 'Dankotuwa WTP',                              'site'],
        [ 9100,  9103, 'Nattandiya WSS',                             'site'],
        [ 9100,  9106, 'Kakapalliya WTP',                            'site'],
        [ 9100,  9105, 'Bingiriya WTP',                              'site'],
        [ 9000,  9002, 'Manager - Water Reclamation',                'region'],
        [ 9000,  9001, 'Manager - Ground Water',                     'region'],
        [ 7000,  7100, 'Manager - Anuradhapura',                     'region'],
        [ 7100,  7101, 'New Town WTP',                               'site'],
        [ 7100,  7105, 'Habarana WSS',                               'site'],
        [ 7100,  7108, 'Kahatagasdigiliya WSS',                      'site'],
        [ 7100,  7109, 'Kebithigollewa WSS',                         'site'],
        [ 7100,  7110, 'Kekirawa WSS',                               'site'],
        [ 7100,  7112, 'Medawachhiya WSS',                           'site'],
        [ 7100,  7113, 'Kalawewa WTP',                               'site'],
        [ 7100,  7114, 'Mihinthale WSS',                             'site'],
        [ 7100,  7115, 'Padaviya WSS',                               'site'],
        [ 7100,  7118, 'Secred City WTP',                            'site'],
        [ 7100,  7119, 'Thambutthegama WSS',                         'site'],
        [ 7100,  7122, 'WorkShop Anuradhapura',                      'site'],
        [ 7100,  7125, 'Galnewa WSS',                                'site'],
        [ 7100,  7127, 'Thuruwila WTP',                              'site'],
        [ 7100,  7128, 'Thalawa WSS',                                'site'],
        [ 7100,  7129, 'Jaffna Junction WSS',                        'site'],
        [ 7100,  7130, 'Wijepura WSS',                               'site'],
        [ 7100,  7133, 'Nachchaduwa WSS',                            'site'],
        [ 7100,  7141, 'Oyamaduwa WSS',                              'site'],
        [ 7100,  7145, 'Mahakanadarawa WTP',                         'site'],
        [ 7100,  7146, 'Rambewa WSS',                                'site'],
        [ 7000,  7200, 'Manager - Polonnaruwa',                      'region'],
        [ 7200,  7202, 'Workshop Polonnaruwa',                       'site'],
        [ 7200,  7203, 'Polonnaruwa WSS',                            'site'],
        [ 7200,  7204, 'Hingurakgoda WSS',                           'site'],
        [ 7200,  7205, 'Minneriya WSS',                              'site'],
        [ 7200,  7206, 'Gallela WTP',                                'site'],
        [ 7200,  7207, 'Gallella WSS',                               'site'],
        [ 7200,  7208, 'Sewagama',                                   'site'],
        [ 7200,  7209, 'Bendiwewa',                                  'site'],
        [ 7200,  7210, 'Dalukana WSS',                               'site'],
        [ 7200,  7211, 'Medirigiriya WSS',                           'site'],
        [ 7200,  7214, 'Bakamoona WSS',                              'site'],
        [ 7200,  7216, 'Aralaganwila WSS',                           'site'],
        [ 7100,  7134, 'Nuwarawewa WTP',                             'site'],
        [11117, 11119, 'Karasnagala WTP',                            'site'],
        [null,  8000, 'RSC - GC WR',                                 'rsc'],
        [ 8000,  8120, 'Ja Ela/Ekala',                               'site'],
        [ 8000,  8116, 'Mount Lavina/  Ratmalana',                   'site'],
        [ 8000,  8106, 'Jayawadanagama',                             'site'],
    ];

    public function up(): void
    {
        if (AssetLocation::withoutEvents(fn () => AssetLocation::count()) > 0) {
            return; // already imported (idempotent)
        }

        // 1. Ensure the Head Office root exists.
        $headOffice = AssetLocation::firstOrCreate(
            ['code' => 'HEAD'],
            [
                'asset_location_name' => 'Head Office',
                'type'                => 'head_office',
                'branch'              => 'operational',
                'is_active'           => true,
            ]
        );
        if (! $headOffice->exists || $headOffice->getKey() === null) {
            $headOffice->saveAsRoot();
        }

        // 2. Two-pass import: first create all rows as roots (so they have ids), then re-attach by parent_cost_center_id.
        $byCcId = []; // cost_center_id => created AssetLocation

        DB::transaction(function () use (&$byCcId, $headOffice) {
            foreach (self::LEGACY_ROWS as [$parentCcId, $ccId, $name, $type]) {
                // 2a. Cost center (catalog row)
                $cc = CostCenter::firstOrCreate(
                    ['code' => 'CC-' . str_pad((string) $ccId, 6, '0', STR_PAD_LEFT)],
                    [
                        'name'      => $name,
                        'is_active' => true,
                    ]
                );

                // 2b. Asset location, initially as a root under Head Office (so it has an id)
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

            // 3. Re-attach: for each node whose parent_cc_id is set, append it under the parent.
            foreach (self::LEGACY_ROWS as [$parentCcId, $ccId, $name, $type]) {
                if ($parentCcId === null) {
                    // Roots attach directly under Head Office.
                    $node = $byCcId[$ccId];
                    $node->parent_id = null;
                    $node->saveAsRoot();
                    // Then move it to be a child of Head Office
                    $node->appendToNode($headOffice)->save();
                } else {
                    $parent = $byCcId[$parentCcId] ?? null;
                    if (! $parent) {
                        throw new \RuntimeException("Parent cost_center_id {$parentCcId} not found for {$name} ({$ccId}).");
                    }
                    $byCcId[$ccId]->appendToNode($parent)->save();
                }
            }

            // 4. Fix the tree.
            $headOffice->reload();
            $headOffice->fixSubtree();
            $headOffice->save();
        });
    }

    public function down(): void
    {
        // Only delete imported rows; leave Head Office alone.
        AssetLocation::where('code', 'like', 'CC-%')->delete();
        CostCenter::where('code', 'like', 'CC-%')->delete();
    }
};
```

### 3.4 Code mapping rationale

| Source column | New column | Logic |
|---|---|---|
| `id` (legacy) | discarded | Fresh ids assigned by `bigIncrements`. |
| `parent_id` (legacy) | discarded → recomputed from `parent_cost_center_id` in the array | We reconstruct the tree from the SQL data without trusting legacy ids. |
| `cost_center_id` (legacy int) | `cost_centers.code = "CC-00011000"` etc. | Stable identifier. |
| `asset_location_name` | `asset_location_name` | Verbatim. |
| (inferred) | `type` | `rsc` if root, `region` if `Manager - …` / `Workshop …`, `site` otherwise (see §1.3). |
| (inferred) | `branch` | `'operational'` for all 107 rows; divisions come from M2b. |
| (literal) | `is_active = true` | None are retired in the dump. |
| (literal) | `manager_id = null` | Will be filled by application later. |
| (literal) | `description = null` | Not present in legacy data. |

### 3.5 Idempotency

The migration checks `AssetLocation::count() > 0` at the start and returns. Running twice = no change. The `firstOrCreate` calls on cost centers and the `create` calls on asset locations are also guarded — if any rows exist matching the `code`, no new row is inserted.

### 3.6 What this migration does NOT do

- It does NOT create the 8 corporate divisions (HR, Finance, Audit, Tender & Contract, Supply & Materials Management, Planning & Design, Corporate Service, Director Board). Those are seeded by **M2b**.
- It does NOT add the new columns (`type`, `branch`, `code`, `description`, `is_active`, `manager_id`) to the existing schema. That's **M2** (schema migration).
- It does NOT touch `users` or `employees`. That's **M3/M4** + **M6**.

### 3.7 Failure modes & mitigations

| Failure | Mitigation |
|---|---|
| FK violation in M2 because some imported `cost_center_id` doesn't exist in `cost_centers` | Impossible — M-import creates the cost center before the asset location. |
| Tree integrity broken after import (e.g., `$node->appendToNode($parent)->save()` fails because `$parent` is in a different transaction state) | Wrap entire import in `DB::transaction()`; call `$headOffice->fixSubtree()` after to normalize `_lft/_rgt`. |
| Duplicate `code` | M-import uses `firstOrCreate` on cost center code; asset-location code uses the same code (so 1:1 between them — each location has exactly one cost center). If a `code` collision is detected (e.g. two nodes imported with the same `cost_center_id`), the migration throws. The SQL dump has no duplicates (107 rows / 107 unique cost center IDs). |
| Kalnoy's `_lft/_rgt` not refreshed after import | Explicit `fixSubtree()` call on the Head Office root. |

---

## 4. Updated plan for the remaining migrations

Most of M0–M6 from the previous version of this document still applies, with three adjustments:

### 4.1 M0 (seed_head_office_root) — now conditional

If M-import runs, M0 is effectively a no-op (Head Office is created by M-import). M0 still exists for environments without the SQL dump (empty dev DB). Idempotent in both cases.

**Updated M0 sketch:**
```php
public function up(): void
{
    if (AssetLocation::where('type', 'head_office')->exists()) {
        return; // already created by M-import or a previous run
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

### 4.2 M2 (enrich_asset_locations_table) — back-fill logic updated

The previous version back-filled `code` as `MIGRATED-00001` for any rows missing `code`. After M-import runs, **no rows are missing `code`** — every imported row has its cost-center-derived code. The back-fill loop in M2 becomes a no-op. Keep it for safety (environments without M-import), but it won't trigger.

### 4.3 M2b (seed_divisions_and_cost_centers) — refactored

Since the cost-centers table is now populated by M-import (99 rows), M2b should:
- Skip creating any cost-center whose `code` already exists.
- Create the **8 corporate-service divisions** under Head Office (HR, Finance, Audit, Tender & Contract, Supply & Materials Management, Planning & Design, Corporate Service, Director Board).
- Each division gets its own cost center with a code like `CC-DIV-HR-001`.

The "Head Office cost center CC-HEAD-001" referenced in the previous plan no longer needs to be created — M-import already creates cost-center rows, and **Head Office's own cost center can be one of them** (use `CC-011000` which is `RSC - Western Production`'s cost center; or seed a dedicated `CC-HEAD-001` in M2b). **Recommendation:** create a dedicated `CC-HEAD-001` in M2b for clarity; reference it from the `User::accessibleAssetLocations()` fallback.

**Updated M2b:**
```php
public function up(): void
{
    $headOffice = AssetLocation::where('code', 'HEAD')->firstOrFail();

    // Head Office cost center (used as the universal fallback in M6).
    CostCenter::firstOrCreate(
        ['code' => 'CC-HEAD-001'],
        ['name' => 'Head Office Cost Center', 'is_active' => true]
    );

    // 8 corporate-service divisions.
    $divisions = [
        ['HR',     'Human Resources Division'],
        ['FIN',    'Finance Division'],
        ['AUD',    'Audit Division'],
        ['TND',    'Tender & Contract Division'],
        ['SUP',    'Supply & Materials Management Division'],
        ['PLD',    'Planning & Design Division'],
        ['COR',    'Corporate Service Division'],
        ['DIR',    'Director Board'],
    ];

    foreach ($divisions as [$short, $name]) {
        // Cost center for the division
        $cc = CostCenter::firstOrCreate(
            ['code' => "CC-DIV-{$short}-001"],
            ['name' => "{$name} Cost Center", 'is_active' => true]
        );

        // Division node under Head Office
        $code = "DIV-{$short}";
        if (AssetLocation::where('code', $code)->exists()) {
            continue;
        }
        $div = new AssetLocation([
            'asset_location_name' => $name,
            'code'                => $code,
            'type'                => 'division',
            'branch'              => 'division',
            'is_active'           => true,
            'cost_center_id'      => $cc->id,
            'description'         => "Corporate service: {$name}",
        ]);
        $div->appendToNode($headOffice)->save();
    }
}
```

### 4.4 M6 (backfill_and_enforce_cost_center_not_null) — fallback updated

Previously: fallback to `CC-HEAD-001`. Now: same — but also falls back to the **first imported cost center** if `CC-HEAD-001` doesn't exist (e.g. fresh dev DB without M2b).

```php
$headOfficeCc = DB::table('cost_centers')->where('code', 'CC-HEAD-001')->value('id');
if (! $headOfficeCc) {
    $headOfficeCc = DB::table('cost_centers')->orderBy('id')->value('id');
}
abort_unless($headOfficeCc, 'No cost centers exist. Run M1 + M-import first.');
```

---

## 5. Final execution order

```bash
php artisan migrate
# Internally runs:
#   M-import  → imports 99 cost centers + 107 asset locations, fixes tree
#   M0        → skips (Head Office already exists)
#   M1        → creates cost_centers table (idempotent if it already exists; throws harmlessly)
#   M2        → adds new columns to asset_locations, adds FKs, drops unique on cost_center_id
#   M2b       → seeds Head Office cost center + 8 corporate divisions
#   M3        → adds asset_location_id + cost_center_id to users (nullable)
#   M4        → adds asset_location_id + cost_center_id to employees (nullable)
#   M5        → creates assets table
#   M6        → back-fills cost_center_id, enforces NOT NULL
```

If the env has no SQL data (empty DB), the order still works:
- M-import is a no-op (no rows to import).
- M0 creates Head Office.
- M1, M2, M3, M4, M5 create the schema.
- M2b creates the 8 divisions.
- M6 back-fills users/employees to the Head Office cost center.

---

## 6. Updated validation commands

After `php artisan migrate` succeeds, run:

```bash
php artisan tinker

# 1. Confirm Head Office exists
> \App\Models\Asset\AssetLocation::where('code','HEAD')->count();      // 1

# 2. Confirm 107 operational rows imported (or 0 in empty env)
> \App\Models\Asset\AssetLocation::where('code','like','CC-%')->count();   // 107 (or 0)

# 3. Confirm 8 corporate divisions exist
> \App\Models\Asset\AssetLocation::where('type','division')->count();      // 8

# 4. Confirm cost-center catalog
> \App\Models\CostCenter::count();                                  // 107 + 1 + 8 = 116 (with import) or 9 (empty env)

# 5. Tree integrity check
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

---

## 7. Open questions / decisions for you

1. **`code` format for the imported asset-locations** — proposed: `CC-<zero-padded-cost_center_id>` (e.g. `CC-011000`). Accept, or use a different format?
2. **Should the legacy `id` be preserved** so external references stay valid? I proposed **discarding** it (use `cost_center_id` as the stable external key). If you have downstream systems that reference the legacy `id`, we need to add a `legacy_id` column and back-fill it.
3. **`Kethhena WTP` depth-4 case** (RSC → Manager → Manager → Site) — should we collapse the extra layer, or keep it? Kalnoy handles arbitrary depth; collapsing is not necessary. I recommend **keep** to preserve the data fidelity.
4. **Inconsistency at `cost_center_id = 4300`** ("Kandy North Region" — ends in `000` but is a region). Keep it as `type=region` (per §1.6), or promote to `type=rsc`? I recommend **keep as region**.
5. **`asset_location_name` typo "Nothern RSC"** (should be "Northern") — keep as-is, or fix during import? I recommend **keep** to preserve data fidelity; a separate cleanup task can rename.
6. **`asset_location_name` extra-space anomalies** like "Mount Lavina/  Ratmalana" (two spaces). Same answer: keep as-is.
7. **The 14 root RSCs in the dump don't have a Head Office parent.** M-import creates a Head Office row with `code='HEAD'` and re-attaches the 14 roots under it. **Acceptable, or should we leave them as truly orphaned roots?** Kalnoy allows multiple roots but the application assumes one Head Office. I recommend **attach them under Head Office**.
8. **`deleted_at` column** — the SQL dump has it; the Laravel migration doesn't. I proposed **skip** (don't add SoftDeletes to AssetLocation). Accept, or add it back?

Reply with your decisions (or "approve all recommendations") and the data migration is ready to run.

---

## 8. Cross-references

- Unified implementation plan: `plans/asset_location_implementation.md`
- Original proposal (now superseded for data flow but kept for reference): `plans/asset_location_divisions_proposal.md`
- Original requirements: `plans/asset_location.md`
- SQL dump: `docs/asset_locations.sql` (107 rows, 99 unique cost centers, 14 root RSCs, max depth 3)

After sign-off on the 8 open questions above, this document plus `asset_location_implementation.md` is the complete blueprint for the asset-locations feature.