import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Pencil,
    Trash2,
    User as UserIcon,
} from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type EmployeeRef = {
    id: number;
    first_name: string;
    last_name: string;
    employee_id: string;
    position_title?: string;
    department?: string;
    user?: { id: number; name: string; email: string };
};

type Employee = {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    middle_name?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
    phone_number?: string | null;
    emergency_contact?: string | null;
    emergency_phone?: string | null;
    position_title?: string;
    department?: string;
    hire_date?: string | null;
    termination_date?: string | null;
    employment_status?: string;
    certifications?: string | null;
    training_records?: string | null;
    notes?: string | null;
    user?: {
        id: number;
        name: string;
        email: string;
    };
    supervisor?: EmployeeRef | null;
    subordinates?: EmployeeRef[];
};

type Props = { employee: Employee };

function statusLabel(s?: string) {
    if (!s) return '';
    const v = s.replace('_', ' ');
    return v.charAt(0).toUpperCase() + v.slice(1);
}

function fmtDate(d?: string | null) {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString();
}

export default function EmployeesShow({ employee }: Props) {
    const [deleting, setDeleting] = useState(false);
    const subordinates = employee.subordinates ?? [];

    const handleDelete = () => {
        if (
            !window.confirm(
                `Delete ${employee.first_name} ${employee.last_name}?`,
            )
        ) {
            return;
        }
        setDeleting(true);
        router.delete(route('employees.destroy', employee.id), {
            preserveScroll: true,
            onFinish: () => setDeleting(false),
        });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Employees', href: route('employees.index') },
                {
                    title: `${employee.first_name} ${employee.last_name}`,
                    href: route('employees.show', employee.id),
                },
            ]}
        >
            <Head
                title={`Employee: ${employee.first_name} ${employee.last_name}`}
            />
            <div className="space-y-6 p-6">
                <header>
                    <Button asChild variant="ghost" size="sm">
                        <Link href={route('employees.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to employees
                        </Link>
                    </Button>
                    <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                                <UserIcon className="h-6 w-6" />
                                {employee.first_name} {employee.last_name}
                            </h1>
                            <p className="mt-1 font-mono text-sm text-muted-foreground">
                                {employee.employee_id}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                {employee.employment_status && (
                                    <Badge
                                        variant={
                                            employee.employment_status ===
                                            'active'
                                                ? 'default'
                                                : 'destructive'
                                        }
                                    >
                                        {statusLabel(
                                            employee.employment_status,
                                        )}
                                    </Badge>
                                )}
                                {employee.position_title && (
                                    <Badge variant="outline">
                                        {employee.position_title}
                                    </Badge>
                                )}
                                {employee.department && (
                                    <Badge variant="outline">
                                        {employee.department}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button asChild variant="outline" size="sm">
                                <Link
                                    href={route('employees.edit', employee.id)}
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                </Link>
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                disabled={deleting}
                                onClick={handleDelete}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </Button>
                        </div>
                    </div>
                </header>

                <div className="grid gap-6 md:grid-cols-3">
                    <section className="rounded-lg border bg-card p-6">
                        <h2 className="text-lg font-semibold">
                            User account
                        </h2>
                        {employee.user ? (
                            <dl className="mt-4 space-y-3 text-sm">
                                <div>
                                    <dt className="text-muted-foreground">
                                        Name
                                    </dt>
                                    <dd>
                                        <Link
                                            href={route(
                                                'users.show',
                                                employee.user.id,
                                            )}
                                            className="text-primary underline-offset-2 hover:underline"
                                        >
                                            {employee.user.name}
                                        </Link>
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">
                                        Email
                                    </dt>
                                    <dd>{employee.user.email}</dd>
                                </div>
                            </dl>
                        ) : (
                            <p className="mt-4 text-sm text-muted-foreground">
                                No linked user account.
                            </p>
                        )}
                    </section>

                    <section className="rounded-lg border bg-card p-6">
                        <h2 className="text-lg font-semibold">
                            Personal info
                        </h2>
                        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <dt className="text-muted-foreground">
                                    Date of birth
                                </dt>
                                <dd>{fmtDate(employee.date_of_birth)}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Gender
                                </dt>
                                <dd className="capitalize">
                                    {employee.gender ?? '—'}
                                </dd>
                            </div>
                            <div className="col-span-2">
                                <dt className="text-muted-foreground">
                                    Phone
                                </dt>
                                <dd>
                                    {employee.phone_number || 'Not provided'}
                                </dd>
                            </div>
                            <div className="col-span-2">
                                <dt className="text-muted-foreground">
                                    Emergency contact
                                </dt>
                                <dd>
                                    {employee.emergency_contact ||
                                        'Not provided'}
                                    {employee.emergency_phone
                                        ? ` · ${employee.emergency_phone}`
                                        : ''}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    <section className="rounded-lg border bg-card p-6">
                        <h2 className="text-lg font-semibold">
                            Employment
                        </h2>
                        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <dt className="text-muted-foreground">
                                    Hire date
                                </dt>
                                <dd>{fmtDate(employee.hire_date)}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Termination
                                </dt>
                                <dd>
                                    {fmtDate(employee.termination_date)}
                                </dd>
                            </div>
                            <div className="col-span-2">
                                <dt className="text-muted-foreground">
                                    Supervisor
                                </dt>
                                <dd>
                                    {employee.supervisor ? (
                                        <Link
                                            href={route(
                                                'employees.show',
                                                employee.supervisor.id,
                                            )}
                                            className="text-primary underline-offset-2 hover:underline"
                                        >
                                            {employee.supervisor.first_name}{' '}
                                            {employee.supervisor.last_name}
                                        </Link>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            None
                                        </span>
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </section>
                </div>

                {subordinates.length > 0 && (
                    <section className="rounded-lg border bg-card p-6">
                        <h2 className="text-lg font-semibold">
                            Direct reports ({subordinates.length})
                        </h2>
                        <Table className="mt-4">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Employee ID</TableHead>
                                    <TableHead>Position</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead className="w-24 text-right">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subordinates.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium">
                                            {s.first_name} {s.last_name}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {s.employee_id}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {s.position_title ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {s.department ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                asChild
                                                size="sm"
                                                variant="ghost"
                                            >
                                                <Link
                                                    href={route(
                                                        'employees.show',
                                                        s.id,
                                                    )}
                                                >
                                                    View
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </section>
                )}

                {(employee.certifications ||
                    employee.training_records ||
                    employee.notes) && (
                    <section className="rounded-lg border bg-card p-6">
                        <h2 className="text-lg font-semibold">
                            Additional information
                        </h2>
                        <dl className="mt-4 space-y-4 text-sm">
                            {employee.certifications && (
                                <div>
                                    <dt className="text-muted-foreground">
                                        Certifications
                                    </dt>
                                    <dd className="mt-1 whitespace-pre-wrap">
                                        {employee.certifications}
                                    </dd>
                                </div>
                            )}
                            {employee.training_records && (
                                <div>
                                    <dt className="text-muted-foreground">
                                        Training records
                                    </dt>
                                    <dd className="mt-1 whitespace-pre-wrap">
                                        {employee.training_records}
                                    </dd>
                                </div>
                            )}
                            {employee.notes && (
                                <div>
                                    <dt className="text-muted-foreground">
                                        Notes
                                    </dt>
                                    <dd className="mt-1 whitespace-pre-wrap">
                                        {employee.notes}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </section>
                )}
            </div>
        </AppLayout>
    );
}