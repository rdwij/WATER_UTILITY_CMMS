import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
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

type Role = {
    id: number;
    name: string;
    display_name: string;
    description: string | null;
};

type UserRef = { id: number; name: string; email: string };

type Permission = {
    id: number;
    name: string;
    display_name: string;
    group: string;
};

type Props = {
    role: Role & {
        users?: UserRef[];
        permissions?: Permission[];
    };
};

export default function RolesShow({ role }: Props) {
    const users = role.users ?? [];
    const permissions = role.permissions ?? [];
    const [deleting, setDeleting] = useState(false);

    // Group permissions by their group label.
    const grouped = permissions.reduce<Record<string, Permission[]>>(
        (acc, p) => {
            (acc[p.group] ??= []).push(p);
            return acc;
        },
        {},
    );

    const handleDelete = () => {
        if (
            !window.confirm(
                `Delete role ${role.display_name}? Users with this role will lose its permissions.`,
            )
        ) {
            return;
        }
        setDeleting(true);
        router.delete(route('roles.destroy', role.id), {
            preserveScroll: true,
            onFinish: () => setDeleting(false),
        });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Roles', href: route('roles.index') },
                {
                    title: role.display_name,
                    href: route('roles.show', role.id),
                },
            ]}
        >
            <Head title={`Role: ${role.display_name}`} />
            <div className="space-y-6 p-6">
                <header>
                    <Button asChild variant="ghost" size="sm">
                        <Link href={route('roles.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to roles
                        </Link>
                    </Button>
                    <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                                <ShieldCheck className="h-6 w-6" />
                                {role.display_name}
                            </h1>
                            <p className="mt-1 font-mono text-sm text-muted-foreground">
                                {role.name}
                            </p>
                            {role.description && (
                                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                                    {role.description}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button asChild variant="outline" size="sm">
                                <Link
                                    href={route('roles.edit', role.id)}
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

                <div className="grid gap-6 md:grid-cols-2">
                    <section className="rounded-lg border bg-card p-6">
                        <h2 className="text-lg font-semibold">
                            Users ({users.length})
                        </h2>
                        {users.length === 0 ? (
                            <p className="mt-4 text-sm text-muted-foreground">
                                No users are assigned this role.
                            </p>
                        ) : (
                            <Table className="mt-4">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead className="w-24 text-right">
                                            Action
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((u) => (
                                        <TableRow key={u.id}>
                                            <TableCell className="font-medium">
                                                {u.name}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {u.email}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    variant="ghost"
                                                >
                                                    <Link
                                                        href={route(
                                                            'users.show',
                                                            u.id,
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
                        )}
                    </section>

                    <section className="rounded-lg border bg-card p-6">
                        <h2 className="text-lg font-semibold">
                            Permissions ({permissions.length})
                        </h2>
                        {permissions.length === 0 ? (
                            <p className="mt-4 text-sm text-muted-foreground">
                                No permissions assigned to this role.
                            </p>
                        ) : (
                            <div className="mt-4 space-y-4">
                                {Object.entries(grouped).map(([group, list]) => (
                                    <div key={group}>
                                        <h3 className="text-sm font-medium capitalize">
                                            {group}{' '}
                                            <span className="text-muted-foreground">
                                                ({list.length})
                                            </span>
                                        </h3>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {list.map((p) => (
                                                <Badge
                                                    key={p.id}
                                                    variant="secondary"
                                                >
                                                    {p.display_name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}