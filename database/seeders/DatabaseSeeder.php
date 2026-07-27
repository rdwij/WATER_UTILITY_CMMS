<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Order matters: permission_role and role_user both pivot to rows
     * inserted by their respective parents, so the parents must run
     * first.
     */
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,    // 1. Catalog
            RoleSeeder::class,          // 2. Roles
            PermissionRoleSeeder::class,// 3. Role ↔ Permission pivot
            RoleUserSeeder::class,      // 4. User ↔ Role pivot (creates fixture users too)
        ]);

        // Keep the legacy smoke-test user around so existing test
        // suites that expect `test@example.com` keep working.
        if (! User::query()->where('email', 'test@example.com')->exists()) {
            User::factory()->create([
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);
        }
    }
}
