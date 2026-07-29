# User Accounts & Roles Proposal — ISO 55000 Water-Utility CMMS

**Document type:** Implementation proposal (proposal + full implementation plan)
**Aligned to:** `docs/SRS.md` v2.0 (FR-01…FR-09, NFR-01, NFR-02, NFR-05) · `docs/DFD_NEW.md` v2 (ISO 55000-aligned, DFD §3.2 controller map, §11.2 RBAC)
**Status:** Draft for Review
**Supersedes:** `plans/authentication.md` and the seeders / controllers / walkthroughs shipped under the legacy 5-role catalog (`admin` / `manager` / `supervisor` / `operator` / `viewer`)

---

## Table of Contents

1. [Context & Scope](#1-context--scope)
2. [Stakeholder-to-Role Mapping](#2-stakeholder-to-role-mapping)
3. [Proposed Role Catalog (14 roles)](#3-proposed-role-catalog-14-roles)
4. [Proposed Permission Catalog (93 permissions, 20 groups)](#4-proposed-permission-catalog-93-permissions-20-groups)
5. [Role ↔ Permission Matrix](#5-role--permission-matrix)
6. [Approval Workflow (FR-08 / FR-09)](#6-approval-workflow-fr-08--fr-09)
7. [Database Changes](#7-database-changes)
8. [Data Migration for Existing Users](#8-data-migration-for-existing-users)
9. [File-level Implementation Map](#9-file-level-implementation-map)
10. [Verification Plan](#10-verification-plan)
11. [Risks & Mitigations](#11-risks--mitigations)
12. [Effort Estimate](#12-effort-estimate)
13. [Out of Scope / Future Work](#13-out-of-scope--future-work)

---

## 1. Context & Scope

### 1.1 What the SRS requires

`docs/SRS.md` defines an **ISO 55000-aligned water-utility asset management / CMMS** platform. The functional requirements that drive the user / role / permission model are:

| FR | Requirement | Implication for RBAC |
|---|---|---|
| **FR-01** | The system shall support user authentication. | One login flow, all roles; Laravel Fortify already in place. |
| **FR-02** | The system shall allow authorized administrators to create, view, edit, and manage users. | Need an admin-only "User Management" gate. |
| **FR-03** | The system shall support user profile display, profile editing, password updates, and profile settings management. | Self-service profile already implemented; no RBAC change. |
| **FR-04** | The system shall implement Role-Based Access Control (RBAC). | Need a full role × permission matrix covering every functional area. |
| **FR-05** | The system shall manage employee records, including creation, listing, viewing, editing, updating, and deletion. | Need an admin/HR gate for employee CRUD. |
| **FR-08** | The system shall support asset deletion through a controlled workflow: request → recommendation → approval, with final approval requiring sign-off from a corporate-level finance and audit user. | Need a three-stage approval gate; `corporate-finance-audit` is the final approver. |
| **FR-09** | The system shall apply the same controlled request–recommendation–approval workflow (as FR-08) to asset disposal. | Same approval engine, same corporate-finance-audit final approver. |
| **NFR-01** | The system shall protect authenticated workflows using Laravel authentication and middleware. | Middleware-based authorization required. |
| **NFR-02** | Administrative and restricted functions shall require appropriate permissions or middleware checks. | No route may be admin-only-by-string; must use permission checks. |
| **NFR-05** | Usability — feature screens shall remain grouped by operational area (assets, work orders, operations, lab, energy). | Sidebar must be permission-gated by *operational area*. |

### 1.2 What already exists

The current implementation (per `walkthrough/AUTH_MODULE_ENHANCEMENTS_SUMMARY.md` and `walkthrough/ADMIN_RBAC_AND_ADMIN_PAGES_FIX.md`) ships:

- Laravel Fortify (login, registration, password reset, 2FA, email verification) — ✅ meets FR-01, FR-03.
- `users` table with a legacy `role` ENUM column (`admin` / `manager` / `user`) — superseded by the `roles` / `role_user` pivot.
- `User` model with `hasRole()`, `hasPermission()`, `getAllPermissions()` — helper methods in good shape.
- `roles`, `permissions`, `role_user`, `permission_role` tables — schema is fine, only the data is too generic.
- `employees` table linked to `users` with `position_title`, `department`, `supervisor_id`, `certifications`, `training_records` — schema is fine.
- Admin CRUD UI for `users`, `employees`, `roles`, `permissions` (12 Inertia pages rewritten per `walkthrough/ADMIN_UI_PAGES_FULL_REWRITE.md`) — reusable for the new catalog with only minor edits to the `can[]` arrays.
- `resources/js/components/app-sidebar.tsx` permission-gated via `user.permissions[]` — needs new permission names added.
- `resources/js/lib/route.ts` shim providing global `route()` — works for new routes unchanged.
- `app/Http/Middleware/CheckRole.php` — the *only* consumer of the legacy `users.role` ENUM column. Will be rewritten to use the `roles` pivot.
- Policies `UserPolicy`, `EmployeePolicy`, `RolePolicy`, `PermissionPolicy` referenced by `AppServiceProvider` but **not yet committed** (mentioned in walkthrough summary) — will be re-created.

### 1.3 What this proposal changes

This proposal **replaces** the generic role catalog (admin/manager/supervisor/operator/viewer + 19 permissions in 5 groups) with a **domain-aligned catalog** of **14 roles** and **93 permissions in 20 groups**, mapped 1:1 to the SRS §5 stakeholders and the DFD §3.2 functional modules. The existing scaffolding (Laravel Fortify, pivot tables, controller patterns, Inertia admin pages, sidebar permission gating, route shim) is **retained**; only the data (seeders) and the legacy role middleware are rewritten.

**Out of scope for v1** (deferred to a separate plan): corporate/regional/site organizational-level scope on employees (SRS §3 multi-tier analytics). See §13.

---

## 2. Stakeholder-to-Role Mapping

This table maps every stakeholder from `docs/SRS.md` §5 to one or more of the proposed roles in §3. Multiple stakeholders may map to a single role when their operational needs are identical.

| SRS §5 Stakeholder | Primary Role(s) | Secondary / Supporting Role(s) |
|---|---|---|
| Executive Management | `executive-management` | `corporate-finance-audit` |
| Asset Manager | `asset-manager` | `maintenance-supervisor` |
| Operations Team | `operations-team` | `maintenance-operator` |
| Maintenance Team | `maintenance-operator` | `maintenance-supervisor` |
| Finance Department | `finance-officer` | `corporate-finance-audit` |
| Risk Management Team | `risk-management` | `corporate-finance-audit` |
| Engineering / Technical Team | `engineering` | `risk-management` |
| Procurement / Supply Chain | `procurement` | — |
| Quality & Compliance Team | `quality-compliance` | `corporate-finance-audit` |
| Health, Safety & Environment (HSE) | `hse-officer` | `quality-compliance` |
| IT / Data Management | `system-administrator` | `viewer` |
| Employees | (their operational role) | `viewer` |
| Suppliers & Contractors | (external — no role) | — |
| Customers | (external — no role) | — |
| Regulators / Government | (external — no role, read-only via `viewer`) | `viewer` |
| Investors / Owners / Shareholders | `executive-management` | `viewer` |
| Local Community | (external — no role) | — |

The "external — no role" rows represent stakeholders that interact with the system only via reports, exports, or regulator-facing PDFs; they have no user accounts.

---

## 3. Proposed Role Catalog (14 roles)

Each role has a `name` (slug, used in code), `display_name` (UI), `category` (used for grouping in the admin UI and for filtering the role picker), `description`, and default permission grants (the full list is in §5).

| # | `name` (slug) | `display_name` | `category` | Mapped Stakeholder(s) | Summary |
|---|---|---|---|---|---|
| 1 | `system-administrator` | System Administrator | administration | IT / Data Management | Full access; platform owner. The only role that can edit the permission catalog. |
| 2 | `executive-management` | Executive Management | administration | Executive Management, Investors | Read-only across all modules; can view executive dashboards and exports. |
| 3 | `asset-manager` | Asset Manager | asset-management | Asset Manager | Manages the asset register, classifications, locations, categories; approves work orders and asset deletion/disposal **requests**. |
| 4 | `maintenance-supervisor` | Maintenance Supervisor | maintenance | Asset Manager, Operations Team | Approves work orders; assigns personnel; manages preventive maintenance schedules; oversees maintenance team. |
| 5 | `maintenance-operator` | Maintenance Operator | maintenance | Maintenance Team, Operations Team | Creates and executes work orders, records parts / meters / notes, closes work orders. |
| 6 | `operations-team` | Operations Team | asset-management | Operations Team | Day-to-day operational viewing; logs asset usage and downtime. |
| 7 | `procurement` | Procurement Officer | acquisition | Procurement / Supply Chain | Creates asset acquisitions; generates utility asset IDs and QR codes; captures GIS geometry. |
| 8 | `engineering` | Engineering / Technical | asset-management | Engineering / Technical Team | Updates asset technical specs; supports asset classification and condition assessment. |
| 9 | `finance-officer` | Finance Officer | finance | Finance Department | Captures initial asset value; runs depreciation; manages finance ledger; views financial reports. |
| 10 | `corporate-finance-audit` | Corporate Finance & Audit Approver | finance | Finance, Quality & Compliance, Executive Management | **Final approver** for asset deletion (FR-08) and asset disposal (FR-09). Restricted, non-delegable role. |
| 11 | `risk-management` | Risk Management | audit | Risk Management Team | Performs risk-based condition scoring during audits; flags at-risk assets; can **recommend** disposal. |
| 12 | `quality-compliance` | Quality & Compliance | audit | Quality & Compliance, HSE | Schedules and performs audits; records findings; views compliance reports. |
| 13 | `hse-officer` | Health, Safety & Environment | audit | HSE | Logs safety incidents and condition flags; views HSE dashboards. |
| 14 | `viewer` | Viewer (read-only) | administration | Employees, Regulators | Read-only across all resources; no edit, delete, or approve rights. |

> **Note on legacy roles:** The 5 legacy roles (`admin`, `manager`, `supervisor`, `operator`, `viewer`) are **replaced** — not retained as aliases — per the user's confirmed decision. The data migration in §8 reassigns every existing user to the closest new-role equivalent.

---

## 4. Proposed Permission Catalog (93 permissions, 20 groups)

Each permission has a `name` (slug), `display_name`, `group` (used for grouping in the admin UI), and `description`. Naming follows the convention `<resource>.<verb>` so the sidebar and `can[]` checks are uniform.

### 4.1 Permission groups (20)

| # | Group | DFD process / module | Notes |
|---|---|---|---|
| 1 | `users` | 1.0 User & Admin Management | Existing group, names preserved. |
| 2 | `employees` | 1.0 User & Admin Management | Existing group, names preserved. |
| 3 | `roles` | 1.0 User & Admin Management | Existing group, names preserved. |
| 4 | `permissions` | 1.0 User & Admin Management | Existing group, names preserved. |
| 5 | `settings` | 1.0 User & Admin Management | Existing group, names preserved. |
| 6 | `departments` | 1.0 User & Admin Management | **New** — first-class reference data for employee organisation. |
| 7 | `assets` | 3.0 Asset Management | **New** — covers the asset register, GIS, condition scoring. |
| 8 | `asset-classifications` | 3.0 Asset Management | **New** — ISO 55000 L1–L8 classification tree. |
| 9 | `asset-locations` | 3.0 Asset Management | **New** — facility / nested-set location tree. |
| 10 | `asset-categories` | 3.0 Asset Management | **New** — category tree (legacy + ISO bridge). |
| 11 | `acquisitions` | 2.0 Asset Acquisition | **New** — procurement intake, ID generation, QR, GIS. |
| 12 | `work-orders` | 4.0 Work Orders & Maintenance | **New** — WO lifecycle, approval, assignment. |
| 13 | `scheduled-maintenance` | 4.0 Work Orders & Maintenance | **New** — PPM schedules, task groups. |
| 14 | `stock` | 5.0 Stock / Materials | **New** — stock codes, issue / receipt. |
| 15 | `finance` | 7.0 Asset Finance | **New** — depreciation, valuation, exports. |
| 16 | `audit` | 8.0 Asset Audit | **New** — scheduling, condition/risk scoring, findings. |
| 17 | `disposal` | 9.0 Asset Disposal | **New** — multi-stage approval workflow (FR-08 / FR-09). |
| 18 | `analytics` | 6.0 Analytics, Charts & Reports | **New** — dashboards, PDF/CSV/XLS exports. |
| 19 | `events` | 1.0 User & Admin Management | **New** — calendar events and fast-events. |
| 20 | `admin-files` | 1.0 User & Admin Management | **New** — administrative file repository. |

### 4.2 Permission definitions

The 93 permission names below. The verb suffix is one of `view` / `create` / `edit` / `delete` / `manage`, plus module-specific verbs (`approve`, `run-depreciation`, `score-condition`, `score-risk`, `dispose`, `recommend`, `close`, `reopen`).

#### 4.2.1 Group `users` (5)

| Name | Display | Description |
|---|---|---|
| `users.view` | View Users | See the user list and individual users. |
| `users.create` | Create Users | Add new user accounts. |
| `users.edit` | Edit Users | Update existing user accounts. |
| `users.delete` | Delete Users | Deactivate user accounts. |
| `users.manage` | Manage Users | Assign roles, reset passwords, force logout. |

#### 4.2.2 Group `employees` (4)

| Name | Display | Description |
|---|---|---|
| `employees.view` | View Employees | See the employee list and individual employees. |
| `employees.create` | Create Employees | Add new employees. |
| `employees.edit` | Edit Employees | Update employee records. |
| `employees.delete` | Delete Employees | Soft-delete employee records. |

#### 4.2.3 Group `roles` (4)

| Name | Display | Description |
|---|---|---|
| `roles.view` | View Roles | See the list of roles. |
| `roles.create` | Create Roles | Define new roles. |
| `roles.edit` | Edit Roles | Update role definitions. |
| `roles.delete` | Delete Roles | Remove roles (only when no users are assigned). |

#### 4.2.4 Group `permissions` (4)

| Name | Display | Description |
|---|---|---|
| `permissions.view` | View Permissions | See the permission catalog. |
| `permissions.create` | Create Permissions | Add new permissions. |
| `permissions.edit` | Edit Permissions | Update permission names and descriptions. |
| `permissions.delete` | Delete Permissions | Remove permissions. |

> Only `system-administrator` receives `permissions.create` / `permissions.edit` / `permissions.delete`. Other roles may hold `permissions.view` for transparency.

#### 4.2.5 Group `settings` (2)

| Name | Display | Description |
|---|---|---|
| `settings.view` | View Settings | See application settings. |
| `settings.edit` | Edit Settings | Update application settings. |

#### 4.2.6 Group `departments` (4) — **new**

| Name | Display | Description |
|---|---|---|
| `departments.view` | View Departments | See the department list. |
| `departments.create` | Create Departments | Add new departments. |
| `departments.edit` | Edit Departments | Update department records. |
| `departments.delete` | Delete Departments | Remove departments. |

#### 4.2.7 Group `assets` (8) — **new**

| Name | Display | Description |
|---|---|---|
| `assets.view` | View Assets | See the asset register and individual assets. |
| `assets.create` | Create Assets | Register new assets. |
| `assets.edit` | Edit Assets | Update asset records. |
| `assets.delete` | Delete Assets | Soft-delete assets (requires FR-08 approval). |
| `assets.manage` | Manage Assets | Bulk actions, reclassification, transfers. |
| `assets.score-condition` | Score Asset Condition | Record engineering condition score during audit. |
| `assets.score-risk` | Score Asset Risk | Record risk-based scoring (probability × consequence). |
| `assets.view-gis` | View GIS Map | See the GIS map view of assets. |

#### 4.2.8 Group `asset-classifications` (4) — **new**

| Name | Display | Description |
|---|---|---|
| `asset-classifications.view` | View Classifications | See the ISO 55000 L1–L8 classification tree. |
| `asset-classifications.create` | Create Classifications | Add new classification nodes. |
| `asset-classifications.edit` | Edit Classifications | Update classification nodes. |
| `asset-classifications.delete` | Delete Classifications | Remove classification nodes. |

#### 4.2.9 Group `asset-locations` (4) — **new**

| Name | Display | Description |
|---|---|---|
| `asset-locations.view` | View Locations | See the location tree. |
| `asset-locations.create` | Create Locations | Add new locations. |
| `asset-locations.edit` | Edit Locations | Update location records. |
| `asset-locations.delete` | Delete Locations | Remove locations. |

#### 4.2.10 Group `asset-categories` (4) — **new**

| Name | Display | Description |
|---|---|---|
| `asset-categories.view` | View Categories | See the category tree. |
| `asset-categories.create` | Create Categories | Add new categories. |
| `asset-categories.edit` | Edit Categories | Update category records. |
| `asset-categories.delete` | Delete Categories | Remove categories. |

#### 4.2.11 Group `acquisitions` (6) — **new**

| Name | Display | Description |
|---|---|---|
| `acquisitions.view` | View Acquisitions | See acquisition intake records. |
| `acquisitions.create` | Create Acquisitions | Create a new acquisition intake (PO, supplier, warranty). |
| `acquisitions.edit` | Edit Acquisitions | Update acquisition records. |
| `acquisitions.delete` | Delete Acquisitions | Remove acquisition intake records. |
| `acquisitions.generate-asset-id` | Generate Asset ID | Trigger unique utility asset ID generation. |
| `acquisitions.generate-qr` | Generate QR Code | Generate QR code for an asset. |

#### 4.2.12 Group `work-orders` (7) — **new**

| Name | Display | Description |
|---|---|---|
| `work-orders.view` | View Work Orders | See the work-order list and details. |
| `work-orders.create` | Create Work Orders | Create a new work order (manual or from schedule). |
| `work-orders.edit` | Edit Work Orders | Update an existing work order. |
| `work-orders.delete` | Delete Work Orders | Remove a work order. |
| `work-orders.approve` | Approve Work Orders | Approve or reject a work order. |
| `work-orders.close` | Close Work Orders | Close a completed work order. |
| `work-orders.reopen` | Reopen Work Orders | Reopen a previously closed work order. |

#### 4.2.13 Group `scheduled-maintenance` (4) — **new**

| Name | Display | Description |
|---|---|---|
| `scheduled-maintenance.view` | View Schedules | See the PPM schedule list. |
| `scheduled-maintenance.create` | Create Schedules | Add a new PPM schedule. |
| `scheduled-maintenance.edit` | Edit Schedules | Update PPM schedules (reschedule, reassign). |
| `scheduled-maintenance.delete` | Delete Schedules | Remove PPM schedules. |

#### 4.2.14 Group `stock` (5) — **new**

| Name | Display | Description |
|---|---|---|
| `stock.view` | View Stock | See stock balances and movements. |
| `stock.create` | Create Stock | Add new stock records. |
| `stock.edit` | Edit Stock | Update stock records. |
| `stock.delete` | Delete Stock | Remove stock records. |
| `stock.issue` | Issue Stock | Issue stock to a work order. |

#### 4.2.15 Group `finance` (6) — **new**

| Name | Display | Description |
|---|---|---|
| `finance.view` | View Finance | See the asset finance ledger and dashboards. |
| `finance.create` | Create Finance Records | Create a finance ledger entry. |
| `finance.edit` | Edit Finance Records | Update ledger entries (corrections as new entries). |
| `finance.delete` | Delete Finance Records | Reverse a ledger entry. |
| `finance.run-depreciation` | Run Depreciation | Trigger the monthly depreciation job. |
| `finance.export` | Export Finance Reports | Generate PDF/CSV/XLS finance reports. |

#### 4.2.16 Group `audit` (6) — **new**

| Name | Display | Description |
|---|---|---|
| `audit.view` | View Audits | See the audit list and findings. |
| `audit.create` | Schedule Audits | Create a new audit (periodic or ad-hoc). |
| `audit.edit` | Edit Audits | Update audit records. |
| `audit.delete` | Delete Audits | Remove audit records. |
| `audit.score-condition` | Score Condition | Perform engineering condition assessment. |
| `audit.score-risk` | Score Risk | Apply risk-based scoring. |

#### 4.2.17 Group `disposal` (5) — **new** (FR-08 / FR-09)

| Name | Display | Description |
|---|---|---|
| `disposal.view` | View Disposals | See disposal / deletion requests. |
| `disposal.create` | Request Disposal | Submit a disposal or deletion request. |
| `disposal.recommend` | Recommend Disposal | Engineering / Risk technical recommendation (stage 2). |
| `disposal.approve` | Approve Disposal | Corporate Finance & Audit final approval (stage 3). |
| `disposal.execute` | Execute Disposal | Execute the disposal (post write-off, retire asset). |

#### 4.2.18 Group `analytics` (3) — **new**

| Name | Display | Description |
|---|---|---|
| `analytics.view` | View Analytics | See analytics dashboards. |
| `analytics.export` | Export Reports | Generate PDF/CSV/XLS reports. |
| `analytics.create` | Create Reports | Save custom report definitions. |

#### 4.2.19 Group `events` (4) — **new**

| Name | Display | Description |
|---|---|---|
| `events.view` | View Events | See calendar events. |
| `events.create` | Create Events | Add new calendar events. |
| `events.edit` | Edit Events | Update calendar events. |
| `events.delete` | Delete Events | Remove calendar events. |

#### 4.2.20 Group `admin-files` (4) — **new**

| Name | Display | Description |
|---|---|---|
| `admin-files.view` | View Admin Files | See administrative files. |
| `admin-files.create` | Upload Admin Files | Upload new files. |
| `admin-files.edit` | Edit Admin Files | Update file metadata. |
| `admin-files.delete` | Delete Admin Files | Remove files. |

### 4.3 Total permission count

5 + 4 + 4 + 4 + 2 + 4 + 8 + 4 + 4 + 4 + 6 + 7 + 4 + 5 + 6 + 6 + 5 + 3 + 4 + 4 = **93 permissions** across 20 groups.

---

## 5. Role ↔ Permission Matrix

The matrix below lists, for each of the 14 roles, the set of permissions granted. Implementation lives in the new `PermissionRoleSeeder` (see §7).

### 5.1 `system-administrator`

**All 93 permissions.** Equivalent to the legacy `admin` role. Intended for IT / data management staff only.

### 5.2 `executive-management`

Read + export across the board, no edit / approve rights.

- `users.view`, `employees.view`, `roles.view`, `permissions.view`, `settings.view`
- `departments.view`
- `assets.view`, `asset-classifications.view`, `asset-locations.view`, `asset-categories.view`
- `acquisitions.view`
- `work-orders.view`
- `scheduled-maintenance.view`
- `stock.view`
- `finance.view`, `finance.export`
- `audit.view`
- `disposal.view`
- `analytics.view`, `analytics.export`
- `events.view`
- `admin-files.view`

### 5.3 `asset-manager`

Owns the asset register; can edit assets, classifications, locations, categories; can approve work orders; can **request** disposal.

- All `executive-management` permissions, **plus:**
- `users.manage` (limited to assigning asset-team roles)
- `employees.create`, `employees.edit`
- `assets.create`, `assets.edit`, `assets.manage`, `assets.view-gis`
- `asset-classifications.create`, `asset-classifications.edit`
- `asset-locations.create`, `asset-locations.edit`
- `asset-categories.create`, `asset-categories.edit`
- `acquisitions.create`, `acquisitions.edit`, `acquisitions.generate-asset-id`, `acquisitions.generate-qr`
- `work-orders.create`, `work-orders.edit`, `work-orders.approve`, `work-orders.reopen`
- `scheduled-maintenance.create`, `scheduled-maintenance.edit`
- `disposal.create`
- `events.create`, `events.edit`

### 5.4 `maintenance-supervisor`

Supervises the maintenance team; approves work orders.

- `users.view`, `employees.view`, `employees.edit`
- `assets.view`, `assets.view-gis`
- `work-orders.view`, `work-orders.create`, `work-orders.edit`, `work-orders.approve`, `work-orders.reopen`
- `scheduled-maintenance.view`, `scheduled-maintenance.create`, `scheduled-maintenance.edit`
- `stock.view`, `stock.issue`
- `disposal.create`
- `events.view`, `events.create`, `events.edit`
- `analytics.view`

### 5.5 `maintenance-operator`

Day-to-day maintenance work order creation and execution.

- `users.view`, `employees.view`
- `assets.view`, `assets.view-gis`
- `work-orders.view`, `work-orders.create`, `work-orders.edit`, `work-orders.close`
- `scheduled-maintenance.view`
- `stock.view`, `stock.issue`
- `disposal.create` (can raise a disposal request)
- `events.view`, `events.create`
- `analytics.view`

### 5.6 `operations-team`

Read-only on the asset register; logs asset usage / downtime (out of scope in v1; placeholder for the future `assets.log-usage` permission).

- `users.view`, `employees.view`
- `assets.view`, `assets.view-gis`
- `work-orders.view`
- `scheduled-maintenance.view`
- `stock.view`
- `events.view`, `events.create`
- `analytics.view`

### 5.7 `procurement`

Owns the acquisition module; creates acquisitions, generates asset IDs and QR codes, captures GIS.

- `users.view`, `employees.view`
- `assets.view`, `assets.view-gis`
- `asset-classifications.view`
- `asset-locations.view`, `asset-locations.edit`
- `acquisitions.view`, `acquisitions.create`, `acquisitions.edit`, `acquisitions.generate-asset-id`, `acquisitions.generate-qr`
- `events.view`
- `analytics.view`

### 5.8 `engineering`

Updates asset technical specs; supports condition assessment.

- `users.view`, `employees.view`
- `assets.view`, `assets.create`, `assets.edit`, `assets.view-gis`, `assets.score-condition`
- `asset-classifications.view`, `asset-classifications.edit`
- `asset-locations.view`
- `acquisitions.view`
- `work-orders.view`, `work-orders.edit`
- `audit.view`, `audit.score-condition`
- `disposal.view`, `disposal.recommend` (stage 2)
- `events.view`
- `analytics.view`

### 5.9 `finance-officer`

Owns the finance module; runs depreciation, manages ledger.

- `users.view`, `employees.view`
- `assets.view`
- `acquisitions.view`
- `work-orders.view`
- `stock.view`
- `finance.view`, `finance.create`, `finance.edit`, `finance.run-depreciation`, `finance.export`
- `disposal.view`
- `analytics.view`, `analytics.export`

### 5.10 `corporate-finance-audit`

**Final approver** for asset deletion and disposal (FR-08 / FR-09). Restricted role; no day-to-day data-entry rights.

- `users.view`, `employees.view`
- `assets.view`
- `acquisitions.view`
- `work-orders.view`
- `finance.view`, `finance.export`
- `audit.view`
- `disposal.view`, `disposal.approve` (stage 3 — final sign-off)
- `analytics.view`, `analytics.export`

### 5.11 `risk-management`

Performs risk-based scoring; recommends disposal.

- `users.view`, `employees.view`
- `assets.view`, `assets.score-risk`
- `work-orders.view`
- `audit.view`, `audit.create`, `audit.edit`, `audit.score-risk`
- `disposal.view`, `disposal.recommend` (stage 2)
- `analytics.view`, `analytics.export`

### 5.12 `quality-compliance`

Schedules and performs audits; records findings.

- `users.view`, `employees.view`
- `assets.view`
- `work-orders.view`
- `audit.view`, `audit.create`, `audit.edit`, `audit.delete`, `audit.score-condition`, `audit.score-risk`
- `disposal.view`
- `analytics.view`, `analytics.export`
- `admin-files.view`, `admin-files.create`, `admin-files.edit`

### 5.13 `hse-officer`

Logs safety incidents; views HSE dashboards.

- `users.view`, `employees.view`
- `assets.view`, `assets.view-gis`
- `work-orders.view`
- `audit.view`
- `events.view`, `events.create`
- `analytics.view`

### 5.14 `viewer`

Read-only across the board. Safe default for any non-domain user.

- `users.view`, `employees.view`, `roles.view`, `permissions.view`, `settings.view`
- `departments.view`
- `assets.view`, `asset-classifications.view`, `asset-locations.view`, `asset-categories.view`
- `acquisitions.view`
- `work-orders.view`
- `scheduled-maintenance.view`
- `stock.view`
- `finance.view`
- `audit.view`
- `disposal.view`
- `analytics.view`
- `events.view`
- `admin-files.view`

---

## 6. Approval Workflow (FR-08 / FR-09)

Both asset deletion (FR-08) and asset disposal (FR-09 / FR-34) share a single **three-stage approval engine**, implemented as a Laravel middleware + state machine on a new `approval_stages` table.

### 6.1 Stages

| Stage | Name | Required role(s) | What happens |
|---|---|---|---|
| 1 | `requested` | `asset-manager`, `maintenance-supervisor`, `maintenance-operator` | Requestor submits the disposal / deletion request with justification, audit findings, and current condition. |
| 2 | `recommended` | `engineering`, `risk-management` | Recommender evaluates the request on technical / risk grounds. May return to requestor with a reason, or forward with a recommendation. |
| 3 | `approved` | `corporate-finance-audit` | Final, non-delegable sign-off. On approval, the asset transitions to `disposed`. |

### 6.2 Middleware design

A new middleware `app/Http/Middleware/EnsureApprovalStage.php` enforces stage-correct roles:

```php
public function handle(Request $request, Closure $next, string $stage): Response
{
    $user = $request->user();
    $disposal = $request->route('disposal');

    $stageRoleMap = [
        'requested'   => ['asset-manager', 'maintenance-supervisor', 'maintenance-operator'],
        'recommended' => ['engineering', 'risk-management'],
        'approved'    => ['corporate-finance-audit'],
    ];

    abort_unless(
        isset($stageRoleMap[$stage])
            && $user->hasAnyRole($stageRoleMap[$stage]),
        403,
    );

    return $next($request);
}
```

### 6.3 Route mapping (for the future `AssetDisposalController`)

```
POST   /asset-disposals                       → store        (middleware: disposal.create)
POST   /asset-disposals/{disposal}/recommend  → recommend    (middleware: EnsureApprovalStage:recommended)
POST   /asset-disposals/{disposal}/approve    → approve      (middleware: EnsureApprovalStage:approved)
POST   /assets/{asset}/delete-request         → requestDeletion (middleware: disposal.create)
```

In the current proposal, only the **permission names** are introduced. The `AssetDisposalController` itself is a separate plan; the routes above are stubs added to `routes/web.php` and gated by permission middleware, so when the disposal controller lands, the RBAC is already in place.

---

## 7. Database Changes

Three new migrations are added plus three smaller migration that extend the existing `roles` and `permissions` tables. The `users`, `roles`, `permissions`, `role_user`, `permission_role`, `employees` tables are extended, not recreated.

### 7.1 New migration: `add_user_status_and_last_login_to_users_table`

Adds `is_active` (default `true`), `last_login_at`, `deactivated_at`, and `soft deletes` to `users`. Needed for FR-02 ("manage users" implies the ability to deactivate), and supports soft-delete so historical work orders, acquisitions, finance ledger entries, audits, and disposals continue to resolve historical user references via `withTrashed()` (DFD §11.1).

### 7.2 New migration: `drop_legacy_role_column_from_users_table`

Drops the legacy `role` ENUM column from `users` (the one added by `2026_07_13_013001_add_role_to_users_table.php`). The only consumer is `app/Http/Middleware/CheckRole.php`, which is rewritten in §9. The `roles` pivot is the single source of truth for role membership.

### 7.3 New migration: `create_departments_table`

```
id, name (unique), code (unique, nullable), parent_id (nullable self-FK),
description (nullable), is_active (default true), timestamps, soft deletes
```

A new Eloquent model `App\Models\Department` is introduced. Existing `employees.department` text column is retained for back-compat; a follow-up migration (out of scope here) will backfill `department_id` from the text and add the FK.

### 7.4 New migration: `create_approval_stages_table`

```
id, requestable_type, requestable_id (polymorphic), stage (enum: requested|recommended|approved),
actor_id (FK users, nullable), decision (enum: pending|approved|rejected, default pending),
notes (text, nullable), timestamps
```

A polymorphic `approval_stages` table supports both `AssetDisposal` and `AssetDeletion` records (FR-08 + FR-09 share this engine per DFD §10.5). The data migration (§8) seeds no rows; this is a structural change only.

### 7.5 New migration: `add_category_to_roles_table`

Adds a `category` string column to `roles` for UI grouping in the role picker (e.g. `administration`, `asset-management`, `maintenance`, `acquisition`, `finance`, `audit`).

### 7.6 New migration: `add_module_to_permissions_table`

Adds a `module` string column to `permissions` for finer-grained grouping within a `group` (e.g. `module=work-order-lifecycle`).

### 7.7 Schema summary

| Table | Change | Reason |
|---|---|---|
| `users` | + `is_active`, `last_login_at`, `deactivated_at`, soft deletes | FR-02 manage users; historical FK resolution. |
| `users` | - `role` ENUM column | Replaced by `roles` pivot (single source of truth). |
| `employees` | unchanged | Existing schema is sufficient. |
| `departments` | **new** | First-class reference data for the `employees.department` text column. |
| `approval_stages` | **new** | FR-08 / FR-09 shared approval engine. |
| `roles` | + `category` column | UI grouping for the role picker. |
| `permissions` | + `module` column | Optional finer-grained grouping within a `group`. |
| `role_user` | unchanged | |
| `permission_role` | unchanged | |

---

## 8. Data Migration for Existing Users

The new `RoleUserSeeder` re-creates demo users and reassigns every pre-existing user to the closest new-role equivalent. Idempotent — safe to re-run.

| Existing fixture (email) | Legacy role | New role(s) | Notes |
|---|---|---|---|
| `rdwij@hotmail.com` | (was promoted to admin) | `system-administrator` | Project owner — full access. |
| `admin@example.test` | `admin` | `system-administrator` | |
| `manager@example.test` | `manager`, `viewer` | `asset-manager`, `viewer` | |
| `viewer@example.test` | `viewer` | `viewer` | |
| `demo-admin@example.test` | `admin` | `system-administrator` | |
| `demo-sup@example.test` | `supervisor` | `maintenance-supervisor` | |
| `demo-op@example.test` | `operator` | `maintenance-operator` | |
| `demo-vw@example.test` | `viewer` | `viewer` | |
| `test@example.com` | (none) | (no role — same as today) | Legacy fixture, kept for test suites. |

For any **other** pre-existing user (e.g. a previously-seeded `rdwij2@…`), the seeder promotes them to `system-administrator` if they have no role assigned, mirroring the legacy behaviour of the existing `RoleUserSeeder`.

A new demo user is created per new role (password `password`):

| Email | Role |
|---|---|
| `demo-exec@example.test` | `executive-management` |
| `demo-assetmgr@example.test` | `asset-manager` |
| `demo-maintsup@example.test` | `maintenance-supervisor` |
| `demo-maintop@example.test` | `maintenance-operator` |
| `demo-ops@example.test` | `operations-team` |
| `demo-proc@example.test` | `procurement` |
| `demo-eng@example.test` | `engineering` |
| `demo-finance@example.test` | `finance-officer` |
| `demo-corpfa@example.test` | `corporate-finance-audit` |
| `demo-risk@example.test` | `risk-management` |
| `demo-quality@example.test` | `quality-compliance` |
| `demo-hse@example.test` | `hse-officer` |

---

## 9. File-level Implementation Map

### 9.1 New files

```
database/migrations/2026_07_29_000001_add_user_status_and_last_login_to_users_table.php
database/migrations/2026_07_29_000002_drop_legacy_role_column_from_users_table.php
database/migrations/2026_07_29_000003_create_departments_table.php
database/migrations/2026_07_29_000004_create_approval_stages_table.php
database/migrations/2026_07_29_000005_add_category_to_roles_table.php
database/migrations/2026_07_29_000006_add_module_to_permissions_table.php

app/Models/Department.php
app/Models/ApprovalStage.php

app/Http/Controllers/DepartmentController.php
app/Http/Controllers/RolePermissionController.php

app/Http/Middleware/EnsureApprovalStage.php

app/Policies/UserPolicy.php
app/Policies/EmployeePolicy.php
app/Policies/RolePolicy.php
app/Policies/PermissionPolicy.php
app/Policies/DepartmentPolicy.php

app/Http/Requests/DepartmentRequest.php
app/Http/Requests/RolePermissionRequest.php

database/seeders/DepartmentSeeder.php

resources/js/pages/departments/index.tsx
resources/js/pages/departments/create.tsx
resources/js/pages/departments/edit.tsx
resources/js/pages/departments/show.tsx
resources/js/pages/rbac/index.tsx
```

### 9.2 Modified files

```
database/seeders/PermissionSeeder.php         # rewrite — 93 permissions, 20 groups
database/seeders/RoleSeeder.php               # rewrite — 14 roles
database/seeders/PermissionRoleSeeder.php     # rewrite — full matrix from §5
database/seeders/RoleUserSeeder.php           # rewrite — §8 mapping
database/seeders/DatabaseSeeder.php           # add DepartmentSeeder to call() list

app/Models/User.php                           # + is_active, last_login_at, deactivated_at, SoftDeletes, scopeActive()
app/Models/Role.php                           # + category fillable
app/Models/Permission.php                     # + module fillable
app/Models/Employee.php                       # + department() relationship

app/Http/Middleware/CheckRole.php             # rewrite to use $user->hasRole() against the pivot

app/Http/Controllers/UserController.php        # can[] array unchanged — same permission names
app/Http/Controllers/EmployeeController.php    # can[] array unchanged
app/Http/Controllers/RoleController.php        # can[] array unchanged
app/Http/Controllers/PermissionController.php  # can[] array unchanged

app/Providers/AppServiceProvider.php          # + Department policy registration

routes/web.php                                # + Route::resource('departments', DepartmentController::class)
                                              # + RolePermissionController::index route
                                              # + approval-stage route stubs (gated by EnsureApprovalStage)

resources/js/components/app-sidebar.tsx       # + new permission names so new groups render
```

### 9.3 Reference for the implementer

- **Existing patterns to mirror** for the new `departments/*` Inertia pages: `resources/js/pages/employees/{index,create,edit,show}.tsx` (rewritten per `walkthrough/ADMIN_UI_PAGES_FULL_REWRITE.md`).
- **Existing pattern to mirror** for the new `DepartmentController`: `app/Http/Controllers/EmployeeController.php` (full CRUD, search, filter, `can[]` array).
- **Existing pattern to mirror** for the new `DepartmentSeeder`: `database/seeders/RoleSeeder.php` (loop over an array, `updateOrCreate` for idempotency).
- **Existing pattern to mirror** for the new policies: see the file paths referenced in `app/Providers/AppServiceProvider.php::registerPolicies()`.

---

## 10. Verification Plan

### 10.1 Automated

1. **Migrations run cleanly on a fresh database.** `php artisan migrate:fresh --seed` completes without error.
2. **Seeder counts match the spec.**
   - `Role::count() === 14`
   - `Permission::count() === 93`
   - `Department::count() >= 6`
3. **Admin permissions smoke test.**
   ```
   php artisan tinker --execute 'echo App\Models\User::where("email","rdwij@hotmail.com")->first()->getAllPermissions()->count();'
   ```
   Output: `93`.
4. **`getAllPermissions()` returns the union of permissions across the user's roles** — unit test in `tests/Unit/UserGetAllPermissionsTest.php`.
5. **Pest feature tests** in `tests/Feature/Admin/`:
   - `UserControllerTest` — admin can create / edit / delete users; non-admin cannot.
   - `EmployeeControllerTest` — admin can create / edit / delete; viewer cannot.
   - `RoleControllerTest` — admin can edit; non-admin cannot.
   - `PermissionControllerTest` — only `system-administrator` can edit.
   - `DepartmentControllerTest` — admin can CRUD; viewer cannot.
6. **`CheckRole` middleware test** — `tests/Feature/Middleware/CheckRoleTest.php` — a user without the required role gets 403; a user with the required role passes.
7. **`EnsureApprovalStage` middleware test** — `tests/Feature/Middleware/EnsureApprovalStageTest.php` — a `disposal.approve` action is rejected for `risk-management` (recommender) and accepted for `corporate-finance-audit` (approver).
8. **`npm run build` + `npm run types:check`** — frontend compiles; the 4 new department pages and 1 new RBAC page emit hashed bundles.

### 10.2 Manual — FR-01…FR-09 acceptance

| FR | Test |
|---|---|
| **FR-01** | Log in as `rdwij@hotmail.com` (system-administrator), then as each demo user (one per role). All succeed. |
| **FR-02** | Log in as `system-administrator`. `/users` shows all demo users. Click "New User", submit, see the user in the list. Edit and delete work. |
| **FR-03** | Log in as any user. `/settings/profile` renders; name, email, avatar, currency, notification toggles save correctly. |
| **FR-04** | Log in as `viewer`. `/users` shows the list but no "New User" or per-row action buttons. Log in as `system-administrator` and confirm buttons re-appear. |
| **FR-05** | Log in as `system-administrator`. `/employees` shows the 8 demo employees with action buttons. Create / edit / delete a test employee; verify role assignment via the `viewer` default. |
| **FR-08** | *(Requires `AssetDisposalController` — out of scope for this plan.)* Verify the routes are registered: `php artisan route:list | grep disposal`. Confirm `EnsureApprovalStage` middleware is attached to the `recommend` and `approve` routes. |
| **FR-09** | Same as FR-08 — shared engine. |
| **NFR-01** | Logged-out request to `/dashboard` redirects to `/login`. |
| **NFR-02** | Direct GET to `/users/create` as `viewer` returns 403 (or login redirect). |
| **NFR-05** | Sidebar groups render under the correct operational areas (Administration, Asset Management, Maintenance, Acquisition, Finance, Audit). |

### 10.3 Run commands

```
php artisan migrate:fresh --seed          # full reset
php artisan test --filter=UserController
php artisan test --filter=CheckRole
php artisan test --filter=EnsureApprovalStage
npm run build
npm run types:check
php artisan route:list --path=disposal
```

---

## 11. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Dropping `users.role` breaks the legacy `CheckRole` middleware before it is rewritten. | Low | High | Ship the `CheckRole` rewrite **in the same PR** as the drop migration. Run `php artisan test --filter=CheckRole` as a hard gate. |
| R2 | `getAllPermissions()` on `User` is N+1 across `roles` → `permissions`. | Medium | Medium | Add `with('roles.permissions')` eager-load in `HandleInertiaRequests::share()`. Add a unit test asserting ≤ 3 queries on a 14-role, 93-permission fixture. |
| R3 | The new `permissions.delete` grants for non-admin roles would let users break the catalog. | Low | High | Only `system-administrator` receives `permissions.delete`. Permission admin UI hides the action buttons when the user lacks `permissions.delete`. |
| R4 | `CheckRole` middleware rewrite changes the route signature (`role:admin,manager,...` is fine; but `:role` with comma list is positional — verify). | Low | Medium | Maintain the same `...$roles` varargs signature; only the body changes. Add a regression test. |
| R5 | Existing demo data references the old `viewer` role in `EmployeeController::store` (line 100). | Low | Low | The new catalog still has a `viewer` role, so no change needed. Confirmed by the role list in §3. |
| R6 | Policies referenced by `AppServiceProvider::registerPolicies()` are not yet committed. | High | Low | Recreate the 5 policy files in §9.1; mirror the patterns in the existing walkthrough summary. |
| R7 | The new permission `disposal.approve` could be assigned to too many roles by accident. | Medium | High | The `PermissionRoleSeeder` is the only path that grants `disposal.approve` — limit it to `corporate-finance-audit` in the matrix. Add a feature test asserting only that role has it. |
| R8 | The `employees.department` text column duplicates data with the new `departments` table. | Low | Low | Out of scope for this proposal. A follow-up migration will backfill `department_id` from the text column and deprecate the text. |

---

## 12. Effort Estimate

| Phase | Hours |
|---|---|
| Database changes (3 new migrations, role/permission model updates, `Department` + `ApprovalStage` models) | 3–5 |
| Backend (4 rewritten seeders + 1 new seeder, 2 new controllers, 1 new middleware, 5 policies, 2 form requests) | 8–12 |
| Frontend (4 new department pages + 1 new RBAC page; sidebar permission-name updates) | 8–12 |
| Routing and middleware updates (`CheckRole` rewrite, approval-stage stubs, `web.php` additions) | 2–4 |
| Testing (Pest feature + unit; manual FR-01…FR-09 walkthrough) | 4–6 |
| **Total** | **25–39 hours** |

Slightly less than the original `plans/authentication.md` estimate (28–42h) because the admin UI scaffolding is already in place and the existing controllers' `can[]` pattern is reused unchanged.

---

## 13. Out of Scope / Future Work

| Item | Why deferred | Suggested next plan |
|---|---|---|
| **Organizational-level scope (corporate / regional / site) on employees.** | The user confirmed this is out of scope for v1. A future plan will add `org_level` ENUM + `region_id` + `site_id` to `employees`, plus a `regions` and `sites` lookup table, plus an `EnsureOrgLevelScope` middleware that filters queries by scope. | `plans/org_level_scope_proposal.md` (when ready) |
| **Full `AssetDisposalController` UI for FR-08 / FR-09.** | This proposal introduces the **permission names** and **route stubs** so the RBAC is in place. The controller, request classes, and the Inertia pages for the multi-stage approval form are a separate plan. | `plans/asset_disposal_workflow_implementation.md` |
| **Backfill `employees.department_id` from the existing text column.** | The new `departments` table is introduced but the legacy `employees.department` text column is kept. A backfill migration + data review is needed before the text column is dropped. | `plans/employee_department_backfill.md` |
| **In-app chat (NFR-12).** | NFR-12 requires a chat / communication feature. Out of scope for user/role work; deferred to a separate plan. | `plans/in_app_chat_nfr12.md` |
| **Notifications (SMS / Email / WhatsApp).** | DFD §10.6 lists notification channels for WO / PPM / acquisition / audit / disposal events. Out of scope for user/role work. | `plans/notifications_channels.md` |
| **Two-factor enforcement policy.** | Fortify 2FA is already in place; a future plan may enforce 2FA for high-privilege roles (`system-administrator`, `corporate-finance-audit`). | `plans/2fa_enforcement_policy.md` |

---

*End of Document — see `walkthrough/USER_ACCOUNTS_ROLES_ISO55000_IMPLEMENTATION.md` (to be produced after this plan is approved) for the implementation walkthrough.*
