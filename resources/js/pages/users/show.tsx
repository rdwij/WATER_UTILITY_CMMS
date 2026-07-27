import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Pencil, Trash2, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

type Role = { id: number; name: string; display_name: string };

type Subordinate = {
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
    position_title?: string;
    department?: string;
    employment_status?: string;
    hire_date?: string | null;
    termination_date?: string | null;
    phone_number?: string | null;
    emergency_contact?: string | null;
    emergency_phone?: string | null;
    subordinates?: Subordinate[];
};

type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    email_verified_at?: string | null;
    phone_number?: string | null;
    dashboard_notifications?: boolean;
    email_notifications?: boolean;
    sms_notifications?: boolean;
    currency?: string;
    created_at?: string;
    roles: Role[];
    employee?: Employee;
};

type Props = { user: User };

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

function statusLabel(s?: string) {
    if (!s) return '';
    const v = s.replace('_', ' ');
    return v.charAt(0).toUpperCase() + v.slice(1);
}

function fmtDate(d?: string | null) {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString();
}

export default function UsersShow({ user }: Props) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = () => {
        if (
            !window.confirm(
                `Delete user ${user.name}? This will remove their employee record too.`,
            )
        ) {
            return;
        }
        setDeleting(true);
        router.delete(route('users.destroy', user.id), {
            preserveScroll: true,
            onFinish: () => setDeleting(false),
        });
    };

    const subordinates = user.employee?.subordinates ?? [];

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Users', href: route('users.index') },
                { title: user.name, href: route('users.show', user.id) },
            ]}
        >
            <Head title={`User: ${user.name}`} />
            <div className="space-y-6 p-6">
                <header>
                    <Button asChild variant="ghost" size="sm">
                        <Link href={route('users.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to users
                        </Link>
                    </Button>
                    <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                {user.avatar ? (
                                    <AvatarImage
                                        src={user.avatar}
                                        alt={user.name}
                                    />
                                ) : null}
                                <AvatarFallback>
                                    {initials(user.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                                    <UserIcon className="h-6 w-6" />
                                    {user.name}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {user.email}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <Badge
                                        variant={
                                            user.email_verified_at
                                                ? 'default'
                                                : 'secondary'
                                        }
                                    >
                                        {user.email_verified_at
                                            ? 'Verified'
                                            : 'Unverified'}
                                    </Badge>
                                    {user.roles.map((r) => (
                                        <Badge
                                            key={r.id}
                                            variant="outline"
                                        >
                                            {r.display_name}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button asChild variant="outline" size="sm">
                                <Link href={route('users.edit', user.id)}>
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
                    <section className="rounded-lg border bg-card p-6 md:col-span-1">
                        <h2 className="text-lg font-semibold">Account</h2>
                        <dl className="mt-4 space-y-3 text-sm">
                            <div>
                                <dt className="text-muted-foreground">
                                    Phone
                                </dt>
                                <dd>
                                    {user.phone_number || 'Not provided'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Currency
                                </dt>
                                <dd>{user.currency ?? 'USD'}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Member since
                                </dt>
                                <dd>{fmtDate(user.created_at)}</dd>
                            </div>
                        </dl>
                    </section>

                    <section className="rounded-lg border bg-card p-6 md:col-span-2">
                        <h2 className="text-lg font-semibold">
                            Notification preferences
                        </h2>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Badge variant="secondary">
                                Dashboard:{' '}
                                {user.dashboard_notifications ? 'On' : 'Off'}
                            </Badge>
                            <Badge variant="secondary">
                                Email:{' '}
                                {user.email_notifications ? 'On' : 'Off'}
                            </Badge>
                            <Badge variant="secondary">
                                SMS:{' '}
                                {user.sms_notifications ? 'On' : 'Off'}
                            </Badge>
                        </div>
                    </section>
                </div>

                {user.employee && (
                    <section className="rounded-lg border bg-card p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Employee record
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Employee ID:{' '}
                                    {user.employee.employee_id}
                                </p>
                            </div>
                            <Button asChild variant="outline" size="sm">
                                <Link
                                    href={route(
                                        'employees.show',
                                        user.employee.id,
                                    )}
                                >
                                    View employee
                                </Link>
                            </Button>
                        </div>
                        <dl className="mt-4 grid gap-4 text-sm md:grid-cols-3">
                            <div>
                                <dt className="text-muted-foreground">
                                    Position
                                </dt>
                                <dd>
                                    {user.employee.position_title ??
                                        'Not set'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Department
                                </dt>
                                <dd>
                                    {user.employee.department ?? 'Not set'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Status
                                </dt>
                                <dd>
                                    <Badge
                                        variant={
                                            user.employee
                                                .employment_status === 'active'
                                                ? 'default'
                                                : 'destructive'
                                        }
                                    >
                                        {statusLabel(
                                            user.employee.employment_status,
                                        )}
                                    </Badge>
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Hire date
                                </dt>
                                <dd>
                                    {fmtDate(user.employee.hire_date)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Termination date
                                </dt>
                                <dd>
                                    {fmtDate(
                                        user.employee.termination_date,
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Emergency contact
                                </dt>
                                <dd>
                                    {user.employee.emergency_contact ||
                                        'Not provided'}
                                </dd>
                            </div>
                        </dl>
                    </section>
                )}

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
            </div>
        </AppLayout>
    );
}