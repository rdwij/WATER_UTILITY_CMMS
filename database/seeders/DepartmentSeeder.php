<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

/**
 * Seeds the canonical departments for the water-utility CMMS.
 *
 * Source: plans/user_accounts_roles_iso55000_proposal.md §13 (departments
 * become first-class reference data; legacy `employees.department` text
 * column is kept for back-compat until the backfill migration runs).
 */
class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            ['name' => 'Operations',          'code' => 'OPS',  'description' => 'Day-to-day operation of water and wastewater assets.'],
            ['name' => 'Maintenance',        'code' => 'MAINT', 'description' => 'Preventive, predictive, and corrective maintenance.'],
            ['name' => 'Customer Service',    'code' => 'CS',   'description' => 'Customer-facing operations and complaints handling.'],
            ['name' => 'Engineering',         'code' => 'ENG',  'description' => 'Technical and design support for asset lifecycle.'],
            ['name' => 'Finance',             'code' => 'FIN',  'description' => 'Budgets, depreciation, valuation, and disposal write-offs.'],
            ['name' => 'Health, Safety & Environment', 'code' => 'HSE', 'description' => 'Safety, environmental compliance, and incident tracking.'],
        ];

        foreach ($departments as $dept) {
            Department::query()->updateOrCreate(
                ['code' => $dept['code']],
                $dept + ['is_active' => true],
            );
        }
    }
}
