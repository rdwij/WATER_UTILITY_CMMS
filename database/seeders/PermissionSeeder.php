<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

/**
 * Seeds the permissions catalog. Each resource gets the canonical
 * four verb permissions (view/create/edit/delete) plus, where the
 * existing app gates a sub-menu, the action-level ones (".view",
 * ".manage", etc.) — names match the checks in `app-sidebar.tsx`
 * and the controllers' `$user->hasPermission(...)` calls.
 */
class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            // Users
            ['name' => 'users.view',   'display_name' => 'View Users',   'group' => 'users', 'description' => 'See the user list and individual users.'],
            ['name' => 'users.create', 'display_name' => 'Create Users', 'group' => 'users', 'description' => 'Add new user accounts.'],
            ['name' => 'users.edit',   'display_name' => 'Edit Users',   'group' => 'users', 'description' => 'Update existing user accounts.'],
            ['name' => 'users.delete', 'display_name' => 'Delete Users', 'group' => 'users', 'description' => 'Remove user accounts.'],
            ['name' => 'users.manage', 'display_name' => 'Manage Users', 'group' => 'users', 'description' => 'Assign roles and permissions to users.'],

            // Employees
            ['name' => 'employees.view',   'display_name' => 'View Employees',   'group' => 'employees', 'description' => 'See the employee list and individual employees.'],
            ['name' => 'employees.create', 'display_name' => 'Create Employees', 'group' => 'employees', 'description' => 'Add new employees.'],
            ['name' => 'employees.edit',   'display_name' => 'Edit Employees',   'group' => 'employees', 'description' => 'Update employee records.'],
            ['name' => 'employees.delete', 'display_name' => 'Delete Employees', 'group' => 'employees', 'description' => 'Remove employee records.'],

            // Roles
            ['name' => 'roles.view',   'display_name' => 'View Roles',   'group' => 'roles', 'description' => 'See the list of roles.'],
            ['name' => 'roles.create', 'display_name' => 'Create Roles', 'group' => 'roles', 'description' => 'Define new roles.'],
            ['name' => 'roles.edit',   'display_name' => 'Edit Roles',   'group' => 'roles', 'description' => 'Update roles and their permission grants.'],
            ['name' => 'roles.delete', 'display_name' => 'Delete Roles', 'group' => 'roles', 'description' => 'Remove roles.'],

            // Permissions
            ['name' => 'permissions.view',   'display_name' => 'View Permissions',   'group' => 'permissions', 'description' => 'See the permission catalog.'],
            ['name' => 'permissions.create', 'display_name' => 'Create Permissions', 'group' => 'permissions', 'description' => 'Add new permissions to the catalog.'],
            ['name' => 'permissions.edit',   'display_name' => 'Edit Permissions',   'group' => 'permissions', 'description' => 'Update permission names and descriptions.'],
            ['name' => 'permissions.delete', 'display_name' => 'Delete Permissions', 'group' => 'permissions', 'description' => 'Remove permissions.'],

            // Settings
            ['name' => 'settings.view',   'display_name' => 'View Settings',   'group' => 'settings', 'description' => 'See application settings.'],
            ['name' => 'settings.edit',   'display_name' => 'Edit Settings',   'group' => 'settings', 'description' => 'Update application settings.'],
        ];

        foreach ($permissions as $permission) {
            Permission::query()->updateOrCreate(
                ['name' => $permission['name']],
                $permission + ['is_active' => true],
            );
        }
    }
}
