import * as employees from '@/routes/employees';
import * as users from '@/routes/users';
import * as roles from '@/routes/roles';
import * as permissions from '@/routes/permissions';
import * as departments from '@/routes/departments';
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
// every variant. Forwarding through `unknown[]` keeps the call sites
// untouched while still preserving the compile-time safety of the
// underlying Wayfinder functions for any code that imports them
// directly.
type Action = (...args: unknown[]) => unknown;

// Synthetic Wayfinder shape for the single-action `rbac` route. We
// could write a full `resources/js/routes/rbac/index.ts` module, but the
// route file would be identical to Wayfinder's generated output for a
// one-line `Route::get(...)` — easier to inline it here.
const rbacModule = {
    index: Object.assign(
        () => ({ url: '/rbac', method: 'get' }),
        { definition: { url: '/rbac' } },
    ),
} as unknown as Record<string, Action>;

const modules: Record<string, Record<string, Action>> = {
    employees: employees as unknown as Record<string, Action>,
    users: users as unknown as Record<string, Action>,
    roles: roles as unknown as Record<string, Action>,
    permissions: permissions as unknown as Record<string, Action>,
    departments: departments as unknown as Record<string, Action>,
    rbac: rbacModule,
};

// Root-level routes (dashboard, login, home, register, logout) are
// exported from @/routes directly. We store the raw callable so we
// can read the URL definition off of `.definition.url`.
const rootActions: Record<string, Action> = {
    dashboard: dashboard as unknown as Action,
    home: home as unknown as Action,
    login: login as unknown as Action,
    register: register as unknown as Action,
    logout: logout as unknown as Action,
};

function lookupAction(name: string): Action | null {
    // Root-level routes with no "." separator (dashboard, login, …).
    if (rootActions[name]) return rootActions[name];

    const dot = name.indexOf('.');
    if (dot === -1) return null;
    const resource = name.slice(0, dot);
    const action = name.slice(dot + 1);

    const mod = modules[resource];
    if (mod && typeof mod[action] === 'function') {
        return mod[action];
    }

    return null;
}

/**
 * Detect whether a value is a plain object (not an array, not a class
 * instance). Used to decide whether a `route()` arg should be wrapped
 * as a query-options bag.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object') return false;
    if (Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

/**
 * Many pages in this app call `route('employees.index', { page: 2 })`
 * with a flat query bag, but Wayfinder expects `RouteQueryOptions`
 * (`{ query: {...} }` or `{ mergeQuery: {...} }`). Translate the flat
 * form automatically — but only when the underlying URL template has
 * no model-binding placeholders (which would need a different first
 * arg shape, e.g. model id).
 */
function maybeWrapQuery(
    urlTemplate: string | null,
    first: unknown,
): unknown {
    if (!urlTemplate) return first;
    if (urlTemplate.includes('{')) return first;
    if (!isPlainObject(first)) return first;
    const keys = Object.keys(first);
    if (keys.includes('query') || keys.includes('mergeQuery')) return first;
    return { query: first };
}

/**
 * Read the URL template attached to a resolved route action. Each
 * Wayfinder-generated action exposes `.definition.url`, e.g.
 * `employees.show.definition.url === '/employees/{employee}'`.
 */
function readTemplate(name: string): string | null {
    const fn = lookupAction(name);
    if (!fn) return null;
    const def = (fn as unknown as { definition?: { url?: string } })
        .definition;
    return def?.url ?? null;
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
 *   route('employees.index', { page: 2 })    // auto-wrapped as RouteQueryOptions
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

    const template = readTemplate(name);
    const wrapped =
        params.length > 0
            ? [maybeWrapQuery(template, params[0]), ...params.slice(1)]
            : params;
    const result = fn(...wrapped);

    // Wayfinder resource actions are callable factories that return a
    // RouteDefinition ({ url, method, ... }). Root-level helpers in
    // @/routes already return the URL string directly. Handle both.
    if (typeof result === 'string') return result;
    if (result && typeof result === 'object' && 'url' in result) {
        const u = (result as { url: unknown }).url;
        if (typeof u === 'string') return u;
    }
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