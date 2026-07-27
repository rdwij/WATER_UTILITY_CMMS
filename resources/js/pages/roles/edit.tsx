import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save, ShieldCheck } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

type Permission = {
    id: number;
    name: string;
    display_name: string;
    group: string;
    is_active: boolean;
};

type Role = {
    id: number;
    name: string;
    display_name: string;
    description: string | null;
    permissions: Permission[];
};

type Props = {
    role: Role;
    permissions: Record<string, Permission[]>;
};

function toggleId(list: number[], id: number, on: boolean): number[] {
    if (on) {
        return list.includes(id) ? list : [...list, id];
    }
    return list.filter((x) => x !== id);
}

export default function RolesEdit({ role, permissions = {} }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        name: role.name,
        display_name: role.display_name,
        description: role.description ?? '',
        permissions: role.permissions.map((p) => p.id),
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('roles.update', role.id));
    };

    const groups = Object.keys(permissions);

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Roles', href: route('roles.index') },
                {
                    title: role.display_name,
                    href: route('roles.show', role.id),
                },
                { title: 'Edit', href: route('roles.edit', role.id) },
            ]}
        >
            <Head title={`Edit ${role.display_name}`} />
            <div className="space-y-6 p-6">
                <header>
                    <Button asChild variant="ghost" size="sm">
                        <Link href={route('roles.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to roles
                        </Link>
                    </Button>
                    <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
                        <ShieldCheck className="h-6 w-6" />
                        Edit Role
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Update <strong>{role.display_name}</strong>{' '}
                        (<code>{role.name}</code>) and its permissions.
                    </p>
                </header>

                <form
                    onSubmit={submit}
                    className="space-y-6 rounded-lg border bg-card p-6"
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                aria-invalid={!!errors.name}
                                required
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="display_name">Display name</Label>
                            <Input
                                id="display_name"
                                type="text"
                                value={data.display_name}
                                onChange={(e) =>
                                    setData('display_name', e.target.value)
                                }
                                aria-invalid={!!errors.display_name}
                                required
                            />
                            {errors.display_name && (
                                <p className="text-sm text-destructive">
                                    {errors.display_name}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e) =>
                                setData('description', e.target.value)
                            }
                            rows={3}
                        />
                        {errors.description && (
                            <p className="text-sm text-destructive">
                                {errors.description}
                            </p>
                        )}
                    </div>

                    <div>
                        <Label className="text-base">Permissions</Label>
                        <p className="text-xs text-muted-foreground">
                            Check the permissions this role should have.
                        </p>
                        <div className="mt-4 space-y-6">
                            {groups.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    No active permissions exist yet.
                                </p>
                            )}
                            {groups.map((group) => (
                                <fieldset
                                    key={group}
                                    className="rounded-md border bg-muted/30 p-4"
                                >
                                    <legend className="px-2 text-sm font-medium capitalize">
                                        {group}
                                    </legend>
                                    <div className="grid gap-2 md:grid-cols-2">
                                        {permissions[group].map((p) => {
                                            const checked =
                                                data.permissions.includes(
                                                    p.id,
                                                );
                                            return (
                                                <label
                                                    key={p.id}
                                                    className="flex items-start gap-2 rounded p-1 text-sm hover:bg-muted/50"
                                                >
                                                    <Checkbox
                                                        checked={checked}
                                                        onCheckedChange={(
                                                            value,
                                                        ) =>
                                                            setData(
                                                                'permissions',
                                                                toggleId(
                                                                    data.permissions,
                                                                    p.id,
                                                                    !!value,
                                                                ),
                                                            )
                                                        }
                                                        className="mt-0.5"
                                                    />
                                                    <span className="flex-1">
                                                        <span className="font-medium">
                                                            {p.display_name}
                                                        </span>
                                                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                                                            {p.name}
                                                        </span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </fieldset>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button asChild variant="outline">
                            <Link href={route('roles.show', role.id)}>
                                Cancel
                            </Link>
                        </Button>
                        <Button type="submit" disabled={processing}>
                            <Save className="mr-2 h-4 w-4" />
                            Save changes
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}