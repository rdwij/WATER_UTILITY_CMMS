import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Key, Pencil, Trash2 } from 'lucide-react';
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

type Permission = {
    id: number;
    name: string;
    display_name: string;
    description: string | null;
    group: string;
    is_active: boolean;
};

type RoleRef = { id: number; name: string; display_name: string };

type Props = {
    permission: Permission & { roles?: RoleRef[] };
};

export default function PermissionsShow({ permission }: Props) {
    const roles = permission.roles ?? [];
    const [deleting, setDeleting] = useState(false);

    const handleDelete = () => {
        if (
            !window.confirm(
                `Delete permission ${permission.display_name}? Roles with this permission will lose it.`,
            )
        ) {
            return;
        }
        setDeleting(true);
        router.delete(route('permissions.destroy', permission.id), {
            preserveScroll: true,
            onFinish: () => setDeleting(false),
        });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Permissions', href: route('permissions.index') },
                {
                    title: permission.display_name,
                    href: route('permissions.show', permission.id),
                },
            ]}
        >
            <Head title={`Permission: ${permission.display_name}`} />
            <div className="space-y-6 p-6">
                <header>
                    <Button asChild variant="ghost" size="sm">
                        <Link href={route('permissions.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to permissions
                        </Link>
                    </Button>
                    <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                                <Key className="h-6 w-6" />
                                {permission.display_name}
                            </h1>
                            <p className="mt-1 font-mono text-sm text-muted-foreground">
                                {permission.name}
                            </p>
                            {permission.description && (
                                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                                    {permission.description}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button asChild variant="outline" size="sm">
                                <Link
                                    href={route(
                                        'permissions.edit',
                                        permission.id,
                                    )}
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
                        <h2 className="text-lg font-semibold">Details</h2>
                        <dl className="mt-4 space-y-3 text-sm">
                            <div>
                                <dt className="text-muted-foreground">Group</dt>
                                <dd className="mt-1">
                                    <Badge variant="secondary">
                                        {permission.group}
                                    </Badge>
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Status
                                </dt>
                                <dd className="mt-1">
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
                                </dd>
                            </div>
                        </dl>
                    </section>

                    <section className="rounded-lg border bg-card p-6">
                        <h2 className="text-lg font-semibold">
                            Roles with this permission ({roles.length})
                        </h2>
                        {roles.length === 0 ? (
                            <p className="mt-4 text-sm text-muted-foreground">
                                No roles currently have this permission.
                            </p>
                        ) : (
                            <Table className="mt-4">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Display name</TableHead>
                                        <TableHead className="w-32 text-right">
                                            Action
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {roles.map((role) => (
                                        <TableRow key={role.id}>
                                            <TableCell className="font-mono text-xs">
                                                {role.name}
                                            </TableCell>
                                            <TableCell>
                                                {role.display_name}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild size="sm" variant="ghost">
                                                    <Link
                                                        href={route(
                                                            'roles.show',
                                                            role.id,
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
                </div>
            </div>
        </AppLayout>
    );
}