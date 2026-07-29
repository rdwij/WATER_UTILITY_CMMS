<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * Usage: `Route::middleware('role:admin,manager')->...`
     *
     * The legacy implementation read `$user->role` (an ENUM column on the
     * `users` table). That column has been dropped in favour of the
     * `role_user` pivot, so this middleware now uses `User::hasAnyRole()`
     * against the pivot.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string[]  ...$roles
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! $user->hasAnyRole($roles)) {
            abort(403, 'Unauthorized action — required role(s): '.implode(', ', $roles));
        }

        return $next($request);
    }
}
