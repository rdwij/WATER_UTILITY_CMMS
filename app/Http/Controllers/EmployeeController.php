<?php

namespace App\Http\Controllers;

use App\Http\Requests\EmployeeRequest;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    /**
     * Display a listing of the employees.
     */
    public function index(Request $request)
    {
        $query = Employee::with(['user', 'supervisor']);

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('employee_id', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere(function ($q) use ($search) {
                        $q->whereHas('user', function ($q) use ($search) {
                            $q->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                    });
            });
        }

        // Filter by department
        if ($request->filled('department')) {
            $query->where('department', $request->input('department'));
        }

        // Filter by employment status
        if ($request->filled('employment_status')) {
            $query->where('employment_status', $request->input('employment_status'));
        }

        $employees = $query->latest()->paginate(20)->withQueryString();

        return inertia('employees/index', [
            'employees' => $employees,
            'filters' => $request->only(['search', 'department', 'employment_status']),
            'departments' => Employee::distinct()->pluck('department'),
            'employmentStatuses' => Employee::distinct()->pluck('employment_status'),
            'can' => [
                'view' => $request->user()?->hasPermission('employees.view') ?? false,
                'create' => $request->user()?->hasPermission('employees.create') ?? false,
                'edit' => $request->user()?->hasPermission('employees.edit') ?? false,
                'delete' => $request->user()?->hasPermission('employees.delete') ?? false,
            ],
        ]);
    }

    /**
     * Show the form for creating a new employee.
     */
    public function create()
    {
        return inertia('employees/create', [
            'users' => User::doesntHave('employee')->get(['id', 'name', 'email']),
            'supervisors' => Employee::with('user')->whereNotNull('termination_date')->get(['id', 'first_name', 'last_name']),
        ]);
    }

    /**
     * Store a newly created employee in storage.
     */
    public function store(EmployeeRequest $request)
    {
        $validated = $request->validated();

        // Create user first
        $user = User::create([
            'name' => "{$validated['first_name']} {$validated['last_name']}",
            'email' => $validated['email'],
            'password' => Hash::make(Str::random(16)), // Temporary password
        ]);

        // Create employee
        $employee = Employee::create(array_merge($validated, [
            'user_id' => $user->id,
        ]));

        // Assign default role (viewer) if exists — newly-created employees
        // shouldn't get admin-level access by accident.
        $defaultRole = \App\Models\Role::where('name', 'viewer')->first();
        if ($defaultRole) {
            $user->roles()->attach($defaultRole->id);
        }

        return redirect()->route('employees.index')
            ->with('success', 'Employee created successfully.');
    }

    /**
     * Display the specified employee.
     */
    public function show(Employee $employee)
    {
        return inertia('employees/show', [
            'employee' => $employee->load(['user', 'supervisor.user', 'subordinates.user']),
        ]);
    }

    /**
     * Show the form for editing the specified employee.
     */
    public function edit(Employee $employee)
    {
        return inertia('employees/edit', [
            'employee' => $employee->load('user'),
            'users' => User::where('id', $employee->user_id)
                ->orWhereDoesntHave('employee')
                ->get(['id', 'name', 'email']),
            'supervisors' => Employee::with('user')
                ->whereNotNull('termination_date')
                ->where('id', '!=', $employee->id)
                ->get(['id', 'first_name', 'last_name']),
        ]);
    }

    /**
     * Update the specified employee in storage.
     */
    public function update(EmployeeRequest $request, Employee $employee)
    {
        $validated = $request->validated();

        // Update user information
        $employee->user->update([
            'name' => "{$validated['first_name']} {$validated['last_name']}",
            'email' => $validated['email'],
        ]);

        // Update employee information
        $employee->update($validated);

        return redirect()->route('employees.index')
            ->with('success', 'Employee updated successfully.');
    }

    /**
     * Remove the specified employee from storage.
     */
    public function destroy(Employee $employee)
    {
        // Soft delete the employee
        $employee->delete();

        // Optionally, you could also delete the associated user
        // $employee->user->delete();

        return redirect()->route('employees.index')
            ->with('success', 'Employee deleted successfully.');
    }
}