# Proposal — Head Office Divisions, Cost-Center Linkage on Users/Employees/Assets

> **Status**: PROPOSAL — pending your sign-off. Once approved, this is folded into `asset_location_implementation.md` (the unified plan). Do not implement yet.

## 1. The new requirement (your latest message)

1. **Head-office divisions** also exist as cost-centers that *support* the operational hierarchy (RSC → Region → Site). Examples: Planning & Design, HR, Corporate Service, Tender & Contract, Supply & Materials Management, Finance, Audit, Director Board, etc.
2. Each of those divisions has its **own cost-center id** for costing.
3. Divisions **support** RSCs/regions/sites — they are not children of an RSC. They sit in parallel under the Head Office.
4. **Every Employee, User, and Asset must be linked to exactly one cost center** (so costs can roll up by cost center).
5. The `assets` table is still not defined — needs to be added to this slice.

## 2. Why the existing plan needs to change

The current plan only links `cost_center_id` to `asset_locations` (sites) and assumes divisions are out of scope. With this new requirement:

- `cost_centers` must be a **first-class, central reference** that Employees/Users/Assets all point at, not just Sites.
- `cost_center_id` becomes **nullable on `asset_locations`** (since RSCs/Regions and Head-Office Divisions don't have one) but **required on users/employees/assets**.
- The hierarchy is no longer a single tree — there are **two parallel trees under one "Head Office" root**:
  - **Operational tree** (operational only): Head Office → RSC → Region → Site
  - **Divisions tree** (service/support): Head Office → Division (HR, Finance, …) → optional Sub-division
- Each leaf of either tree carries a `cost_center_id`. Internal nodes (Head Office, RSC, Region) may or may not carry one depending on whether they have direct cost lines.
- A User/Employee/Asset belongs to **one operational node** (for RBAC scoping) **and** has a **cost center** (for costing). These can be the same row or different rows — example: an HR user belongs to the HR Division node (operational scope) but their cost is charged to a sub-cost-center under that division.

## 3. Proposed conceptual model

### 3.1 Two parallel hierarchies, one shared cost-center catalog

```
                          Head Office (root)
                          ┌──────────────────────┐
                          │  (no cost_center_id) │
                          └──────────────────────┘
                              /                \
                  Operational tree           Divisions tree
                  ─────────────────          ──────────────────
                  RSC  (000)        ─►        Division: HR
                  │                              │
                  Region                         Sub-Division
                  │                              │
                  Site (has cost_center_id)      Sub-Division (has cost_center_id)
```

- The "operational" branch is for **water-delivery operations** (RSC → Region → Site).
- The "divisions" branch is for **support / corporate services** (HR, Finance, Audit, Tender & Contract, Supply & Materials Management, Planning & Design, Director Board, …).
- Both branches hang off a single **Head Office** root so the whole org is in one tree (easier sidebar, one URL, one breadcrumb).
- Both branches share the same `cost_centers` catalog. A cost center can be assigned to *any* node of either branch.

### 3.2 Add a `branch` column to `asset_locations`

- `branch` enum: `operational` | `division` (default `operational` for back-compat).
- Together with `type` (rsc / region / site / division / sub_division / head_office), the `type` taxonomy becomes:
  - `head_office` — single root row
  - `rsc` — operational top
  - `region` — operational middle
  - `site` — operational leaf
  - `division` — corporate-service top (e.g. HR, Finance, Audit, Tender & Contract, Supply & Materials Management, Planning & Design, Director Board)
  - `sub_division` — corporate-service sub-unit under a division (optional)

### 3.3 Cost-center linkage becomes universal

Every "billable entity" carries a `cost_center_id`:

| Entity | `cost_center_id` |
|---|---|
| Head Office | nullable (no direct cost line) |
| RSC | nullable (cost usually rolls up to a region/site cost center) |
| Region | nullable |
| Site | **required** |
| Division | nullable |
| Sub-division | **required** |
| User | **required** |
| Employee | **required** |
| Asset | **required** |

- Drop the `unique` on `asset_locations.cost_center_id` (already in current plan). One cost center can be shared by many nodes.
- A user/employee/asset must always have a cost center, even if their operational node doesn't. (E.g. an HR Manager's operational node is the HR Division, and they belong to the HR cost center.)
- The `cost_center_id` on the node and the `cost_center_id` on the user/employee/asset can differ — and that's fine. The node's cost center is for *direct cost lines of the node* (rent, utilities, equipment for that site/division), while the user/employee/asset cost center is for *their own cost line* (salary, depreciation, etc.).

## 4. Concrete schema changes vs the current plan

### 4.1 Migrations to add/change

