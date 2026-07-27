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
    Trash2,
    UserCog,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

type Role = {
    id: number;
    name: string;
    display_name: string;
};

type UserRow = {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    email_verified_at: string | null;
    roles: Role[];
    employee: { employee_id: string } | null;
};

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
};

type Props = {
    users: Paginated<UserRow>;
    filters: { search?: string; role?: string };
    roles: Record<string, string>;
    can: {
        view: boolean;
        create: boolean;
        edit: boolean;
        delete: boolean;
        manage: boolean;
    };
};

function initials(name: string) {
    return (
        name
            .split(' ')
            .filter(Boolean)
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || '?'
    );
}

export default function UsersIndex() {
    const { users, filters, roles, can } = usePage<Props>().props;

    const { data, setData, get, processing, reset } = useForm({
        search: filters.search ?? '',
        role: filters.role ?? '',
    });

    const [filtersOpen, setFiltersOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        get(route('users.index'), { preserveScroll: true, preserveState: true });
    };

    const resetFilters = () => {
        reset();
        get(route('users.index'), { preserveScroll: true, preserveState: true });
    };

    const handleDelete = (user: UserRow) => {
        if (
            !window.confirm(
                `Delete user ${user.name}? This will remove their account and any linked employee record.`,
            )
        ) {
            return;
        }
        setDeletingId(user.id);
        router.delete(route('users.destroy', user.id), {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    const goToPage = (page: number) => {
        get(
            route('users.index', {
                ...data,
                page,
            }),
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <AppLayout>
            <Head title="Users" />
            <div className="space-y-6 p-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                            <UserCog className="h-6 w-6" />
                            Users
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage system users, their roles, and linked employee
                            records.
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
                                <Link href={route('users.create')}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    New User
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
                            <label htmlFor="user-search" className="text-sm font-medium">
                                Search
                            </label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="user-search"
                                    type="search"
                                    className="pl-9"
                                    placeholder="Name or email"
                                    value={data.search}
                                    onChange={(e) => setData('search', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="user-role" className="text-sm font-medium">
                                Role
                            </label>
                            <select
                                id="user-role"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={data.role}
                                onChange={(e) => setData('role', e.target.value)}
                            >
                                <option value="">All roles</option>
                                {Object.entries(roles).map(([name, display]) => (
                                    <option key={name} value={name}>
                                        {display}
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
                                <TableHead className="w-64">Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Roles</TableHead>
                                <TableHead>Employee ID</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-44 text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="py-12 text-center text-sm text-muted-foreground"
                                    >
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.data.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                {user.avatar ? (
                                                    <img
                                                        src={`/storage/${user.avatar}`}
                                                        alt=""
                                                        className="h-8 w-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                                        {initials(user.name)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-medium">
                                                        {user.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        ID #{user.id}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {user.email}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {user.roles.length === 0 ? (
                                                    <span className="text-xs text-muted-foreground">
                                                        No role
                                                    </span>
                                                ) : (
                                                    user.roles.map((role) => (
                                                        <span
                                                            key={role.id}
                                                            className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                                                        >
                                                            {role.display_name}
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {user.employee ? (
                                                user.employee.employee_id
                                            ) : (
                                                <span className="font-sans text-muted-foreground">
                                                    Not linked
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    user.email_verified_at
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                }`}
                                            >
                                                {user.email_verified_at
                                                    ? 'Verified'
                                                    : 'Unverified'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-1">
                                                {can.view && (
                                                    <Button
                                                        asChild
                                                        size="icon"
                                                        variant="ghost"
                                                        aria-label="View user"
                                                    >
                                                        <Link
                                                            href={route(
                                                                'users.show',
                                                                user.id,
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
                                                        aria-label="Edit user"
                                                    >
                                                        <Link
                                                            href={route(
                                                                'users.edit',
                                                                user.id,
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
                                                        aria-label="Delete user"
                                                        disabled={
                                                            deletingId === user.id
                                                        }
                                                        onClick={() =>
                                                            handleDelete(user)
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

                {users.last_page > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                        <p className="text-muted-foreground">
                            Showing {users.data.length} of {users.total} users · Page{' '}
                            {users.current_page} of {users.last_page}
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={users.current_page <= 1}
                                onClick={() => goToPage(users.current_page - 1)}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={users.current_page >= users.last_page}
                                onClick={() => goToPage(users.current_page + 1)}
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