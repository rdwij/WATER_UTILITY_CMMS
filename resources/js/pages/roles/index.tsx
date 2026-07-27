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
    Pencil,
    Plus,
    RotateCcw,
    Search,
    ShieldCheck,
    Trash2,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

type Role = {
    id: number;
    name: string;
    display_name: string;
    description: string | null;
    users_count: number;
    permissions_count: number;
};

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
};

type Props = {
    roles: Paginated<Role>;
    filters: { search?: string };
    can: { view: boolean; create: boolean; edit: boolean; delete: boolean };
};

export default function RolesIndex() {
    const { roles, filters, can } = usePage<Props>().props;

    const { data, setData, get, processing, reset } = useForm({
        search: filters.search ?? '',
    });

    const [filtersOpen, setFiltersOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        get(route('roles.index'), { preserveScroll: true, preserveState: true });
    };

    const resetFilters = () => {
        reset();
        get(route('roles.index'), { preserveScroll: true, preserveState: true });
    };

    const handleDelete = (role: Role) => {
        if (
            !window.confirm(
                `Delete role ${role.display_name}? Users with this role will lose its permissions.`,
            )
        ) {
            return;
        }
        setDeletingId(role.id);
        router.delete(route('roles.destroy', role.id), {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    const goToPage = (page: number) => {
        get(
            route('roles.index', { ...data, page }),
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <AppLayout>
            <Head title="Roles" />
            <div className="space-y-6 p-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                            <ShieldCheck className="h-6 w-6" />
                            Roles
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage user roles and the permissions they grant.
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
                                <Link href={route('roles.create')}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    New Role
                                </Link>
                            </Button>
                        )}
                    </div>
                </header>

                {filtersOpen && (
                    <form
                        onSubmit={submit}
                        className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-3"
                    >
                        <div className="space-y-1.5 md:col-span-2">
                            <label
                                htmlFor="role-search"
                                className="text-sm font-medium"
                            >
                                Search
                            </label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="role-search"
                                    type="search"
                                    className="pl-9"
                                    placeholder="Name or description"
                                    value={data.search}
                                    onChange={(e) =>
                                        setData('search', e.target.value)
                                    }
                                />
                            </div>
                        </div>
                        <div className="flex items-end justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={resetFilters}>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Reset
                            </Button>
                            <Button type="submit" disabled={processing}>
                                <Search className="mr-2 h-4 w-4" />
                                Apply
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
                                <TableHead>Description</TableHead>
                                <TableHead className="w-24 text-right">Users</TableHead>
                                <TableHead className="w-32 text-right">
                                    Permissions
                                </TableHead>
                                <TableHead className="w-44 text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {roles.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="py-12 text-center text-sm text-muted-foreground"
                                    >
                                        No roles found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                roles.data.map((role) => (
                                    <TableRow key={role.id}>
                                        <TableCell className="font-mono text-xs">
                                            {role.name}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {role.display_name}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {role.description ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {role.users_count}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {role.permissions_count}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-1">
                                                {can.view && (
                                                    <Button
                                                        asChild
                                                        size="icon"
                                                        variant="ghost"
                                                        aria-label="View role"
                                                    >
                                                        <Link
                                                            href={route(
                                                                'roles.show',
                                                                role.id,
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
                                                        aria-label="Edit role"
                                                    >
                                                        <Link
                                                            href={route(
                                                                'roles.edit',
                                                                role.id,
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
                                                        aria-label="Delete role"
                                                        disabled={
                                                            deletingId === role.id
                                                        }
                                                        onClick={() =>
                                                            handleDelete(role)
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

                {roles.last_page > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                        <p className="text-muted-foreground">
                            Showing {roles.data.length} of {roles.total} roles · Page{' '}
                            {roles.current_page} of {roles.last_page}
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={roles.current_page <= 1}
                                onClick={() => goToPage(roles.current_page - 1)}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={roles.current_page >= roles.last_page}
                                onClick={() => goToPage(roles.current_page + 1)}
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