| # | Migration | Status |
|---|---|---|
| M0 | `2026_07_28_085500_seed_head_office_root.php` | **NEW** — inserts a single Head Office row at the root of the tree (kalnoy `saveAsRoot()`). Run before any user data migration so foreign keys can point at it. |
| M1 | `2026_07_28_090000_create_cost_centers_table.php` | unchanged from current plan |
| M2 | `2026_07_28_090100_enrich_asset_locations_table.php` | **EXPANDED** — see below |
| M2b | `2026_07_28_090150_seed_divisions_and_cost_centers.php` | **NEW** — seeds the corporate-service divisions + their cost centers as fixture data so the system is usable immediately. Seeded divisions: HR, Finance, Audit, Tender & Contract, Supply & Materials Management, Planning & Design, Corporate Service, Director Board. Seeded cost centers: one per division + one per region. |
| M3 | `2026_07_28_090200_add_asset_location_id_to_users_table.php` | **EXPANDED** — see below |
| M4 | `2026_07_28_090300_add_asset_location_id_to_employees_table.php` | **EXPANDED** — see below |
| M5 | `2026_07_28_090400_create_assets_table.php` | **NEW** — see below |
| M6 | `2026_07_28_090500_add_cost_center_id_to_users_employees_assets.php` | **NEW** — see below (or merge M3/M4/M5) |

### 4.2 M2 (expanded) — `asset_locations` enrichment

```text
type                enum extended to: head_office, rsc, region, site, division, sub_division
branch              enum: operational, division  (default operational)
code                string unique
description         text nullable
is_active           boolean default true
manager_id          unsignedBigInteger nullable FK -> users
cost_center_id      bigInteger nullable FK -> cost_centers (drop unique)
```

Drop the existing `unique` on `cost_center_id`; add `index('type')`, `index('branch')`, `index('is_active')`.

### 4.3 M3 (expanded) — `users` table

```text
asset_location_id   FK -> asset_locations  (nullable)
cost_center_id      FK -> cost_centers     (NOT NULL after backfill)
```

