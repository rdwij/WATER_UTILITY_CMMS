import * as employees from '@/routes/employees';
import * as users from '@/routes/users';
import * as roles from '@/routes/roles';
import * as permissions from '@/routes/permissions';
import {
    dashboard,
    home,
    login,
    register,
    logout,
} from '@/routes';

// Loose typings here are intentional. The Wayfinder-generated helpers
// have a precise per-action signature (some take a model id, some take
// query options, some take both) but our `route()` shim has to accept
// every variant. Forwarding through `any` keeps the call sites untouched
// while still preserving the compile-time safety of the underlying
// Wayfinder functions for any code that imports them directly.
type UrlFn = (...args: any[]) => string;
type WayfinderModule = Record<string, UrlFn>;

const modules: Record<string, WayfinderModule> = {
    employees: employees as unknown as WayfinderModule,
    users: users as unknown as WayfinderModule,
    roles: roles as unknown as WayfinderModule,
    permissions: permissions as unknown as WayfinderModule,
};

// Root-level routes (dashboard, login, home, register, logout) are
// exported from @/routes directly.
const rootRoutes: WayfinderModule = {
    dashboard: dashboard.url.bind(dashboard) as UrlFn,
    home: home.url.bind(home) as UrlFn,
    login: login.url.bind(login) as UrlFn,
    register: register.url.bind(register) as UrlFn,
    logout: logout.url.bind(logout) as UrlFn,
};

function lookupAction(name: string): UrlFn | null {
    const dot = name.indexOf('.');
    if (dot === -1) return null;
    const resource = name.slice(0, dot);
    const action = name.slice(dot + 1);

    // Resource-scoped routes: employees.show, users.update, etc.
    const mod = modules[resource];
    if (mod && typeof mod[action] === 'function') {
        return mod[action];
    }

    // Root-level routes: dashboard, login, etc.
    if (resource === '' && rootRoutes[action]) {
        return rootRoutes[action];
    }

    return null;
}

/**
 * Mirrors the Laravel `route()` helper signature used throughout the
 * codebase. Routes are resolved through Wayfinder so that the URL is
 * type-safe and stays in sync with the named routes declared in
 * routes/web.php.
 *
 * Examples:
 *   route('dashboard')
 *   route('employees.index')
 *   route('employees.show', employee.id)
 *   route('users.update', user.id)
 */
export function route(name: string, ...params: unknown[]): string {
    const fn = lookupAction(name);
    if (!fn) {
        throw new Error(
            `route() — unknown route "${name}". ` +
                `Check that routes/web.php declares it and that Wayfinder has ` +
                `regenerated the corresponding resource module.`,
        );
    }
    const result = fn(...params);
    // Wayfinder resource actions are callable factories that return a
    // RouteDefinition ({ url, method, ...}). Root-level helpers in
    // @/routes already return the URL string directly. Handle both.
    if (typeof result === 'string') return result;
    if (result && typeof result.url === 'string') return result.url;
    throw new Error(
        `route() — "${name}" returned an unexpected value: ${JSON.stringify(result)}`,
    );
}

export default route;

declare global {
    interface Window {
        route: typeof route;
    }
}

if (typeof window !== 'undefined') {
    window.route = route;
}