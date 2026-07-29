<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Combined RBAC admin view. Returns an overview of users, roles, and
 * permissions so administrators can audit the catalog from a single page.
 *
 * Source: docs/DFD_NEW.md §3.2 (RolePermissionController module).
 */
class RolePermissionController extends Controller
{
    public function index(Request $request)
    {
        return inertia('rbac/index', [
            'roles' => Role::query()
                ->withCount(['users', 'permissions'])
                ->orderBy('category')
                ->orderBy('name')
                ->get(),
            'permissions' => Permission::query()
                ->where('is_active', true)
                ->orderBy('group')
                ->orderBy('name')
                ->get()
                ->groupBy('group'),
            'userCount' => User::query()->count(),
            'can' => [
                'manage_users' => $request->user()?->hasPermission('users.manage') ?? false,
                'edit_roles' => $request->user()?->hasPermission('roles.edit') ?? false,
                'edit_permissions' => $request->user()?->hasPermission('permissions.edit') ?? false,
            ],
        ]);
    }
}
