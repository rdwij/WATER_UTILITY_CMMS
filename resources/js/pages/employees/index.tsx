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
    Users as UsersIcon,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

type Employee = {
    id: number;
    user_id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    position_title: string | null;
    department: string | null;
    hire_date: string | null;
    termination_date: string | null;
    employment_status: 'active' | 'inactive' | 'terminated' | 'on_leave' | string;
    avatar?: string | null;
};

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
};

type Props = {
    employees: Paginated<Employee>;
    filters: { search?: string; department?: string; employment_status?: string };
    departments: string[];
    employmentStatuses: string[];
    can: { view: boolean; create: boolean; edit: boolean; delete: boolean };
};

const STATUS_BADGES: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    inactive: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    terminated: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    on_leave: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
};

function statusBadge(status: string) {
    return STATUS_BADGES[status] ?? 'bg-zinc-100 text-zinc-700';
}

function formatDate(date: string | null) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString();
}

function initials(first: string, last: string) {
    return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '??';
}

export default function EmployeesIndex() {
    const { employees, filters, departments, employmentStatuses, can } =
        usePage<Props>().props;

    const { data, setData, get, processing, reset } = useForm({
        search: filters.search ?? '',
        department: filters.department ?? '',
        employment_status: filters.employment_status ?? '',
    });

    const [filtersOpen, setFiltersOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        get(route('employees.index'), { preserveScroll: true, preserveState: true });
    };

    const resetFilters = () => {
        reset();
        get(route('employees.index'), { preserveScroll: true, preserveState: true });
    };

    const handleDelete = (employee: Employee) => {
        if (
            !window.confirm(
                `Delete employee ${employee.first_name} ${employee.last_name}? This cannot be undone.`,
            )
        ) {
            return;
        }
        setDeletingId(employee.id);
        router.delete(route('employees.destroy', employee.id), {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    const goToPage = (page: number) => {
        get(
            route('employees.index', {
                ...data,
                page,
            }),
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <AppLayout>
            <Head title="Employees" />
            <div className="space-y-6 p-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                            <UsersIcon className="h-6 w-6" />
                            Employees
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage employee information and records.
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
                                <Link href={route('employees.create')}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    New Employee
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
                        <div className="space-y-1.5">
                            <label
                                htmlFor="employee-search"
                                className="text-sm font-medium"
                            >
                                Search
                            </label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="employee-search"
                                    type="search"
                                    className="pl-9"
                                    placeholder="Name, ID, or email"
                                    value={data.search}
                                    onChange={(e) => setData('search', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label
                                htmlFor="employee-department"
                                className="text-sm font-medium"
                            >
                                Department
                            </label>
                            <select
                                id="employee-department"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={data.department}
                                onChange={(e) => setData('department', e.target.value)}
                            >
                                <option value="">All departments</option>
                                {departments.map((d) => (
                                    <option key={d} value={d}>
                                        {d}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label
                                htmlFor="employee-status"
                                className="text-sm font-medium"
                            >
                                Employment status
                            </label>
                            <select
                                id="employee-status"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={data.employment_status}
                                onChange={(e) =>
                                    setData('employment_status', e.target.value)
                                }
                            >
                                <option value="">All statuses</option>
                                {employmentStatuses.map((s) => (
                                    <option key={s} value={s}>
                                        {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-3 flex justify-end gap-2">
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
                                <TableHead className="w-24">ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Hire date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-44 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="py-12 text-center text-sm text-muted-foreground"
                                    >
                                        No employees found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                employees.data.map((employee) => (
                                    <TableRow key={employee.id}>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {employee.employee_id}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                {employee.avatar ? (
                                                    <img
                                                        src={`/storage/${employee.avatar}`}
                                                        alt=""
                                                        className="h-8 w-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                                        {initials(
                                                            employee.first_name,
                                                            employee.last_name,
                                                        )}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-medium">
                                                        {employee.first_name}{' '}
                                                        {employee.last_name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        ID #{employee.id}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {employee.position_title ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            {employee.department ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(employee.hire_date)}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(
                                                    employee.employment_status,
                                                )}`}
                                            >
                                                {employee.employment_status
                                                    .replace('_', ' ')
                                                    .replace(/\b\w/g, (c) =>
                                                        c.toUpperCase(),
                                                    )}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-1">
                                                {can.view && (
                                                    <Button
                                                        asChild
                                                        size="icon"
                                                        variant="ghost"
                                                        aria-label="View employee"
                                                    >
                                                        <Link
                                                            href={route(
                                                                'employees.show',
                                                                employee.id,
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
                                                        aria-label="Edit employee"
                                                    >
                                                        <Link
                                                            href={route(
                                                                'employees.edit',
                                                                employee.id,
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
                                                        aria-label="Delete employee"
                                                        disabled={
                                                            deletingId === employee.id
                                                        }
                                                        onClick={() =>
                                                            handleDelete(employee)
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

                {employees.last_page > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                        <p className="text-muted-foreground">
                            Showing {employees.data.length} of {employees.total}{' '}
                            employees · Page {employees.current_page} of{' '}
                            {employees.last_page}
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={employees.current_page <= 1}
                                onClick={() => goToPage(employees.current_page - 1)}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                    employees.current_page >= employees.last_page
                                }
                                onClick={() => goToPage(employees.current_page + 1)}
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