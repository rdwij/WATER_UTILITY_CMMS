<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

/**
 * Seeds the role ↔ permission pivot table for the ISO 55000 catalog.
 *
 * Source: plans/user_accounts_roles_iso55000_proposal.md §5.
 *
 * - `system-administrator` receives every permission.
 * - Every other role gets a tightly-scoped grant list.
 * - `sync()` is used so re-running the seeder stays idempotent.
 */
class PermissionRoleSeeder extends Seeder
{
    public function run(): void
    {
        $all = Permission::query()->pluck('name')->all();

        $viewOnly = [
            'users.view', 'employees.view', 'roles.view', 'permissions.view', 'settings.view',
            'departments.view',
            'assets.view', 'asset-classifications.view', 'asset-locations.view', 'asset-categories.view',
            'acquisitions.view',
            'work-orders.view',
            'scheduled-maintenance.view',
            'stock.view',
            'finance.view',
            'audit.view',
            'disposal.view',
            'analytics.view',
            'events.view',
            'admin-files.view',
        ];

        $grants = [
            'system-administrator' => $all,

            'executive-management' => array_values(array_unique(array_merge(
                $viewOnly,
                ['finance.export', 'analytics.export'],
            ))),

            'asset-manager' => array_values(array_unique(array_merge(
                $viewOnly,
                [
                    'users.manage',
                    'employees.create', 'employees.edit',
                    'assets.create', 'assets.edit', 'assets.manage', 'assets.view-gis',
                    'asset-classifications.create', 'asset-classifications.edit',
                    'asset-locations.create', 'asset-locations.edit',
                    'asset-categories.create', 'asset-categories.edit',
                    'acquisitions.create', 'acquisitions.edit', 'acquisitions.generate-asset-id', 'acquisitions.generate-qr',
                    'work-orders.create', 'work-orders.edit', 'work-orders.approve', 'work-orders.reopen',
                    'scheduled-maintenance.create', 'scheduled-maintenance.edit',
                    'disposal.create',
                    'events.create', 'events.edit',
                    'analytics.export',
                ],
            ))),

            'maintenance-supervisor' => array_values(array_unique(array_merge(
                $viewOnly,
                [
                    'employees.edit',
                    'assets.view-gis',
                    'work-orders.create', 'work-orders.edit', 'work-orders.approve', 'work-orders.reopen',
                    'scheduled-maintenance.create', 'scheduled-maintenance.edit',
                    'stock.issue',
                    'disposal.create',
                    'events.create', 'events.edit',
                ],
            ))),

            'maintenance-operator' => array_values(array_unique(array_merge(
                $viewOnly,
                [
                    'assets.view-gis',
                    'work-orders.create', 'work-orders.edit', 'work-orders.close',
                    'stock.issue',
                    'disposal.create',
                    'events.create',
                ],
            ))),

            'operations-team' => array_values(array_unique(array_merge(
                $viewOnly,
                [
                    'assets.view-gis',
                    'events.create',
                ],
            ))),

            'procurement' => array_values(array_unique(array_merge(
                $viewOnly,
                [
                    'assets.view-gis',
                    'asset-locations.edit',
                    'acquisitions.create', 'acquisitions.edit', 'acquisitions.generate-asset-id', 'acquisitions.generate-qr',
                ],
            ))),

            'engineering' => array_values(array_unique(array_merge(
                $viewOnly,
                [
                    'assets.create', 'assets.edit', 'assets.view-gis', 'assets.score-condition',
                    'asset-classifications.edit',
                    'work-orders.edit',
                    'audit.score-condition',
                    'disposal.recommend',
                ],
            ))),

            'finance-officer' => array_values(array_unique(array_merge(
                $viewOnly,
                [
                    'finance.create', 'finance.edit', 'finance.run-depreciation', 'finance.export',
                    'analytics.export',
                ],
            ))),

            'corporate-finance-audit' => array_values(array_unique(array_merge(
                $viewOnly,
                [
                    'finance.export',
                    'disposal.approve',
                    'analytics.export',
                ],
            ))),

            'risk-management' => array_values(array_unique(array_merge(
                $viewOnly,
                [
                    'assets.score-risk',
                    'audit.create', 'audit.edit', 'audit.score-risk',
                    'disposal.recommend',
                    'analytics.export',
                ],
            ))),

            'quality-compliance' => array_values(array_unique(array_merge(
                $viewOnly,
                [
                    'audit.create', 'audit.edit', 'audit.delete', 'audit.score-condition', 'audit.score-risk',
                    'analytics.export',
                    'admin-files.create', 'admin-files.edit',
                ],
            ))),

            'hse-officer' => array_values(array_unique(array_merge(
                $viewOnly,
                [
                    'assets.view-gis',
                    'events.create',
                ],
            ))),

            'viewer' => $viewOnly,
        ];

        $roles = Role::query()->whereIn('name', array_keys($grants))->get();

        foreach ($roles as $role) {
            $permissionIds = Permission::query()
                ->whereIn('name', $grants[$role->name] ?? [])
                ->pluck('id')
                ->all();

            // sync() clears existing grants first, so re-running stays idempotent.
            $role->permissions()->sync($permissionIds);
        }
    }
}
