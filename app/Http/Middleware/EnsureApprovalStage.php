<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Implements the three-stage approval gate required by FR-08 (asset deletion)
 * and FR-09 (asset disposal) of the SRS. See
 * `plans/user_accounts_roles_iso55000_proposal.md` §6 for the design.
 *
 * Usage:
 *   POST /asset-disposals/{disposal}/recommend
 *     ->middleware('stage:recommended');
 *
 *   POST /asset-disposals/{disposal}/approve
 *     ->middleware('stage:approved');
 */
class EnsureApprovalStage
{
    /**
     * Map of approval stage → set of roles authorized to act on that stage.
     *
     * @var array<string, array<int, string>>
     */
    private const STAGE_ROLES = [
        'requested' => [
            'system-administrator',
            'asset-manager',
            'maintenance-supervisor',
            'maintenance-operator',
        ],
        'recommended' => [
            'system-administrator',
            'engineering',
            'risk-management',
        ],
        'approved' => [
            'system-administrator',
            'corporate-finance-audit',
        ],
    ];

    /**
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $stage): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        $allowedRoles = self::STAGE_ROLES[$stage] ?? null;

        if ($allowedRoles === null) {
            abort(500, "Unknown approval stage: {$stage}");
        }

        if (! $user->hasAnyRole($allowedRoles)) {
            abort(403, "Approval stage [{$stage}] requires one of: ".implode(', ', $allowedRoles));
        }

        return $next($request);
    }
}
