<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

/**
 * Seeds the ISO 55000 / DFD-aligned role catalog.
 *
 * 14 roles across 6 categories, mapped 1:1 to the SRS §5 stakeholders.
 * Source: plans/user_accounts_roles_iso55000_proposal.md §3.
 */
class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = $this->definitions();

        foreach ($roles as $role) {
            Role::query()->updateOrCreate(
                ['name' => $role['name']],
                $role,
            );
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function definitions(): array
    {
        return [
            [
                'name' => 'system-administrator',
                'display_name' => 'System Administrator',
                'category' => 'administration',
                'description' => 'Full access; platform owner. The only role that can edit the permission catalog.',
            ],
            [
                'name' => 'executive-management',
                'display_name' => 'Executive Management',
                'category' => 'administration',
                'description' => 'Read-only across all modules; can view executive dashboards and exports.',
            ],
            [
                'name' => 'asset-manager',
                'display_name' => 'Asset Manager',
                'category' => 'asset-management',
                'description' => 'Manages the asset register, classifications, locations, and categories; approves work orders and asset deletion/disposal requests.',
            ],
            [
                'name' => 'maintenance-supervisor',
                'display_name' => 'Maintenance Supervisor',
                'category' => 'maintenance',
                'description' => 'Approves work orders; assigns personnel; manages preventive maintenance schedules; oversees the maintenance team.',
            ],
            [
                'name' => 'maintenance-operator',
                'display_name' => 'Maintenance Operator',
                'category' => 'maintenance',
                'description' => 'Creates and executes work orders; records parts, meters, and notes; closes work orders.',
            ],
            [
                'name' => 'operations-team',
                'display_name' => 'Operations Team',
                'category' => 'asset-management',
                'description' => 'Day-to-day operational viewing; logs asset usage and downtime.',
            ],
            [
                'name' => 'procurement',
                'display_name' => 'Procurement Officer',
                'category' => 'acquisition',
                'description' => 'Creates asset acquisitions; generates utility asset IDs and QR codes; captures GIS geometry.',
            ],
            [
                'name' => 'engineering',
                'display_name' => 'Engineering / Technical',
                'category' => 'asset-management',
                'description' => 'Updates asset technical specs; supports asset classification and condition assessment.',
            ],
            [
                'name' => 'finance-officer',
                'display_name' => 'Finance Officer',
                'category' => 'finance',
                'description' => 'Captures initial asset value; runs depreciation; manages the finance ledger; views financial reports.',
            ],
            [
                'name' => 'corporate-finance-audit',
                'display_name' => 'Corporate Finance & Audit Approver',
                'category' => 'finance',
                'description' => 'Final approver for asset deletion (FR-08) and asset disposal (FR-09). Restricted, non-delegable role.',
            ],
            [
                'name' => 'risk-management',
                'display_name' => 'Risk Management',
                'category' => 'audit',
                'description' => 'Performs risk-based condition scoring during audits; flags at-risk assets; can recommend disposal.',
            ],
            [
                'name' => 'quality-compliance',
                'display_name' => 'Quality & Compliance',
                'category' => 'audit',
                'description' => 'Schedules and performs audits; records findings; views compliance reports.',
            ],
            [
                'name' => 'hse-officer',
                'display_name' => 'Health, Safety & Environment',
                'category' => 'audit',
                'description' => 'Logs safety incidents and condition flags; views HSE dashboards.',
            ],
            [
                'name' => 'viewer',
                'display_name' => 'Viewer (read-only)',
                'category' => 'administration',
                'description' => 'Read-only across all resources; no edit, delete, or approve rights. Safe default for non-domain users.',
            ],
        ];
    }
}
