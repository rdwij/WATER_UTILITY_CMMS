<?php

namespace App\Http\Controllers;

use App\Http\Requests\UserRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UserController extends Controller
{
    /**
     * Display a listing of the users.
     */
    public function index(Request $request)
    {
        $query = User::with(['roles', 'employee']);

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Filter by role
        if ($request->filled('role')) {
            $query->whereHas('roles', function ($q) use ($request) {
                $q->where('name', $request->input('role'));
            });
        }

        $users = $query->latest()->paginate(20)->withQueryString();

        return inertia('users/index', [
            'users' => $users,
            'filters' => $request->only(['search', 'role']),
            'roles' => \App\Models\Role::pluck('name', 'name'),
            'can' => [
                'view' => $request->user()?->hasPermission('users.view') ?? false,
                'create' => $request->user()?->hasPermission('users.create') ?? false,
                'edit' => $request->user()?->hasPermission('users.edit') ?? false,
                'delete' => $request->user()?->hasPermission('users.delete') ?? false,
                'manage' => $request->user()?->hasPermission('users.manage') ?? false,
            ],
        ]);
    }

    /**
     * Show the form for creating a new user.
     */
    public function create()
    {
        return inertia('users/create', [
            'roles' => \App\Models\Role::pluck('name', 'name'),
        ]);
    }

    /**
     * Store a newly created user in storage.
     */
    public function store(UserRequest $request)
    {
        $validated = $request->validated();

        // Handle avatar upload
        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('profiles', 'public');
            $validated['avatar'] = $path;
        }

        // Create user
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'avatar' => $validated['avatar'] ?? null,
            'currency' => $validated['currency'] ?? 'USD',
            'dashboard_notifications' => $validated['dashboard_notifications'] ?? false,
            'email_notifications' => $validated['email_notifications'] ?? false,
            'sms_notifications' => $validated['sms_notifications'] ?? false,
            'phone_number' => $validated['phone_number'] ?? null,
        ]);

        // Assign roles if provided
        if ($request->filled('roles')) {
            $user->roles()->sync($validated['roles']);
        }

        return redirect()->route('users.index')
            ->with('success', 'User created successfully.');
    }

    /**
     * Display the specified user.
     */
    public function show(User $user)
    {
        return inertia('users/show', [
            'user' => $user->load(['roles', 'employee', 'employee.subordinates.user', 'employee.supervisor.user']),
        ]);
    }

    /**
     * Show the form for editing the specified user.
     */
    public function edit(User $user)
    {
        return inertia('users/edit', [
            'user' => $user->load('roles'),
            'roles' => \App\Models\Role::pluck('name', 'name'),
        ]);
    }

    /**
     * Update the specified user in storage.
     */
    public function update(UserRequest $request, User $user)
    {
        $validated = $request->validated();

        // Handle avatar upload
        if ($request->hasFile('avatar')) {
            // Delete old avatar if exists
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $path = $request->file('avatar')->store('profiles', 'public');
            $validated['avatar'] = $path;
        } elseif ($request->input('remove_avatar')) {
            // Remove avatar if requested
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $validated['avatar'] = null;
        }

        // Update user
        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'] ? Hash::make($validated['password']) : $user->password,
            'avatar' => $validated['avatar'] ?? $user->avatar,
            'currency' => $validated['currency'] ?? $user->currency,
            'dashboard_notifications' => $validated['dashboard_notifications'] ?? $user->dashboard_notifications,
            'email_notifications' => $validated['email_notifications'] ?? $user->email_notifications,
            'sms_notifications' => $validated['sms_notifications'] ?? $user->sms_notifications,
            'phone_number' => $validated['phone_number'] ?? $user->phone_number,
        ]);

        // Sync roles if provided
        if ($request->filled('roles')) {
            $user->roles()->sync($validated['roles']);
        }

        return redirect()->route('users.index')
            ->with('success', 'User updated successfully.');
    }

    /**
     * Remove the specified user from storage.
     */
    public function destroy(User $user)
    {
        // Delete associated employee if exists
        if ($user->employee) {
            $user->employee->delete();
        }

        // Delete avatar if exists
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        // Delete user
        $user->delete();

        return redirect()->route('users.index')
            ->with('success', 'User deleted successfully.');
    }
}