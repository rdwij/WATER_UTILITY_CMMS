import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save, UserCog } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type User = { id: number; name: string; email: string };

type Supervisor = {
    id: number;
    first_name: string;
    last_name: string;
    employee_id?: string;
    user?: { name?: string; email?: string };
};

type Employee = {
    id: number;
    user_id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    middle_name?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
    phone_number?: string | null;
    emergency_contact?: string | null;
    emergency_phone?: string | null;
    position_title: string;
    department: string;
    hire_date?: string | null;
    termination_date?: string | null;
    employment_status: string;
    supervisor_id?: number | null;
    certifications?: string | null;
    training_records?: string | null;
    notes?: string | null;
    user?: { id: number; name: string; email: string };
};

type Props = {
    employee: Employee;
    users: User[];
    supervisors: Supervisor[];
};

export default function EmployeesEdit({
    employee,
    users = [],
    supervisors = [],
}: Props) {
    const { data, setData, post, processing, errors } = useForm({
        _method: 'put' as const,
        user_id: employee.user_id ?? '',
        employee_id: employee.employee_id ?? '',
        first_name: employee.first_name ?? '',
        last_name: employee.last_name ?? '',
        middle_name: employee.middle_name ?? '',
        email: employee.user?.email ?? '',
        date_of_birth: employee.date_of_birth?.slice(0, 10) ?? '',
        gender: employee.gender ?? '',
        phone_number: employee.phone_number ?? '',
        emergency_contact: employee.emergency_contact ?? '',
        emergency_phone: employee.emergency_phone ?? '',
        position_title: employee.position_title ?? '',
        department: employee.department ?? '',
        hire_date: employee.hire_date?.slice(0, 10) ?? '',
        termination_date: employee.termination_date?.slice(0, 10) ?? '',
        employment_status: employee.employment_status ?? 'active',
        supervisor_id: employee.supervisor_id ?? '',
        certifications: employee.certifications ?? '',
        training_records: employee.training_records ?? '',
        notes: employee.notes ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('employees.update', employee.id));
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Employees', href: route('employees.index') },
                {
                    title: `${employee.first_name} ${employee.last_name}`,
                    href: route('employees.show', employee.id),
                },
                {
                    title: 'Edit',
                    href: route('employees.edit', employee.id),
                },
            ]}
        >
            <Head
                title={`Edit ${employee.first_name} ${employee.last_name}`}
            />
            <div className="space-y-6 p-6">
                <header>
                    <Button asChild variant="ghost" size="sm">
                        <Link href={route('employees.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to employees
                        </Link>
                    </Button>
                    <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
                        <UserCog className="h-6 w-6" />
                        Edit Employee
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Employee ID:{' '}
                        <code>{employee.employee_id}</code>
                    </p>
                </header>

                <form
                    onSubmit={submit}
                    className="space-y-6 rounded-lg border bg-card p-6"
                >
                    <section className="space-y-4">
                        <h2 className="text-lg font-semibold">
                            Account link
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="user_id">
                                    Existing user
                                </Label>
                                <select
                                    id="user_id"
                                    value={data.user_id}
                                    onChange={(e) =>
                                        setData('user_id', e.target.value)
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">
                                        — No linked user —
                                    </option>
                                    {users.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} ({u.email})
                                        </option>
                                    ))}
                                </select>
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
                        <h2 className="text-lg font-semibold">
                            Employee information
                        </h2>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="employee_id">
                                    Employee ID
                                </Label>
                                <Input
                                    id="employee_id"
                                    type="text"
                                    value={data.employee_id}
                                    onChange={(e) =>
                                        setData(
                                            'employee_id',
                                            e.target.value,
                                        )
                                    }
                                    aria-invalid={!!errors.employee_id}
                                    required
                                />
                                {errors.employee_id && (
                                    <p className="text-sm text-destructive">
                                        {errors.employee_id}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="first_name">First name</Label>
                                <Input
                                    id="first_name"
                                    type="text"
                                    value={data.first_name}
                                    onChange={(e) =>
                                        setData('first_name', e.target.value)
                                    }
                                    aria-invalid={!!errors.first_name}
                                    required
                                />
                                {errors.first_name && (
                                    <p className="text-sm text-destructive">
                                        {errors.first_name}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="last_name">Last name</Label>
                                <Input
                                    id="last_name"
                                    type="text"
                                    value={data.last_name}
                                    onChange={(e) =>
                                        setData('last_name', e.target.value)
                                    }
                                    aria-invalid={!!errors.last_name}
                                    required
                                />
                                {errors.last_name && (
                                    <p className="text-sm text-destructive">
                                        {errors.last_name}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="middle_name">
                                    Middle name
                                </Label>
                                <Input
                                    id="middle_name"
                                    type="text"
                                    value={data.middle_name}
                                    onChange={(e) =>
                                        setData('middle_name', e.target.value)
                                    }
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="date_of_birth">
                                    Date of birth
                                </Label>
                                <Input
                                    id="date_of_birth"
                                    type="date"
                                    value={data.date_of_birth}
                                    onChange={(e) =>
                                        setData(
                                            'date_of_birth',
                                            e.target.value,
                                        )
                                    }
                                    aria-invalid={!!errors.date_of_birth}
                                    required
                                />
                                {errors.date_of_birth && (
                                    <p className="text-sm text-destructive">
                                        {errors.date_of_birth}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="gender">Gender</Label>
                                <select
                                    id="gender"
                                    value={data.gender}
                                    onChange={(e) =>
                                        setData('gender', e.target.value)
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">Select…</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="space-y-1.5 md:col-span-3">
                                <Label htmlFor="phone_number">Phone</Label>
                                <Input
                                    id="phone_number"
                                    type="tel"
                                    value={data.phone_number}
                                    onChange={(e) =>
                                        setData('phone_number', e.target.value)
                                    }
                                />
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-lg font-semibold">
                            Emergency contact
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="emergency_contact">
                                    Contact name
                                </Label>
                                <Input
                                    id="emergency_contact"
                                    type="text"
                                    value={data.emergency_contact}
                                    onChange={(e) =>
                                        setData(
                                            'emergency_contact',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="emergency_phone">
                                    Contact phone
                                </Label>
                                <Input
                                    id="emergency_phone"
                                    type="tel"
                                    value={data.emergency_phone}
                                    onChange={(e) =>
                                        setData(
                                            'emergency_phone',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-lg font-semibold">
                            Employment details
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="position_title">
                                    Position title
                                </Label>
                                <Input
                                    id="position_title"
                                    type="text"
                                    value={data.position_title}
                                    onChange={(e) =>
                                        setData(
                                            'position_title',
                                            e.target.value,
                                        )
                                    }
                                    aria-invalid={!!errors.position_title}
                                    required
                                />
                                {errors.position_title && (
                                    <p className="text-sm text-destructive">
                                        {errors.position_title}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="department">Department</Label>
                                <Input
                                    id="department"
                                    type="text"
                                    value={data.department}
                                    onChange={(e) =>
                                        setData('department', e.target.value)
                                    }
                                    aria-invalid={!!errors.department}
                                    required
                                />
                                {errors.department && (
                                    <p className="text-sm text-destructive">
                                        {errors.department}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="hire_date">Hire date</Label>
                                <Input
                                    id="hire_date"
                                    type="date"
                                    value={data.hire_date}
                                    onChange={(e) =>
                                        setData('hire_date', e.target.value)
                                    }
                                    aria-invalid={!!errors.hire_date}
                                    required
                                />
                                {errors.hire_date && (
                                    <p className="text-sm text-destructive">
                                        {errors.hire_date}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="employment_status">
                                    Employment status
                                </Label>
                                <select
                                    id="employment_status"
                                    value={data.employment_status}
                                    onChange={(e) =>
                                        setData(
                                            'employment_status',
                                            e.target.value,
                                        )
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">
                                        Inactive
                                    </option>
                                    <option value="on_leave">
                                        On Leave
                                    </option>
                                    <option value="terminated">
                                        Terminated
                                    </option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="termination_date">
                                    Termination date
                                </Label>
                                <Input
                                    id="termination_date"
                                    type="date"
                                    value={data.termination_date}
                                    onChange={(e) =>
                                        setData(
                                            'termination_date',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="supervisor_id">
                                    Supervisor
                                </Label>
                                <select
                                    id="supervisor_id"
                                    value={data.supervisor_id}
                                    onChange={(e) =>
                                        setData(
                                            'supervisor_id',
                                            e.target.value,
                                        )
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">None</option>
                                    {supervisors.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.first_name} {s.last_name}
                                            {s.employee_id
                                                ? ` (${s.employee_id})`
                                                : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-lg font-semibold">
                            Additional information
                        </h2>
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="certifications">
                                    Certifications
                                </Label>
                                <Textarea
                                    id="certifications"
                                    value={data.certifications}
                                    onChange={(e) =>
                                        setData(
                                            'certifications',
                                            e.target.value,
                                        )
                                    }
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="training_records">
                                    Training records
                                </Label>
                                <Textarea
                                    id="training_records"
                                    value={data.training_records}
                                    onChange={(e) =>
                                        setData(
                                            'training_records',
                                            e.target.value,
                                        )
                                    }
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={data.notes}
                                    onChange={(e) =>
                                        setData('notes', e.target.value)
                                    }
                                    rows={3}
                                />
                            </div>
                        </div>
                    </section>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button asChild variant="outline">
                            <Link href={route('employees.show', employee.id)}>
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