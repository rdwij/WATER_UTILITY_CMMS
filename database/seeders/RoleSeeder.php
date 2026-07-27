<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

/**
 * Seeds the five baseline roles that the project docs describe
 * (admin, manager, supervisor, operator, viewer). Names match the
 * `$user->hasRole('admin')` style checks the codebase already uses.
 */
class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            [
                'name' => 'admin',
                'display_name' => 'Administrator',
                'description' => 'Full access to every resource. Intended for system administrators only.',
            ],
            [
                'name' => 'manager',
                'display_name' => 'Manager',
                'description' => 'Can manage users, employees, and roles; cannot manage permissions or critical settings.',
            ],
            [
                'name' => 'supervisor',
                'display_name' => 'Supervisor',
                'description' => 'Can manage employees and view all resources; cannot delete or alter roles/permissions.',
            ],
            [
                'name' => 'operator',
                'display_name' => 'Operator',
                'description' => 'Day-to-day operational role: can view and edit employees, manage their own settings.',
            ],
            [
                'name' => 'viewer',
                'display_name' => 'Viewer',
                'description' => 'Read-only access to all resources.',
            ],
        ];

        foreach ($roles as $role) {
            Role::query()->updateOrCreate(['name' => $role['name']], $role);
        }
    }
}
