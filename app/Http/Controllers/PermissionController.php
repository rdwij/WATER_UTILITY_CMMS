<?php

namespace App\Http\Controllers;

use App\Http\Requests\PermissionRequest;
use App\Models\Permission;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    /**
     * Display a listing of the permissions.
     */
    public function index(Request $request)
    {
        $query = Permission::query();

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('display_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Filter by group
        if ($request->filled('group')) {
            $query->where('group', $request->input('group'));
        }

        $permissions = $query->withCount('roles')
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return inertia('permissions/index', [
            'permissions' => $permissions,
            'filters' => $request->only(['search', 'group']),
            'groups' => Permission::distinct()->pluck('group'),
            'can' => [
                'view' => $request->user()?->hasPermission('permissions.view') ?? false,
                'create' => $request->user()?->hasPermission('permissions.create') ?? false,
                'edit' => $request->user()?->hasPermission('permissions.edit') ?? false,
                'delete' => $request->user()?->hasPermission('permissions.delete') ?? false,
            ],
        ]);
    }

    /**
     * Show the form for creating a new permission.
     */
    public function create()
    {
        return inertia('permissions/create', [
            'suggested_groups' => Permission::query()
                ->whereNotNull('group')
                ->distinct()
                ->orderBy('group')
                ->pluck('group')
                ->all(),
        ]);
    }

    /**
     * Store a newly created permission in storage.
     */
    public function store(PermissionRequest $request)
    {
        $validated = $request->validated();

        Permission::create($validated);

        return redirect()->route('permissions.index')
            ->with('success', 'Permission created successfully.');
    }

    /**
     * Display the specified permission.
     */
    public function show(Permission $permission)
    {
        return inertia('permissions/show', [
            'permission' => $permission->load('roles'),
        ]);
    }

    /**
     * Show the form for editing the specified permission.
     */
    public function edit(Permission $permission)
    {
        return inertia('permissions/edit', [
            'permission' => $permission,
            'suggested_groups' => Permission::query()
                ->whereNotNull('group')
                ->where('id', '!=', $permission->id)
                ->distinct()
                ->orderBy('group')
                ->pluck('group')
                ->all(),
        ]);
    }

    /**
     * Update the specified permission in storage.
     */
    public function update(PermissionRequest $request, Permission $permission)
    {
        $validated = $request->validated();

        $permission->update($validated);

        return redirect()->route('permissions.index')
            ->with('success', 'Permission updated successfully.');
    }

    /**
     * Remove the specified permission from storage.
     */
    public function destroy(Permission $permission)
    {
        // Check if permission is assigned to any roles
        if ($permission->roles()->exists()) {
            return redirect()->route('permissions.index')
                ->with('error', 'Cannot delete permission that is assigned to roles.');
        }

        $permission->delete();

        return redirect()->route('permissions.index')
            ->with('success', 'Permission deleted successfully.');
    }
}