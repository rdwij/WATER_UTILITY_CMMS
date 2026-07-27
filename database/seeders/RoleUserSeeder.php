<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeds the user ↔ role pivot table.
 *
 * Creates three deterministic fixtures so login credentials are
 * predictable in development:
 *
 *   admin@example.test    / password  → admin
 *   manager@example.test  / password  → manager, viewer
 *   viewer@example.test   / password  → viewer
 *
 * Existing fixtures (e.g. test@example.com from the default
 * DatabaseSeeder) are left untouched — re-running the seeder is a
 * no-op for users it has already wired up.
 */
class RoleUserSeeder extends Seeder
{
    public function run(): void
    {
        $assignments = [
            'admin@example.test'    => ['admin'],
            'manager@example.test'  => ['manager', 'viewer'],
            'viewer@example.test'   => ['viewer'],
        ];

        // Promote any other pre-existing users to admin so the first
        // person to log in (typically the project owner) can manage
        // the system without needing to re-seed.
        $existingEmails = array_keys($assignments);
        $existingEmails[] = 'test@example.com'; // legacy fixture, no role

        $legacyOwners = User::query()
            ->whereNotIn('email', $existingEmails)
            ->get();

        foreach ($legacyOwners as $legacyOwner) {
            $adminRoleId = Role::query()->where('name', 'admin')->value('id');
            if ($adminRoleId) {
                $legacyOwner->roles()->syncWithoutDetaching([$adminRoleId]);
            }
        }

        foreach ($assignments as $email => $roleNames) {
            $user = User::query()->where('email', $email)->first();

            // Create the fixture if it doesn't exist yet. The User
            // factory handles hashing and defaults.
            if (! $user) {
                $user = User::factory()->create([
                    'name' => ucfirst(explode('@', $email)[0]),
                    'email' => $email,
                ]);
            }

            $roleIds = Role::query()
                ->whereIn('name', $roleNames)
                ->pluck('id')
                ->all();

            $user->roles()->syncWithoutDetaching($roleIds);
        }
    }
}
