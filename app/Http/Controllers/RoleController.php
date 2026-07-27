<?php

namespace App\Http\Controllers;

use App\Http\Requests\RoleRequest;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    /**
     * Display a listing of the roles.
     */
    public function index(Request $request)
    {
        $query = Role::query();

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('display_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $roles = $query->withCount(['users', 'permissions'])
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return inertia('roles/index', [
            'roles' => $roles,
            'filters' => $request->only(['search']),
            'can' => [
                'view' => $request->user()?->hasPermission('roles.view') ?? false,
                'create' => $request->user()?->hasPermission('roles.create') ?? false,
                'edit' => $request->user()?->hasPermission('roles.edit') ?? false,
                'delete' => $request->user()?->hasPermission('roles.delete') ?? false,
            ],
        ]);
    }

    /**
     * Show the form for creating a new role.
     */
    public function create()
    {
        $permissions = Permission::where('is_active', true)
            ->orderBy('group')
            ->orderBy('name')
            ->get()
            ->groupBy('group');

        return inertia('roles/create', [
            'permissions' => $permissions,
        ]);
    }

    /**
     * Store a newly created role in storage.
     */
    public function store(RoleRequest $request)
    {
        $validated = $request->validated();

        $role = Role::create($validated);

        // Attach permissions if provided
        if ($request->filled('permissions')) {
            $role->permissions()->attach($request->input('permissions'));
        }

        return redirect()->route('roles.index')
            ->with('success', 'Role created successfully.');
    }

    /**
     * Display the specified role.
     */
    public function show(Role $role)
    {
        return inertia('roles/show', [
            'role' => $role->load(['users', 'permissions']),
        ]);
    }

    /**
     * Show the form for editing the specified role.
     */
    public function edit(Role $role)
    {
        $permissions = Permission::where('is_active', true)
            ->orderBy('group')
            ->orderBy('name')
            ->get()
            ->groupBy('group');

        return inertia('roles/edit', [
            'role' => $role->load('permissions'),
            'permissions' => $permissions,
        ]);
    }

    /**
     * Update the specified role in storage.
     */
    public function update(RoleRequest $request, Role $role)
    {
        $validated = $request->validated();

        $role->update($validated);

        // Sync permissions
        if ($request->filled('permissions')) {
            $role->permissions()->sync($request->input('permissions'));
        } else {
            $role->permissions()->detach();
        }

        return redirect()->route('roles.index')
            ->with('success', 'Role updated successfully.');
    }

    /**
     * Remove the specified role from storage.
     */
    public function destroy(Role $role)
    {
        // Check if role is assigned to any users
        if ($role->users()->exists()) {
            return redirect()->route('roles.index')
                ->with('error', 'Cannot delete role that is assigned to users.');
        }

        $role->delete();

        return redirect()->route('roles.index')
            ->with('success', 'Role deleted successfully.');
    }
}