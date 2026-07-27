import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save, UserCog } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

type Role = { id: number; name: string; display_name: string };

type Props = {
    roles: Role[];
};

function toggleId(list: number[], id: number, on: boolean): number[] {
    if (on) return list.includes(id) ? list : [...list, id];
    return list.filter((x) => x !== id);
}

export default function UsersCreate({ roles = [] }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        currency: 'USD',
        phone_number: '',
        dashboard_notifications: false,
        email_notifications: false,
        sms_notifications: false,
        roles: [] as number[],
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('users.store'));
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Users', href: route('users.index') },
                { title: 'New User', href: route('users.create') },
            ]}
        >
            <Head title="New User" />
            <div className="space-y-6 p-6">
                <header>
                    <Button asChild variant="ghost" size="sm">
                        <Link href={route('users.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to users
                        </Link>
                    </Button>
                    <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
                        <UserCog className="h-6 w-6" />
                        New User
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Create a new system user.
                    </p>
                </header>

                <form
                    onSubmit={submit}
                    className="max-w-3xl space-y-6 rounded-lg border bg-card p-6"
                >
                    <section className="space-y-4">
                        <h2 className="text-lg font-semibold">
                            Basic information
                        </h2>
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
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) =>
                                        setData('email', e.target.value)
                                    }
                                    aria-invalid={!!errors.email}
                                    required
                                />
                                {errors.email && (
                                    <p className="text-sm text-destructive">
                                        {errors.email}
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-lg font-semibold">Authentication</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) =>
                                        setData('password', e.target.value)
                                    }
                                    aria-invalid={!!errors.password}
                                    required
                                />
                                {errors.password && (
                                    <p className="text-sm text-destructive">
                                        {errors.password}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="password_confirmation">
                                    Confirm password
                                </Label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={(e) =>
                                        setData(
                                            'password_confirmation',
                                            e.target.value,
                                        )
                                    }
                                    aria-invalid={
                                        !!errors.password_confirmation
                                    }
                                    required
                                />
                                {errors.password_confirmation && (
                                    <p className="text-sm text-destructive">
                                        {errors.password_confirmation}
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-lg font-semibold">Profile</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="currency">Currency</Label>
                                <select
                                    id="currency"
                                    value={data.currency}
                                    onChange={(e) =>
                                        setData('currency', e.target.value)
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="USD">USD - US Dollar</option>
                                    <option value="EUR">EUR - Euro</option>
                                    <option value="GBP">
                                        GBP - British Pound
                                    </option>
                                    <option value="CAD">
                                        CAD - Canadian Dollar
                                    </option>
                                    <option value="AUD">
                                        AUD - Australian Dollar
                                    </option>
                                    <option value="LKR">
                                        LKR - Sri Lankan Rupee
                                    </option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="phone_number">Phone</Label>
                                <Input
                                    id="phone_number"
                                    type="tel"
                                    value={data.phone_number}
                                    onChange={(e) =>
                                        setData('phone_number', e.target.value)
                                    }
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                            <Label className="text-sm">Notifications</Label>
                            <div className="flex flex-col gap-2 text-sm">
                                <label className="flex items-center gap-2">
                                    <Checkbox
                                        checked={
                                            data.dashboard_notifications
                                        }
                                        onCheckedChange={(v) =>
                                            setData(
                                                'dashboard_notifications',
                                                !!v,
                                            )
                                        }
                                    />
                                    Dashboard notifications
                                </label>
                                <label className="flex items-center gap-2">
                                    <Checkbox
                                        checked={data.email_notifications}
                                        onCheckedChange={(v) =>
                                            setData(
                                                'email_notifications',
                                                !!v,
                                            )
                                        }
                                    />
                                    Email notifications
                                </label>
                                <label className="flex items-center gap-2">
                                    <Checkbox
                                        checked={data.sms_notifications}
                                        onCheckedChange={(v) =>
                                            setData(
                                                'sms_notifications',
                                                !!v,
                                            )
                                        }
                                    />
                                    SMS notifications
                                </label>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-lg font-semibold">
                            Role assignment
                        </h2>
                        <div className="space-y-2 rounded-md border bg-muted/30 p-4">
                            {roles.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    No roles exist yet.
                                </p>
                            )}
                            {roles.map((r) => {
                                const checked = data.roles.includes(r.id);
                                return (
                                    <label
                                        key={r.id}
                                        className="flex items-center gap-2 text-sm"
                                    >
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={(v) =>
                                                setData(
                                                    'roles',
                                                    toggleId(
                                                        data.roles,
                                                        r.id,
                                                        !!v,
                                                    ),
                                                )
                                            }
                                        />
                                        <span>
                                            {r.display_name}{' '}
                                            <span className="font-mono text-xs text-muted-foreground">
                                                ({r.name})
                                            </span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </section>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button asChild variant="outline">
                            <Link href={route('users.index')}>Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={processing}>
                            <Save className="mr-2 h-4 w-4" />
                            Create User
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}