`cost_center_id` will be created **nullable** in the migration, then back-filled in M2b (seeder sets every user/employee to their division's cost center), then altered to NOT NULL.

### 4.4 M4 (expanded) — `employees` table

Same pattern as M3: add `cost_center_id` FK, back-fill, then NOT NULL.

### 4.5 M5 — `assets` table

```text
id
asset_location_id   FK -> asset_locations NOT NULL
cost_center_id      FK -> cost_centers    NOT NULL
asset_tag           string unique (e.g. "AS-0001")
name                string
description         text nullable
serial_number       string nullable
model_number        string nullable
manufacturer        string nullable
acquired_at         date nullable
status              enum: in_service, under_maintenance, retired, disposed
is_active           boolean default true
timestamps
```

`Asset` model gets `belongsTo(AssetLocation::class)` and `belongsTo(CostCenter::class)`, plus an `AssetLocation::assets()` `hasMany` (already declared in the model rewrite).

### 4.6 M6 — back-fill + enforce NOT NULL on cost_center_id

This is a **data migration** (not just schema):

```php
// 1. For every user: cost_center_id = users.asset_location.cost_center_id (or default Head Office fallback)
// 2. For every employee: cost_center_id = employees.asset_location.cost_center_id (or default fallback)
// 3. For every existing asset: same
// 4. Then ALTER TABLE ... MODIFY cost_center_id BIGINT UNSIGNED NOT NULL
```

## 5. RBAC & scoping update

The current `User::accessibleAssetLocations()` helper scopes to **one subtree** (the user's asset_location). With divisions:

- **Operational user** (RSC/Region/Site): scoped to operational subtree via `_lft/_rgt` — unchanged.
- **Division user** (HR Manager, Finance Officer): scoped to the division + its sub-divisions — same `_lft/_rgt` mechanism works because divisions are in the same tree.
- **Head Office user**: see all — admin shortcut (or `branch IN (operational, division)`).
- **Cross-branch access** (e.g. HR Manager wants to see all sites for headcount reporting): **proposed — out of scope for v1**, requires a `cross_branch_access` permission per user. We'll surface it later.

The helper stays the same code; only the `types` constant and the seeded fixture data change.

## 6. Cost-center as the cross-cutting reporting axis

Now that **every user/employee/asset carries a `cost_center_id`**, the system gets two orthogonal slicing dimensions for free:

| Slice by | How |
|---|---|
| **Organizational hierarchy** | `asset_locations` tree (RSC/Region/Site/Division/Sub-division) |
| **Cost center** | `cost_centers` lookup, joined through users/employees/assets |

A query like "total maintenance cost for cost center CC-001 last quarter" joins `assets.cost_center_id` → `cost_centers`, groups by cost center. No tree traversal needed.

A query like "headcount in the Western Region" uses the operational tree. No cost-center join needed.

A query like "headcount + assets + spend for cost center CC-001" uses cost center + joins to `users.cost_center_id`, `assets.cost_center_id`, `cost_center_spend` (future table).

## 7. Impact on the existing implementation plan

If you approve this proposal, the following sections of `asset_location_implementation.md` change:

### Changes to §1 (Migrations)
- Add **M0** (seed Head Office root) before M1.
- Add **M2b** (seed divisions + cost centers) after M2.
- **Expand M3/M4** to include `cost_center_id` (nullable initially).
- Add **M5** (`assets` table).
- Add **M6** (back-fill + enforce NOT NULL).
- Renumber accordingly.

### Changes to §2 (Models)
- `AssetLocation`: extend `TYPES` constant to include `head_office`, `division`, `sub_division`; add `branch` cast; add `scopeOfBranch($q, string)`; add `ancestorsOfType()` and `descendantsOfType()` helpers; remove the placeholder `assets()` from "deferred" — it becomes real in M5.
- `CostCenter`: unchanged.
- `Asset` (new): full implementation (was deferred; now in scope).
- `User`: add `costCenter(): BelongsTo`; `cost_center_id` becomes effectively required.
- `Employee`: add `costCenter(): BelongsTo`; `cost_center_id` becomes effectively required.

### Changes to §3 (RBAC)
- Add a new permission group `divisions` with the same four verbs? **Or** reuse `asset_locations.*` for divisions too — recommended for v1 to keep permissions simple. Confirms that "Asset Locations" really means "the whole org tree" in the UI.

### Changes to §4 (Form Request)
- Add `branch` to rules (optional on create; default `operational`).
- Add `type` allowed list extended to include `head_office`, `division`, `sub_division`.
- Add `withValidator()` rules:
  - `type=head_office` → `parent_id` must be null and only one such row allowed (DB unique partial index or app-level check).
  - `type=division` or `type=sub_division` → `branch` must be `division`.
  - `type in (rsc, region, site)` → `branch` must be `operational`.

### Changes to §5 (Controller)
- `create()` returns `parents` filtered by **branch** in addition to user permission: an RSC user sees region rows in `branch=operational`; an HR Manager sees division + sub_division rows in `branch=division`; the controller also returns the Head Office row only if the current user is admin.
- `index()` adds a `branch` filter alongside `type` and `is_active`.

### Changes to §7 (Inertia pages)
- `index.tsx`: add a `branch` filter chip (Operational / Divisions / All). Group the tree view by branch.
- `create.tsx`/`edit.tsx`: add a `branch` Select that toggles which `type` values are visible.
- `show.tsx`: show the branch in the hero block; show the cost-center prominently.

### Changes to §8 (Sidebar)
- The "Asset Locations" entry should be renamed **"Organization"** (or "Org Structure") since it now covers divisions too.
- Add a sub-section or tabbed view for Divisions vs Operations.
- Add a top-level **"Cost Centers"** item for admins (view the catalog + tree).

### Changes to §10 (Tests)
- Add cases for division-scoped user, cross-branch denial, head-office user, cost-center back-fill, asset CRUD with cost-center requirement.

### Changes to §11 (Implementation Order)
- Insert M0 (Head Office seed) and M2b (divisions seed) at the right step.
- Add Asset model + migration + factory.
- Add factories: `DivisionFactory`, `HeadOfficeFactory`.
- Update existing tests to set `cost_center_id` on every user/employee fixture.

## 8. Open questions for you before I fold this into the plan

1. **Sidebar naming**: rename "Asset Locations" → "Organization"? Or keep "Asset Locations" and put divisions under a separate sidebar item? (I'd recommend "Organization" with a "Divisions" sub-item.)

2. **Type taxonomy**: should I keep `division` and `sub_division` as separate types, or merge them into one `division` type with unlimited depth (which kalnoy already supports via `_lft/_rgt`)? The latter is simpler; the former is more explicit for reporting. I recommend **one type `division` with unlimited depth** to keep the model clean — kalnoy already enforces the tree shape.

3. **Asset table scope for this slice**: now that the asset table is needed, do you want full CRUD for assets in this same slice, or just the schema + relationships and let the asset CRUD UI come later? I'd recommend **schema + relationships + minimal read-only "Assets under this location" view on the asset-locations show page** to keep the slice focused.

4. **Cost center back-fill strategy**: when migrating existing users/employees, do you want me to default their `cost_center_id` to the **Head Office's** cost center (creating one if it doesn't exist), or leave them NULL and require manual assignment? I'd recommend a `Head Office` cost center created in the M2b seed, with all existing users/employees pointed at it — then a one-time data-cleanup task can redistribute.

5. **Cross-branch access**: do you need to support HR users seeing operational data (or vice versa) for this slice, or is strict branch isolation fine for v1? Strict isolation is cleaner; if you need cross-branch access, that's a follow-up with a per-user override permission.

6. **Divisions fixture list**: confirm the seed list — currently I'm proposing: HR, Finance, Audit, Tender & Contract, Supply & Materials Management, Planning & Design, Corporate Service, Director Board. Add/remove anything?

---

## 9. What changes from your perspective after sign-off

- `asset_location_implementation.md` gets rewritten in place: new M0/M2b/M5/M6, expanded M2-M4, expanded model layer (Asset, AssetLocation branch/type extensions), updated RBAC, expanded form request, updated controller lookups, updated sidebar naming, expanded tests.
- The plan is **bigger in scope** (now includes the asset table schema) but **simpler in concept** (one tree, two branches, one cost-center catalog).
- Implementation cost roughly **doubles** (5 new migrations vs 4, plus an Asset model/factory/controller route/page or stub). Still achievable in one slice if you say yes to all of the above.

Reply with answers to the six open questions (or "approve all your recommendations") and I'll fold this into the plan.