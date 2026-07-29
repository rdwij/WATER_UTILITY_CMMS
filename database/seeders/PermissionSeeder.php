<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

/**
 * Seeds the ISO 55000-aligned permission catalog.
 *
 * 93 permissions across 20 groups, mapped 1:1 to the DFD §3.2 functional
 * modules. Each resource gets the canonical four verb permissions
 * (view/create/edit/delete) plus module-specific verbs (`.approve`,
 * `.run-depreciation`, `.score-condition`, `.score-risk`, `.dispose`,
 * `.recommend`, `.close`, `.reopen`).
 *
 * Naming follows the convention `<resource>.<verb>` so the sidebar and
 * `can[]` checks are uniform.
 *
 * Source: plans/user_accounts_roles_iso55000_proposal.md §4.
 */
class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = $this->definitions();

        foreach ($permissions as $permission) {
            Permission::query()->updateOrCreate(
                ['name' => $permission['name']],
                $permission + ['is_active' => true],
            );
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function definitions(): array
    {
        return [
            // Group: users (5)
            ['name' => 'users.view',   'display_name' => 'View Users',   'group' => 'users', 'description' => 'See the user list and individual users.'],
            ['name' => 'users.create', 'display_name' => 'Create Users', 'group' => 'users', 'description' => 'Add new user accounts.'],
            ['name' => 'users.edit',   'display_name' => 'Edit Users',   'group' => 'users', 'description' => 'Update existing user accounts.'],
            ['name' => 'users.delete', 'display_name' => 'Delete Users', 'group' => 'users', 'description' => 'Deactivate user accounts.'],
            ['name' => 'users.manage', 'display_name' => 'Manage Users', 'group' => 'users', 'description' => 'Assign roles, reset passwords, force logout.'],

            // Group: employees (4)
            ['name' => 'employees.view',   'display_name' => 'View Employees',   'group' => 'employees', 'description' => 'See the employee list and individual employees.'],
            ['name' => 'employees.create', 'display_name' => 'Create Employees', 'group' => 'employees', 'description' => 'Add new employees.'],
            ['name' => 'employees.edit',   'display_name' => 'Edit Employees',   'group' => 'employees', 'description' => 'Update employee records.'],
            ['name' => 'employees.delete', 'display_name' => 'Delete Employees', 'group' => 'employees', 'description' => 'Soft-delete employee records.'],

            // Group: roles (4)
            ['name' => 'roles.view',   'display_name' => 'View Roles',   'group' => 'roles', 'description' => 'See the list of roles.'],
            ['name' => 'roles.create', 'display_name' => 'Create Roles', 'group' => 'roles', 'description' => 'Define new roles.'],
            ['name' => 'roles.edit',   'display_name' => 'Edit Roles',   'group' => 'roles', 'description' => 'Update role definitions.'],
            ['name' => 'roles.delete', 'display_name' => 'Delete Roles', 'group' => 'roles', 'description' => 'Remove roles (only when no users are assigned).'],

            // Group: permissions (4)
            ['name' => 'permissions.view',   'display_name' => 'View Permissions',   'group' => 'permissions', 'description' => 'See the permission catalog.'],
            ['name' => 'permissions.create', 'display_name' => 'Create Permissions', 'group' => 'permissions', 'description' => 'Add new permissions.'],
            ['name' => 'permissions.edit',   'display_name' => 'Edit Permissions',   'group' => 'permissions', 'description' => 'Update permission names and descriptions.'],
            ['name' => 'permissions.delete', 'display_name' => 'Delete Permissions', 'group' => 'permissions', 'description' => 'Remove permissions.'],

            // Group: settings (2)
            ['name' => 'settings.view', 'display_name' => 'View Settings', 'group' => 'settings', 'description' => 'See application settings.'],
            ['name' => 'settings.edit', 'display_name' => 'Edit Settings', 'group' => 'settings', 'description' => 'Update application settings.'],

            // Group: departments (4) — NEW
            ['name' => 'departments.view',   'display_name' => 'View Departments',   'group' => 'departments', 'description' => 'See the department list.'],
            ['name' => 'departments.create', 'display_name' => 'Create Departments', 'group' => 'departments', 'description' => 'Add new departments.'],
            ['name' => 'departments.edit',   'display_name' => 'Edit Departments',   'group' => 'departments', 'description' => 'Update department records.'],
            ['name' => 'departments.delete', 'display_name' => 'Delete Departments', 'group' => 'departments', 'description' => 'Remove departments.'],

            // Group: assets (8) — NEW
            ['name' => 'assets.view',            'display_name' => 'View Assets',            'group' => 'assets', 'description' => 'See the asset register and individual assets.'],
            ['name' => 'assets.create',          'display_name' => 'Create Assets',          'group' => 'assets', 'description' => 'Register new assets.'],
            ['name' => 'assets.edit',            'display_name' => 'Edit Assets',            'group' => 'assets', 'description' => 'Update asset records.'],
            ['name' => 'assets.delete',          'display_name' => 'Delete Assets',          'group' => 'assets', 'description' => 'Soft-delete assets (requires FR-08 approval).'],
            ['name' => 'assets.manage',          'display_name' => 'Manage Assets',          'group' => 'assets', 'description' => 'Bulk actions, reclassification, transfers.'],
            ['name' => 'assets.score-condition', 'display_name' => 'Score Asset Condition',  'group' => 'assets', 'description' => 'Record engineering condition score during audit.'],
            ['name' => 'assets.score-risk',      'display_name' => 'Score Asset Risk',       'group' => 'assets', 'description' => 'Record risk-based scoring (probability × consequence).'],
            ['name' => 'assets.view-gis',        'display_name' => 'View GIS Map',           'group' => 'assets', 'description' => 'See the GIS map view of assets.'],

            // Group: asset-classifications (4) — NEW
            ['name' => 'asset-classifications.view',   'display_name' => 'View Classifications',   'group' => 'asset-classifications', 'description' => 'See the ISO 55000 L1–L8 classification tree.'],
            ['name' => 'asset-classifications.create', 'display_name' => 'Create Classifications', 'group' => 'asset-classifications', 'description' => 'Add new classification nodes.'],
            ['name' => 'asset-classifications.edit',   'display_name' => 'Edit Classifications',   'group' => 'asset-classifications', 'description' => 'Update classification nodes.'],
            ['name' => 'asset-classifications.delete', 'display_name' => 'Delete Classifications', 'group' => 'asset-classifications', 'description' => 'Remove classification nodes.'],

            // Group: asset-locations (4) — NEW
            ['name' => 'asset-locations.view',   'display_name' => 'View Locations',   'group' => 'asset-locations', 'description' => 'See the location tree.'],
            ['name' => 'asset-locations.create', 'display_name' => 'Create Locations', 'group' => 'asset-locations', 'description' => 'Add new locations.'],
            ['name' => 'asset-locations.edit',   'display_name' => 'Edit Locations',   'group' => 'asset-locations', 'description' => 'Update location records.'],
            ['name' => 'asset-locations.delete', 'display_name' => 'Delete Locations', 'group' => 'asset-locations', 'description' => 'Remove locations.'],

            // Group: asset-categories (4) — NEW
            ['name' => 'asset-categories.view',   'display_name' => 'View Categories',   'group' => 'asset-categories', 'description' => 'See the category tree.'],
            ['name' => 'asset-categories.create', 'display_name' => 'Create Categories', 'group' => 'asset-categories', 'description' => 'Add new categories.'],
            ['name' => 'asset-categories.edit',   'display_name' => 'Edit Categories',   'group' => 'asset-categories', 'description' => 'Update category records.'],
            ['name' => 'asset-categories.delete', 'display_name' => 'Delete Categories', 'group' => 'asset-categories', 'description' => 'Remove categories.'],

            // Group: acquisitions (6) — NEW
            ['name' => 'acquisitions.view',              'display_name' => 'View Acquisitions',         'group' => 'acquisitions', 'description' => 'See acquisition intake records.'],
            ['name' => 'acquisitions.create',            'display_name' => 'Create Acquisitions',       'group' => 'acquisitions', 'description' => 'Create a new acquisition intake (PO, supplier, warranty).'],
            ['name' => 'acquisitions.edit',              'display_name' => 'Edit Acquisitions',         'group' => 'acquisitions', 'description' => 'Update acquisition records.'],
            ['name' => 'acquisitions.delete',            'display_name' => 'Delete Acquisitions',       'group' => 'acquisitions', 'description' => 'Remove acquisition intake records.'],
            ['name' => 'acquisitions.generate-asset-id', 'display_name' => 'Generate Asset ID',         'group' => 'acquisitions', 'description' => 'Trigger unique utility asset ID generation.'],
            ['name' => 'acquisitions.generate-qr',       'display_name' => 'Generate QR Code',          'group' => 'acquisitions', 'description' => 'Generate QR code for an asset.'],

            // Group: work-orders (7) — NEW
            ['name' => 'work-orders.view',    'display_name' => 'View Work Orders',    'group' => 'work-orders', 'description' => 'See the work-order list and details.'],
            ['name' => 'work-orders.create',  'display_name' => 'Create Work Orders',  'group' => 'work-orders', 'description' => 'Create a new work order (manual or from schedule).'],
            ['name' => 'work-orders.edit',    'display_name' => 'Edit Work Orders',    'group' => 'work-orders', 'description' => 'Update an existing work order.'],
            ['name' => 'work-orders.delete',  'display_name' => 'Delete Work Orders',  'group' => 'work-orders', 'description' => 'Remove a work order.'],
            ['name' => 'work-orders.approve', 'display_name' => 'Approve Work Orders', 'group' => 'work-orders', 'description' => 'Approve or reject a work order.'],
            ['name' => 'work-orders.close',   'display_name' => 'Close Work Orders',   'group' => 'work-orders', 'description' => 'Close a completed work order.'],
            ['name' => 'work-orders.reopen',  'display_name' => 'Reopen Work Orders',  'group' => 'work-orders', 'description' => 'Reopen a previously closed work order.'],

            // Group: scheduled-maintenance (4) — NEW
            ['name' => 'scheduled-maintenance.view',   'display_name' => 'View Schedules',   'group' => 'scheduled-maintenance', 'description' => 'See the PPM schedule list.'],
            ['name' => 'scheduled-maintenance.create', 'display_name' => 'Create Schedules', 'group' => 'scheduled-maintenance', 'description' => 'Add a new PPM schedule.'],
            ['name' => 'scheduled-maintenance.edit',   'display_name' => 'Edit Schedules',   'group' => 'scheduled-maintenance', 'description' => 'Update PPM schedules (reschedule, reassign).'],
            ['name' => 'scheduled-maintenance.delete', 'display_name' => 'Delete Schedules', 'group' => 'scheduled-maintenance', 'description' => 'Remove PPM schedules.'],

            // Group: stock (5) — NEW
            ['name' => 'stock.view',   'display_name' => 'View Stock',   'group' => 'stock', 'description' => 'See stock balances and movements.'],
            ['name' => 'stock.create', 'display_name' => 'Create Stock', 'group' => 'stock', 'description' => 'Add new stock records.'],
            ['name' => 'stock.edit',   'display_name' => 'Edit Stock',   'group' => 'stock', 'description' => 'Update stock records.'],
            ['name' => 'stock.delete', 'display_name' => 'Delete Stock', 'group' => 'stock', 'description' => 'Remove stock records.'],
            ['name' => 'stock.issue',  'display_name' => 'Issue Stock',  'group' => 'stock', 'description' => 'Issue stock to a work order.'],

            // Group: finance (6) — NEW
            ['name' => 'finance.view',              'display_name' => 'View Finance',              'group' => 'finance', 'description' => 'See the asset finance ledger and dashboards.'],
            ['name' => 'finance.create',            'display_name' => 'Create Finance Records',    'group' => 'finance', 'description' => 'Create a finance ledger entry.'],
            ['name' => 'finance.edit',              'display_name' => 'Edit Finance Records',      'group' => 'finance', 'description' => 'Update ledger entries (corrections as new entries).'],
            ['name' => 'finance.delete',            'display_name' => 'Delete Finance Records',    'group' => 'finance', 'description' => 'Reverse a ledger entry.'],
            ['name' => 'finance.run-depreciation',  'display_name' => 'Run Depreciation',          'group' => 'finance', 'description' => 'Trigger the monthly depreciation job.'],
            ['name' => 'finance.export',            'display_name' => 'Export Finance Reports',    'group' => 'finance', 'description' => 'Generate PDF/CSV/XLS finance reports.'],

            // Group: audit (6) — NEW
            ['name' => 'audit.view',            'display_name' => 'View Audits',      'group' => 'audit', 'description' => 'See the audit list and findings.'],
            ['name' => 'audit.create',          'display_name' => 'Schedule Audits',  'group' => 'audit', 'description' => 'Create a new audit (periodic or ad-hoc).'],
            ['name' => 'audit.edit',            'display_name' => 'Edit Audits',      'group' => 'audit', 'description' => 'Update audit records.'],
            ['name' => 'audit.delete',          'display_name' => 'Delete Audits',    'group' => 'audit', 'description' => 'Remove audit records.'],
            ['name' => 'audit.score-condition', 'display_name' => 'Score Condition',  'group' => 'audit', 'description' => 'Perform engineering condition assessment.'],
            ['name' => 'audit.score-risk',      'display_name' => 'Score Risk',       'group' => 'audit', 'description' => 'Apply risk-based scoring.'],

            // Group: disposal (5) — NEW (FR-08 / FR-09)
            ['name' => 'disposal.view',     'display_name' => 'View Disposals',     'group' => 'disposal', 'description' => 'See disposal / deletion requests.'],
            ['name' => 'disposal.create',   'display_name' => 'Request Disposal',   'group' => 'disposal', 'description' => 'Submit a disposal or deletion request.'],
            ['name' => 'disposal.recommend','display_name' => 'Recommend Disposal', 'group' => 'disposal', 'description' => 'Engineering / Risk technical recommendation (stage 2).'],
            ['name' => 'disposal.approve',  'display_name' => 'Approve Disposal',   'group' => 'disposal', 'description' => 'Corporate Finance & Audit final approval (stage 3).'],
            ['name' => 'disposal.execute',  'display_name' => 'Execute Disposal',   'group' => 'disposal', 'description' => 'Execute the disposal (post write-off, retire asset).'],

            // Group: analytics (3) — NEW
            ['name' => 'analytics.view',   'display_name' => 'View Analytics',   'group' => 'analytics', 'description' => 'See analytics dashboards.'],
            ['name' => 'analytics.export', 'display_name' => 'Export Reports',   'group' => 'analytics', 'description' => 'Generate PDF/CSV/XLS reports.'],
            ['name' => 'analytics.create', 'display_name' => 'Create Reports',   'group' => 'analytics', 'description' => 'Save custom report definitions.'],

            // Group: events (4) — NEW
            ['name' => 'events.view',   'display_name' => 'View Events',   'group' => 'events', 'description' => 'See calendar events.'],
            ['name' => 'events.create', 'display_name' => 'Create Events', 'group' => 'events', 'description' => 'Add new calendar events.'],
            ['name' => 'events.edit',   'display_name' => 'Edit Events',   'group' => 'events', 'description' => 'Update calendar events.'],
            ['name' => 'events.delete', 'display_name' => 'Delete Events', 'group' => 'events', 'description' => 'Remove calendar events.'],

            // Group: admin-files (4) — NEW
            ['name' => 'admin-files.view',   'display_name' => 'View Admin Files',   'group' => 'admin-files', 'description' => 'See administrative files.'],
            ['name' => 'admin-files.create', 'display_name' => 'Upload Admin Files', 'group' => 'admin-files', 'description' => 'Upload new files.'],
            ['name' => 'admin-files.edit',   'display_name' => 'Edit Admin Files',   'group' => 'admin-files', 'description' => 'Update file metadata.'],
            ['name' => 'admin-files.delete', 'display_name' => 'Delete Admin Files', 'group' => 'admin-files', 'description' => 'Remove files.'],
        ];
    }
}
