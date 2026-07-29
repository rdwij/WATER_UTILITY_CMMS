<?php

namespace App\Http\Controllers;

use App\Http\Requests\DepartmentRequest;
use App\Models\Department;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Department::query();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $departments = $query->withCount(['employees', 'children'])
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return inertia('departments/index', [
            'departments' => $departments,
            'filters' => $request->only(['search', 'is_active']),
            'can' => [
                'view' => $request->user()?->hasPermission('departments.view') ?? false,
                'create' => $request->user()?->hasPermission('departments.create') ?? false,
                'edit' => $request->user()?->hasPermission('departments.edit') ?? false,
                'delete' => $request->user()?->hasPermission('departments.delete') ?? false,
            ],
        ]);
    }

    public function create()
    {
        return inertia('departments/create', [
            'parents' => Department::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
        ]);
    }

    public function store(DepartmentRequest $request)
    {
        $validated = $request->validated();

        Department::create($validated + ['is_active' => $validated['is_active'] ?? true]);

        return redirect()->route('departments.index')
            ->with('success', 'Department created successfully.');
    }

    public function show(Department $department)
    {
        return inertia('departments/show', [
            'department' => $department->load(['parent', 'children', 'employees.user']),
        ]);
    }

    public function edit(Department $department)
    {
        return inertia('departments/edit', [
            'department' => $department,
            'parents' => Department::query()
                ->where('is_active', true)
                ->where('id', '!=', $department->id)
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
        ]);
    }

    public function update(DepartmentRequest $request, Department $department)
    {
        $department->update($request->validated());

        return redirect()->route('departments.index')
            ->with('success', 'Department updated successfully.');
    }

    public function destroy(Department $department)
    {
        if ($department->employees()->exists() || $department->children()->exists()) {
            return redirect()->route('departments.index')
                ->with('error', 'Cannot delete department that has employees or sub-departments.');
        }

        $department->delete();

        return redirect()->route('departments.index')
            ->with('success', 'Department deleted successfully.');
    }
}
