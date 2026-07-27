import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Key, Save } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

type Props = {
    suggested_groups?: string[];
};

export default function PermissionsCreate({ suggested_groups = [] }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        display_name: '',
        description: '',
        group: '',
        is_active: true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('permissions.store'));
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Permissions', href: route('permissions.index') },
                { title: 'New Permission', href: route('permissions.create') },
            ]}
        >
            <Head title="New Permission" />
            <div className="space-y-6 p-6">
                <header>
                    <Button asChild variant="ghost" size="sm">
                        <Link href={route('permissions.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to permissions
                        </Link>
                    </Button>
                    <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
                        <Key className="h-6 w-6" />
                        New Permission
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Define a new system permission.
                    </p>
                </header>

                <form
                    onSubmit={submit}
                    className="max-w-2xl space-y-6 rounded-lg border bg-card p-6"
                >
                    <div className="space-y-1.5">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="users.manage"
                            aria-invalid={!!errors.name}
                            required
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">
                                {errors.name}
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Lowercase, dot-separated identifier (e.g.{' '}
                            <code>users.create</code>).
                        </p>
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
                            placeholder="Manage users"
                            aria-invalid={!!errors.display_name}
                            required
                        />
                        {errors.display_name && (
                            <p className="text-sm text-destructive">
                                {errors.display_name}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="group">Group</Label>
                        <Input
                            id="group"
                            type="text"
                            list="existing-groups"
                            value={data.group}
                            onChange={(e) => setData('group', e.target.value)}
                            placeholder="users"
                            aria-invalid={!!errors.group}
                            required
                        />
                        <datalist id="existing-groups">
                            {suggested_groups.map((g) => (
                                <option key={g} value={g} />
                            ))}
                        </datalist>
                        {errors.group && (
                            <p className="text-sm text-destructive">
                                {errors.group}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e) =>
                                setData('description', e.target.value)
                            }
                            placeholder="What this permission allows."
                            rows={3}
                        />
                        {errors.description && (
                            <p className="text-sm text-destructive">
                                {errors.description}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="is_active"
                            checked={data.is_active}
                            onCheckedChange={(checked) =>
                                setData('is_active', !!checked)
                            }
                        />
                        <Label htmlFor="is_active">Active</Label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button asChild variant="outline">
                            <Link href={route('permissions.index')}>
                                Cancel
                            </Link>
                        </Button>
                        <Button type="submit" disabled={processing}>
                            <Save className="mr-2 h-4 w-4" />
                            Create Permission
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
