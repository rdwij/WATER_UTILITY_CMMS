<?php

use Illuminate\Support\Facades\Route;

// Frontend routes
Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Employee management routes
    Route::prefix('employees')->name('employees.')->group(function () {
        Route::get('', [\App\Http\Controllers\EmployeeController::class, 'index'])->name('index');
        Route::get('create', [\App\Http\Controllers\EmployeeController::class, 'create'])->name('create');
        Route::post('', [\App\Http\Controllers\EmployeeController::class, 'store'])->name('store');
        Route::get('{employee}', [\App\Http\Controllers\EmployeeController::class, 'show'])->name('show');
        Route::get('{employee}/edit', [\App\Http\Controllers\EmployeeController::class, 'edit'])->name('edit');
        Route::put('{employee}', [\App\Http\Controllers\EmployeeController::class, 'update'])->name('update');
        Route::delete('{employee}', [\App\Http\Controllers\EmployeeController::class, 'destroy'])->name('destroy');
    });

    // User management routes
    Route::prefix('users')->name('users.')->group(function () {
        Route::get('', [\App\Http\Controllers\UserController::class, 'index'])->name('index');
        Route::get('create', [\App\Http\Controllers\UserController::class, 'create'])->name('create');
        Route::post('', [\App\Http\Controllers\UserController::class, 'store'])->name('store');
        Route::get('{user}', [\App\Http\Controllers\UserController::class, 'show'])->name('show');
        Route::get('{user}/edit', [\App\Http\Controllers\UserController::class, 'edit'])->name('edit');
        Route::put('{user}', [\App\Http\Controllers\UserController::class, 'update'])->name('update');
        Route::delete('{user}', [\App\Http\Controllers\UserController::class, 'destroy'])->name('destroy');
    });

    // Role management routes
    Route::prefix('roles')->name('roles.')->group(function () {
        Route::get('', [\App\Http\Controllers\RoleController::class, 'index'])->name('index');
        Route::get('create', [\App\Http\Controllers\RoleController::class, 'create'])->name('create');
        Route::post('', [\App\Http\Controllers\RoleController::class, 'store'])->name('store');
        Route::get('{role}', [\App\Http\Controllers\RoleController::class, 'show'])->name('show');
        Route::get('{role}/edit', [\App\Http\Controllers\RoleController::class, 'edit'])->name('edit');
        Route::put('{role}', [\App\Http\Controllers\RoleController::class, 'update'])->name('update');
        Route::delete('{role}', [\App\Http\Controllers\RoleController::class, 'destroy'])->name('destroy');
    });

    // Permission management routes
    Route::prefix('permissions')->name('permissions.')->group(function () {
        Route::get('', [\App\Http\Controllers\PermissionController::class, 'index'])->name('index');
        Route::get('create', [\App\Http\Controllers\PermissionController::class, 'create'])->name('create');
        Route::post('', [\App\Http\Controllers\PermissionController::class, 'store'])->name('store');
        Route::get('{permission}', [\App\Http\Controllers\PermissionController::class, 'show'])->name('show');
        Route::get('{permission}/edit', [\App\Http\Controllers\PermissionController::class, 'edit'])->name('edit');
        Route::put('{permission}', [\App\Http\Controllers\PermissionController::class, 'update'])->name('update');
        Route::delete('{permission}', [\App\Http\Controllers\PermissionController::class, 'destroy'])->name('destroy');
    });
});

require __DIR__.'/settings.php';