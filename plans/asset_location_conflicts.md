# Asset Locations — Conflicts Between Implementation & Data-Migration Plans (RESOLVED)

> **Status**: **ALL 20 CONFLICTS RESOLVED** as of v2 (`asset_location_implementation_v2.md` + `asset_location_data_migration_v2.md`, 2026-07-29).
> **Original purpose**: catalog every inconsistency between the original plan, the `.tmp.md` markers, the data-migration plan, and the SQL reference — preserved here as the audit trail for what was fixed.
>
> **Outcome**: every conflict in the table below has a **Resolution** that points to the corresponding section in v2. The per-conflict detail sections still describe the original problem and reasoning; they remain useful as historical context for code review.
>
> **Superseded docs (do not implement against)**:
> - `plans/asset_location_implementation.md` (replaced by `_v2.md`)
> - `plans/asset_location_implementation.tmp.md` (interim hold during conflict review)
> - `plans/asset_location_data_migration.md` (replaced by `_v2.md`)
> - `plans/asset_location_data_migration.tmp.md` (interim hold)
> - `plans/asset_location_divisions_proposal.md` (folded into the unified plan)
>
> **Active docs**:
> - `plans/asset_location_implementation_v2.md`
> - `plans/asset_location_data_migration_v2.md`
> - `plans/asset_location.md` (original requirements, unchanged)
> - `docs/asset_locations.sql` (reference data — parsed at runtime by M-import)
>
> **Convention**: severity is `HARD` (would break a migration run), `MEDIUM` (would produce wrong data or wrong code), `LOW` (cosmetic / doc-only).

---

## Severity summary

> **Status (added after v2 finalization)**: all 20 conflicts are **resolved** in `asset_location_implementation_v2.md` and `asset_location_data_migration_v2.md`. See the per-conflict resolution field below and §3 in each v2 doc.

| ID | Severity | Title | Source A | Source B | Resolution |
|---|---|---|---|---|---|
| C-01 | HARD | M-import timestamp sorts before M0 | implementation | data-migration | **Resolved.** M-import filename `090000` slots between M1 (`085500`) and M2 (`090500`). |
| C-02 | MEDIUM | Cost-center count 99 vs 107 | data-migration | SQL | **Resolved.** Standardized on **107 unique**, **116 total** (107 + 1 Head Office CC + 8 division CCs). |
| C-03 | MEDIUM | `code` format mismatch (`MIGRATED-XXXXX` vs `CC-XXXXXX`) | implementation | data-migration | **Resolved.** `CC-XXXXXX` adopted in both v2 plans. |
| C-04 | MEDIUM | Tree depth capped at 3 in plan, SQL has depth 4 | implementation | SQL | **Resolved.** "3-level" wording dropped; kalnoy unlimited-depth acknowledged. **User has since added Addl_GM layer, making operational tree 5 levels.** |
| C-05 | MEDIUM | RSC `code ends 000` validator conflicts with imported data | implementation | SQL | **Resolved.** Validator rule dropped. |
| C-06 | MEDIUM | Head Office `cost_center_id` handling | implementation | data-migration | **Resolved.** Head Office `cost_center_id = NULL`; `CC-HEAD-001` is a separate cost center. |
| C-07 | MEDIUM | M6 cost-center fallback semantics | implementation | data-migration | **Resolved.** M6 uses explicit chain: `CC-HEAD-001` → first-imported cost-center → abort. |
| C-08 | LOW | `branch` enum assignment for imported rows | implementation | data-migration | **Resolved.** Both v2 plans assign `branch='operational'` explicitly. |
| C-09 | LOW | Legacy `id` preservation undecided | implementation | SQL | **Resolved.** Discard; `bigIncrements` assigns fresh. Used as `$byLegacyId` key during import. |
| C-10 | LOW | `manager_id` handling for imported rows | implementation | SQL | **Resolved.** `null` for all imported rows; admin fills later. |
| C-11 | LOW | `asset_location_name` typo "Nothern RSC" not flagged | implementation | SQL | **Resolved.** Kept verbatim; admin rename is a separate task. |
| C-12 | LOW | `deleted_at` column from SQL never reconciled | implementation | SQL | **Resolved.** `deleted_at` not imported; new schema has no such column. |
| C-13 | LOW | 14 root RSCs in SQL don't fit "single Head Office root" model | implementation | SQL | **Resolved.** 14 root RSCs attach under the new default Addl_GM node `"OPERATIONS"` that M-import creates. Admin can re-parent later. |
| C-14 | LOW | The plans duplicate SQL data instead of referencing it | both | (instruction) | **Resolved.** M-import **parses `docs/asset_locations.sql` from disk at runtime** — no inline array. |
| C-15 | LOW | `AssetLocation` model rewrite drops existing `parent_id` fillable guard | implementation | code | **Resolved.** `parent_id` removed from `$fillable`; kalnoy manages parent linking via `appendToNode()`. |
| C-16 | LOW | `depth` column treated as fillable in M2 | implementation | code | **Resolved.** `depth` removed from `$fillable`. |
| C-17 | LOW | M-import `parent_id` lookup walks by legacy `id` not by cost_center_id | data-migration | SQL | **Resolved.** `$byLegacyId` keyed by legacy `id`; parent lookup is `byLegacyId[parent_id]` not `byLegacyId[parent_cc_id]`. |
| C-18 | LOW | Head Office cost center seeded twice (M-import + M2b) | data-migration | (internal) | **Resolved by design.** Two distinct entities: `asset_location` code `HEAD` and `cost_center` code `CC-HEAD-001`. Documented in both v2 docs. |
| C-19 | LOW | M2's `code`/`type` back-fill loop is a no-op for SQL envs | data-migration | implementation | **Resolved.** Both v2 docs describe M2 back-fill as a safety net for empty envs; no-op after M-import. |
| C-20 | LOW | Self-inconsistency: §0 says 99 CCs, §1.4 says 107, §6 expects 116 | data-migration | (internal) | **Resolved.** v2 data-migration consistently says **107 / 116**. |

