<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeds the user ↔ role pivot table for the ISO 55000 catalog.
 *
 * Reassigns every pre-existing demo user to the closest new-role equivalent
 * and creates one demo user per new role. Idempotent — safe to re-run.
 *
 * Source: plans/user_accounts_roles_iso55000_proposal.md §8.
 */
class RoleUserSeeder extends Seeder
{
    public function run(): void
    {
        // Reassignment table for legacy fixtures (proposal §8).
        $assignments = [
            'rdwij@hotmail.com'           => ['system-administrator'],
            'admin@example.test'          => ['system-administrator'],
            'manager@example.test'        => ['asset-manager', 'viewer'],
            'viewer@example.test'         => ['viewer'],
            'demo-admin@example.test'     => ['system-administrator'],
            'demo-sup@example.test'       => ['maintenance-supervisor'],
            'demo-op@example.test'        => ['maintenance-operator'],
            'demo-vw@example.test'        => ['viewer'],
        ];

        // New per-role demo users (proposal §8).
        $newDemoUsers = [
            'demo-exec@example.test'      => 'executive-management',
            'demo-assetmgr@example.test'  => 'asset-manager',
            'demo-maintsup@example.test'  => 'maintenance-supervisor',
            'demo-maintop@example.test'   => 'maintenance-operator',
            'demo-ops@example.test'       => 'operations-team',
            'demo-proc@example.test'      => 'procurement',
            'demo-eng@example.test'       => 'engineering',
            'demo-finance@example.test'   => 'finance-officer',
            'demo-corpfa@example.test'    => 'corporate-finance-audit',
            'demo-risk@example.test'      => 'risk-management',
            'demo-quality@example.test'   => 'quality-compliance',
            'demo-hse@example.test'       => 'hse-officer',
        ];

        // Promote any other pre-existing users (e.g. a previously-seeded owner)
        // to system-administrator so the first person to log in can manage
        // the system without needing to re-seed.
        $knownEmails = array_merge(array_keys($assignments), array_keys($newDemoUsers));
        $knownEmails[] = 'test@example.com'; // legacy fixture, no role

        $legacyOwners = User::query()
            ->whereNotIn('email', $knownEmails)
            ->get();

        $systemAdminId = Role::query()->where('name', 'system-administrator')->value('id');

        if ($systemAdminId) {
            foreach ($legacyOwners as $legacyOwner) {
                $legacyOwner->roles()->syncWithoutDetaching([$systemAdminId]);
            }
        }

        // Reassign legacy fixtures.
        foreach ($assignments as $email => $roleNames) {
            $this->assignRolesToUser($email, $roleNames);
        }

        // Create and assign the new per-role demo users.
        foreach ($newDemoUsers as $email => $roleName) {
            $this->assignRolesToUser($email, [$roleName]);
        }
    }

    /**
     * Find or create the user for the given email and sync the requested roles.
     *
     * @param  array<int, string>  $roleNames
     */
    private function assignRolesToUser(string $email, array $roleNames): void
    {
        $user = User::query()->where('email', $email)->first();

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
