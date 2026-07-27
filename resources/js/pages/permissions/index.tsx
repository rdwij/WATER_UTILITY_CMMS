import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Button,
    Input,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui';
import AppLayout from '@/layouts/app-layout';
import {
    ArrowDownNarrowWide,
    Eye,
    Key,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    Trash2,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

type Permission = {
    id: number;
    name: string;
    display_name: string;
    description: string | null;
    group: string;
    is_active: boolean;
    roles_count: number;
};

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
};

type Props = {
    permissions: Paginated<Permission>;
    filters: { search?: string; group?: string };
    groups: string[];
    can: { view: boolean; create: boolean; edit: boolean; delete: boolean };
};

export default function PermissionsIndex() {
    const { permissions, filters, groups, can } = usePage<Props>().props;

    const { data, setData, get, processing, reset } = useForm({
        search: filters.search ?? '',
        group: filters.group ?? '',
    });

    const [filtersOpen, setFiltersOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        get(route('permissions.index'), {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const resetFilters = () => {
        reset();
        get(route('permissions.index'), {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const handleDelete = (permission: Permission) => {
        if (
            !window.confirm(
                `Delete permission ${permission.name}? Roles with this permission will lose it.`,
            )
        ) {
            return;
        }
        setDeletingId(permission.id);
        router.delete(route('permissions.destroy', permission.id), {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    const goToPage = (page: number) => {
        get(
            route('permissions.index', { ...data, page }),
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <AppLayout>
            <Head title="Permissions" />
            <div className="space-y-6 p-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                            <Key className="h-6 w-6" />
                            Permissions
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage system permissions and access controls.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setFiltersOpen((v) => !v)}
                            aria-expanded={filtersOpen}
                        >
                            <ArrowDownNarrowWide className="mr-2 h-4 w-4" />
                            {filtersOpen ? 'Hide filters' : 'Show filters'}
                        </Button>
                        {can.create && (
                            <Button asChild>
                                <Link href={route('permissions.create')}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    New Permission
                                </Link>
                            </Button>
                        )}
                    </div>
                </header>

                {filtersOpen && (
                    <form
                        onSubmit={submit}
                        className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-2"
                    >
                        <div className="space-y-1.5">
                            <label
                                htmlFor="perm-search"
                                className="text-sm font-medium"
                            >
                                Search
                            </label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="perm-search"
                                    type="search"
                                    className="pl-9"
                                    placeholder="Name, display name, or description"
                                    value={data.search}
                                    onChange={(e) =>
                                        setData('search', e.target.value)
                                    }
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label
                                htmlFor="perm-group"
                                className="text-sm font-medium"
                            >
                                Group
                            </label>
                            <select
                                id="perm-group"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={data.group}
                                onChange={(e) => setData('group', e.target.value)}
                            >
                                <option value="">All groups</option>
                                {groups.map((g) => (
                                    <option key={g} value={g}>
                                        {g}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={resetFilters}>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Reset
                            </Button>
                            <Button type="submit" disabled={processing}>
                                <Search className="mr-2 h-4 w-4" />
                                Apply filters
                            </Button>
                        </div>
                    </form>
                )}

                <div className="overflow-hidden rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Display name</TableHead>
                                <TableHead>Group</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-24 text-right">Roles</TableHead>
                                <TableHead className="w-24">Status</TableHead>
                                <TableHead className="w-44 text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {permissions.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="py-12 text-center text-sm text-muted-foreground"
                                    >
                                        No permissions found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                permissions.data.map((permission) => (
                                    <TableRow key={permission.id}>
                                        <TableCell className="font-mono text-xs">
                                            {permission.name}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {permission.display_name}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                                {permission.group}
                                            </span>
                                        </TableCell>
                                        <TableCell className="max-w-xs text-sm text-muted-foreground">
                                            {permission.description ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {permission.roles_count}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    permission.is_active
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                                }`}
                                            >
                                                {permission.is_active
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-1">
                                                {can.view && (
                                                    <Button
                                                        asChild
                                                        size="icon"
                                                        variant="ghost"
                                                        aria-label="View permission"
                                                    >
                                                        <Link
                                                            href={route(
                                                                'permissions.show',
                                                                permission.id,
                                                            )}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                )}
                                                {can.edit && (
                                                    <Button
                                                        asChild
                                                        size="icon"
                                                        variant="ghost"
                                                        aria-label="Edit permission"
                                                    >
                                                        <Link
                                                            href={route(
                                                                'permissions.edit',
                                                                permission.id,
                                                            )}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                )}
                                                {can.delete && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        aria-label="Delete permission"
                                                        disabled={
                                                            deletingId ===
                                                            permission.id
                                                        }
                                                        onClick={() =>
                                                            handleDelete(permission)
                                                        }
                                                        className="text-rose-600 hover:text-rose-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {permissions.last_page > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                        <p className="text-muted-foreground">
                            Showing {permissions.data.length} of{' '}
                            {permissions.total} permissions · Page{' '}
                            {permissions.current_page} of {permissions.last_page}
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={permissions.current_page <= 1}
                                onClick={() =>
                                    goToPage(permissions.current_page - 1)
                                }
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                    permissions.current_page >= permissions.last_page
                                }
                                onClick={() =>
                                    goToPage(permissions.current_page + 1)
                                }
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