---

## C-01 — M-import timestamp sorts before M0  (HARD)

**What it says**: data-migration §2 names the import migration `2026_07_28_085600_import_existing_asset_locations.php`. M0 is `2026_07_28_085500_seed_head_office_root.php`. Laravel orders migrations by full filename string, so the actual run order is:

```
M0         085500  seed_head_office_root                       (no-op: already created by M-import)
M-import   085600  import_existing_asset_locations             ← RUNS FIRST
M1         090000  create_cost_centers_table
M2         090100  enrich_asset_locations_table
M2b        090150  seed_divisions_and_cost_centers
M3         090200  add_location_and_cost_center_to_users
M4         090300  add_location_and_cost_center_to_employees
M5         090400  create_assets_table
M6         090500  backfill_and_enforce_cost_center_not_null
```

So M-import runs **before M1**, and tries to insert into a `cost_centers` table that doesn't exist yet. Hard failure on fresh DB.

**Why it happens**: the original 085600 slot was chosen to put M-import near the top, but the author didn't account for Laravel's lexicographic ordering of filenames vs. the date prefix.

**Resolution options**:
- (a) Rename to `2026_07_28_090050_import_existing_asset_locations.php` (slot between M1 and M2 — matches data-migration §2's proposed rename; this is the intended fix).
- (b) Rename to `2026_07_28_085450_…` so it sorts before M0 (then M-import must build Head Office itself).

**Recommended**: (a) — keeps M0 in charge of the empty-env Head Office root and lets M-import be a no-op there. Data-migration §2 already proposes this fix; it just needs to be applied to the actual filename.

**Where to apply**: data-migration §2, the M-import filename in code sketches, and the implementation §1 "open: order with M-import" note.

---

## C-02 — Cost-center count 99 vs 107  (MEDIUM)

**What it says**:
- data-migration §0 says "99 unique cost centers" (paragraph "creates 107 cost-centers" but it does NOT — 99 is the claim).
- data-migration §1.5 first says 99, then says "(actually 107 unique IDs)".
- SQL dump has 107 unique `cost_center_id` values (one per row).
- data-migration §6 validation expects `107 + 1 + 8 = 116` total cost centers.

**Why it happens**: the data-migration author recounted partway through writing the doc and left both versions in. The SQL has exactly 107 unique IDs (one per row).

**Resolution**: standardize on **107 unique cost centers**, 107 asset_locations, 1 Head Office cost center (M2b), 8 division cost centers (M2b) = **116 total**. Document §0 must be updated to say "107 unique cost centers" to match §1.5 and §6.

**Where to apply**: data-migration §0, §1.4, §1.5, §6.

---

## C-03 — `code` format mismatch  (MEDIUM)

**What it says**:
- Implementation plan §1 M2 says "back-fill `code` with `MIGRATED-XXXXX` placeholder for legacy rows".
- Data-migration §3.4 says `code = 'CC-' . str_pad($ccId, 6, '0', STR_PAD_LEFT)` (e.g. `CC-011000`).

**Why it happens**: implementation was written assuming a generic placeholder; data-migration later picked a concrete format based on the SQL's `cost_center_id`.

**Resolution**: pick one format and apply consistently. Both plans agree the data-migration format (`CC-XXXXXX`) is more stable because it's derived from a real identifier. Adopt `CC-XXXXXX` and remove the `MIGRATED-XXXXX` placeholder from the implementation plan. Also update M2's "back-fill loop is a no-op for SQL envs" so it back-fills `CC-<id>` for any non-imported empty-env rows.

**Where to apply**: implementation §1 M2 back-fill note; data-migration §3.4 (already correct).

---

## C-04 — Tree depth capped at 3 in plan, SQL has depth 4  (MEDIUM)

**What it says**:
- Implementation §1, §7, §10 all describe a 3-level hierarchy (RSC → Region → Site).
- SQL dump has Kethhena WTP at depth 4: RSC - Western Production → Manager - Kandana WTP → Kethhena WTP.

**Why it happens**: implementation was written from the original requirements doc which assumed 3 levels.

**Resolution**: kalnoy already supports unlimited depth. Update the implementation plan to say "kalnoy-managed unlimited depth" and acknowledge that the operational tree is logically 3 levels but the schema permits more. Tests should not assert depth == 3; assert "max(depth) ≤ reasonable bound" or just leave depth unbounded.

**Where to apply**: implementation §2 `TYPES` constant (already includes head_office+rsc+region+site+division; depth handling is fine), §7 sidebar, §10 tests, §11 implementation order. Remove any "three-level" wording.

---

## C-05 — RSC `code ends 000` validator conflicts with imported data  (MEDIUM)

**What it says**:
- Implementation §4 says `withValidator()` enforces `type=rsc → code must end in 000`.
- SQL has Kandy North Region (`cost_center_id=4300`, ends `000`) classified as a region.

**Why it happens**: validator rule was written from requirements doc; data reality contradicts it.

**Resolution**: relax the validator. Two acceptable forms:
- (a) Drop the "ends 000" requirement entirely; rely on admin discipline.
- (b) Soft-enforce: warn, not block.

**Recommended**: (a) drop the rule. The `type` column already classifies the row; RSC vs Region is about location kind, not code shape. If the original requirements doc insists on the rule, mark it as advisory and add `nullable` flag.

**Where to apply**: implementation §4 `withValidator()`.

---

## C-06 — Head Office `cost_center_id` handling  (MEDIUM)

**What it says**:
- Implementation §1 M0 creates Head Office with no `cost_center_id`.
- Data-migration §4.1 marks this as "Open: cost_center_id for Head Office".
- Data-migration §4.3 says M2b creates `CC-HEAD-001` and points Head Office at it.

**Resolution**: pick one. Recommended: Head Office has NO cost center (it's a root; cost rolls up to children). Update Head Office row in M-import + M0 to leave `cost_center_id = NULL`. M2b still creates `CC-HEAD-001` as a **placeholder for new users/employees with no operational assignment** (per the existing decision: "all existing users/employees pointed at Head Office").

**Where to apply**: implementation §1 M0; data-migration §4.1.

---

## C-07 — M6 cost-center fallback semantics  (MEDIUM)

**What it says**:
- Implementation §1 M6 step 1 says "For every user with `cost_center_id IS NULL`: set it to the **Head Office cost center's id**".
- Data-migration §4.4 says fallback is "Head Office cost center OR first imported cost center" — two-step fallback.

**Why it happens**: data-migration added defensive fallback in case `CC-HEAD-001` doesn't exist; implementation is more rigid.

**Resolution**: explicit fallback chain documented once:
1. Use `CC-HEAD-001` if it exists (M2b seeded it).
2. Otherwise use the earliest-created `cost_centers` row.
3. Abort if `cost_centers` is empty.

**Recommended**: pick (2) as a safety net but log a warning. Both plans adopt the chain. Apply to implementation §1 M6 and data-migration §4.4.

**Where to apply**: both plans §1/§4.4.

---

## C-08 — `branch` enum assignment for imported rows  (LOW)

**What it says**: implementation §1 M2 adds `branch` enum default `operational`. Data-migration §3.4 explicitly assigns `branch = 'operational'` for all 107 imported rows. No conflict — but worth noting that the default and the explicit assignment match, and that **no imported row is a `division`**. Divisions come from M2b.

**Resolution**: no action; documenting for clarity. The data-migration code sketch should explicitly set `branch = 'operational'` (already does in §3.3).

**Where to apply**: no change.

---

## C-09 — Legacy `id` preservation undecided  (LOW)

**What it says**: SQL has `id bigint UNSIGNED` from the legacy system. Implementation plan doesn't say. Data-migration §3.4 says "discard" and lets `bigIncrements` assign fresh ids.

**Resolution**: confirm "discard" (already in data-migration). Implementation should mention this in §10 tests — e.g. assert that imported `asset_locations` don't have id = legacy id, but they have a corresponding row by `code`.

**Where to apply**: implementation §10 (add a test case), data-migration §3.4 (already correct).

---

## C-10 — `manager_id` handling for imported rows  (LOW)

**What it says**: SQL has no `manager_id`. Implementation says `manager_id` is `nullable`. Data-migration §3.4 sets `manager_id = null` for all 107 imported rows.

**Resolution**: no action; both plans agree. Documenting for clarity.

**Where to apply**: no change.

---

## C-11 — `asset_location_name` typo "Nothern RSC" not flagged  (LOW)

**What it says**: SQL has "Nothern RSC" (should be "Northern RSC"). Data-migration §7 question 5 asks "keep or fix? Recommend **keep**."

**Resolution**: keep verbatim in the import; surface as an open question for the user to decide. Add an admin "rename" task as a follow-up.

**Where to apply**: data-migration §7 (already an open question). Implementation §10 should add a test that confirms the typo row imports correctly (proves the importer doesn't normalize).

---

## C-12 — `deleted_at` column from SQL never reconciled  (LOW)

**What it says**:
- SQL has `deleted_at datetime DEFAULT NULL` (soft deletes).
- Implementation plan: "no Laravel SoftDeletes trait".
- Data-migration §1.1 recommends "skip SoftDeletes".

**Resolution**: confirmed — drop `deleted_at` from the import; the new schema doesn't have it. Both plans agree.

**Where to apply**: no change.

---

## C-13 — 14 root RSCs in SQL don't fit "single Head Office root" model  (LOW)

**What it says**:
- Implementation plan: "Head Office (root) → RSC → Region → Site" with a **single** root.
- SQL: 14 rows have `parent_id IS NULL` — these are 14 root RSCs that were never parented.

**Resolution**: M-import attaches all 14 under Head Office (data-migration §3.3 already does this). Implementation §1 M0 should note that "Head Office" is logically one root, but data envs may have multiple root RSCs in legacy data that get re-parented under Head Office on import.

**Where to apply**: implementation §1 M0 note; data-migration §3.7 (already lists this as a failure-mode note).

---

## C-14 — The plans duplicate SQL data instead of referencing it  (LOW)

**What it says**: data-migration §3.3 has an inline `LEGACY_ROWS` constant with 107 entries. This duplicates the SQL file. If the SQL changes, the migration array must be updated by hand.

**Resolution**: replace the inline array with a parse of `docs/asset_locations.sql` at migration runtime, or (more practical) maintain a single CSV file alongside the SQL and have the migration read it. For now, the simplest fix is to:
- Note that the inline array is the source of truth for the import and was generated from the SQL dump on `2026-07-28`.
- Add a `database/data/legacy_asset_locations.csv` file as the canonical source and have M-import read it via `file_get_contents()` + `str_getcsv()`.

**Recommended** (low-effort): keep the inline array for now but add a comment "Generated from `docs/asset_locations.sql` on 2026-07-28; do not edit by hand. Re-generate with `php artisan tinker --execute="…"` if the SQL changes." Add a follow-up to extract to CSV.

**Where to apply**: data-migration §3.3 + add a follow-up task.

---

## C-15 — `AssetLocation` model rewrite drops existing `parent_id` fillable guard  (LOW)

**What it says**: implementation §2 lists `$fillable = ['asset_location_name', 'code', 'type', 'description', 'is_active', 'manager_id', 'cost_center_id', 'parent_id'];`. Kalnoy's `NodeTrait` docs say `parent_id` should NOT be in `$fillable` because kalnoy manages the tree shape via `appendToNode()` etc.

**Resolution**: remove `parent_id` from `$fillable`. Use `$assetLocation->parent_id = $parent->id; $assetLocation->appendToNode($parent)->save();` in the controller.

**Where to apply**: implementation §2 `$fillable` array.

---

## C-16 — `depth` column treated as fillable in M2  (LOW)

**What it says**: implementation §2 doesn't list `depth` in `$fillable` (good), but it's worth flagging because kalnoy manages `depth` automatically. Make sure M2 doesn't add `depth` to a `protected $fillable` or someone will mass-assign it.

**Resolution**: no change needed; documenting for the implementer to double-check during PR review.

**Where to apply**: implementation §2.

---

## C-17 — M-import `parent_id` lookup walks by legacy `id` not by cost_center_id  (LOW)

**What it says**: data-migration §3.3 builds `$byCcId[$ccId] = $node;` then later looks up `$byCcId[$parentCcId]`. This works **only** because the SQL's `parent_id` column references the legacy `id`, and the legacy `id` happens to equal the legacy `cost_center_id` ordering. If the source data ever changed (e.g. legacy `id` reassigned), this would silently re-parent incorrectly.

**Resolution**: build a separate `$byLegacyId[$legacyId] = $node` and use it for parent lookups. Or simpler: rely on the SQL's documented invariant "`id == cost_center_id`" and add a test that asserts this invariant holds for the import.

**Recommended**: add a defensive check in M-import: if `array_keys($byCcId) !== array_column($byCcId, 'legacy_id')` after parsing, abort with a clear error.

**Where to apply**: data-migration §3.3 code sketch.

---

## C-18 — Head Office cost center seeded twice (M-import + M2b)  (LOW)

**What it says**: data-migration §3.3 (M-import) creates Head Office as `AssetLocation::firstOrCreate(['code' => 'HEAD'], …)`. Data-migration §4.3 (M2b) creates `CC-HEAD-001` cost center. These are different rows (one is an `asset_location`, one is a `cost_center`), but the naming is similar and could confuse implementers.

**Resolution**: no actual conflict — the two rows are distinct entities. Document clearly in both plans that `HEAD` is the asset-location code and `CC-HEAD-001` is the cost-center code. Optionally, point Head Office's `cost_center_id` at `CC-HEAD-001` in M2b.

**Where to apply**: both plans, in the respective seed sections.

---

## C-19 — M2's `code`/`type` back-fill loop is a no-op for SQL envs  (LOW)

**What it says**: implementation §1 M2 step says "back-fill `code`/`type` for legacy rows". Data-migration §4.2 says "After M-import runs, no rows are missing `code`. Back-fill loop is a no-op for SQL-imported envs."

**Resolution**: clarify in implementation that the back-fill is a safety net for **empty envs** (where M-import is no-op). In SQL-imported envs it's a no-op. The two descriptions agree in substance; align wording.

**Where to apply**: implementation §1 M2; data-migration §4.2.

---

## C-20 — Self-inconsistency: §0 says 99 CCs, §1.4 says 107, §6 expects 116  (LOW)

Same root cause as C-02. Captured separately because it appears in three different sections of the data-migration doc.

**Where to apply**: data-migration §0, §1.5, §6.

---

## Cross-cutting actions (apply once to close out multiple conflicts)

1. **Update data-migration** to use filename `2026_07_28_090050_import_existing_asset_locations.php` (closes C-01).
2. **Update data-migration** §0/§1.5/§6 to say 107 unique cost centers and 116 total (closes C-02, C-20).
3. **Update implementation** §1 M2 to remove `MIGRATED-XXXXX` and adopt `CC-XXXXXX` (closes C-03).
4. **Update implementation** §4 to remove "three-level" wording (closes C-04).
5. **Update implementation** §4 `withValidator()` to drop the `code ends 000` rule for new entries (closes C-05).
6. **Decide** Head Office `cost_center_id` policy: leave NULL, point at `CC-HEAD-001` from M2b, or never set (closes C-06). Recommend: leave NULL.
7. **Document** M6 fallback chain explicitly in both plans (closes C-07).
8. **Add** `parent_id` removal from `$fillable` (closes C-15).
9. **Add** invariant check in M-import (closes C-17).
10. **Add** `// Generated from docs/asset_locations.sql` comment to M-import (closes C-14 partially).

---

## Status

This is the live conflicts document. Each conflict has a resolution; after sign-off, both plans are rewritten to incorporate them and this document moves to `asset_location_conflicts_resolved.md` (or stays as a historical record).