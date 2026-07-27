<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

/**
 * Seeds the role ↔ permission pivot table.
 *
 * Permission grants per role:
 *   admin      — every permission
 *   manager    — view/create/edit across users/employees/roles;
 *                view all of permissions & settings
 *   supervisor — view all; view+create+edit employees only
 *   operator   — view all; edit employees only
 *   viewer     — view all (read-only)
 */
class PermissionRoleSeeder extends Seeder
{
    public function run(): void
    {
        $all = Permission::query()->pluck('name')->all();

        $readOnly = [
            'users.view',
            'employees.view',
            'roles.view',
            'permissions.view',
            'settings.view',
        ];

        // Map: role => permission names to grant. Absent roles get the
        // empty list (e.g. an "operator" role might not exist yet).
        $grants = [
            'admin'      => $all,
            'manager'    => array_values(array_unique(array_merge(
                $readOnly,
                [
                    'users.create', 'users.edit', 'users.manage',
                    'employees.create', 'employees.edit',
                    'roles.create', 'roles.edit',
                ],
            ))),
            'supervisor' => array_values(array_unique(array_merge(
                $readOnly,
                [
                    'employees.create', 'employees.edit',
                ],
            ))),
            'operator'   => array_values(array_unique(array_merge(
                $readOnly,
                [
                    'employees.edit',
                ],
            ))),
            'viewer'     => $readOnly,
        ];

        $roles = Role::query()->whereIn('name', array_keys($grants))->get();

        foreach ($roles as $role) {
            $permissionIds = Permission::query()
                ->whereIn('name', $grants[$role->name] ?? [])
                ->pluck('id')
                ->all();

            // sync() clears existing grants first, so re-running the
            // seeder stays idempotent.
            $role->permissions()->sync($permissionIds);
        }
    }
}
