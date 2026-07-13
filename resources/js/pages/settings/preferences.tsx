import { Form, Head, usePage } from '@inertiajs/react';
import {  useState } from 'react';

import PreferencesController from '@/actions/App/Http/Controllers/Settings/PreferencesController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import type { Auth } from '@/types';

type CurrencyOption = {
    value: string;
    label: string;
};

type PreferencesState = {
    currency: string;
    dashboardNotifications: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
};

type PageProps = {
    auth: Auth;
    currencies: CurrencyOption[];
};

export default function Preferences({
    currencies,
}: {
    currencies: CurrencyOption[];
}) {
    const { auth } = usePage<PageProps>().props;

    const [preferences, setPreferences] = useState<PreferencesState>({
        currency: auth.user.currency ?? 'USD',
        dashboardNotifications: auth.user.dashboard_notifications ?? true,
        emailNotifications: auth.user.email_notifications ?? true,
        smsNotifications: auth.user.sms_notifications ?? false,
    });

    

    const {
        currency,
        dashboardNotifications,
        emailNotifications,
        smsNotifications,
    } = preferences;

    return (
        <>
            <Head title="Preferences settings" />

            <h1 className="sr-only">Preferences settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Preferences"
                    description="Manage your currency and notification settings"
                />

                <Form
                    {...PreferencesController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            {/* Currency */}
                            <div className="grid gap-2">
                                <Label htmlFor="currency">Currency</Label>

                                <input
                                    type="hidden"
                                    name="currency"
                                    value={currency}
                                />

                                <Select
                                    value={currency}
                                    onValueChange={(value) =>
                                        setPreferences((prev) => ({
                                            ...prev,
                                            currency: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger
                                        id="currency"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Select a currency" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        {currencies.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <InputError
                                    className="mt-2"
                                    message={errors.currency}
                                />
                            </div>

                            {/* Notifications */}
                            <div className="grid gap-3">
                                <Label>Notifications</Label>

                                <input
                                    type="hidden"
                                    name="dashboard_notifications"
                                    value={dashboardNotifications ? '1' : '0'}
                                />

                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        id="dashboard_notifications"
                                        checked={dashboardNotifications}
                                        onCheckedChange={(checked) =>
                                            setPreferences((prev) => ({
                                                ...prev,
                                                dashboardNotifications:
                                                    checked === true,
                                            }))
                                        }
                                    />

                                    <Label
                                        htmlFor="dashboard_notifications"
                                        className="font-normal"
                                    >
                                        Dashboard Notifications
                                    </Label>
                                </div>

                                <input
                                    type="hidden"
                                    name="email_notifications"
                                    value={emailNotifications ? '1' : '0'}
                                />

                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        id="email_notifications"
                                        checked={emailNotifications}
                                        onCheckedChange={(checked) =>
                                            setPreferences((prev) => ({
                                                ...prev,
                                                emailNotifications:
                                                    checked === true,
                                            }))
                                        }
                                    />

                                    <Label
                                        htmlFor="email_notifications"
                                        className="font-normal"
                                    >
                                        Email Notifications
                                    </Label>
                                </div>

                                <input
                                    type="hidden"
                                    name="sms_notifications"
                                    value={smsNotifications ? '1' : '0'}
                                />

                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        id="sms_notifications"
                                        checked={smsNotifications}
                                        onCheckedChange={(checked) =>
                                            setPreferences((prev) => ({
                                                ...prev,
                                                smsNotifications:
                                                    checked === true,
                                            }))
                                        }
                                    />

                                    <Label
                                        htmlFor="sms_notifications"
                                        className="font-normal"
                                    >
                                        SMS Notifications
                                    </Label>
                                </div>

                                <InputError
                                    className="mt-2"
                                    message={
                                        errors.dashboard_notifications ||
                                        errors.email_notifications ||
                                        errors.sms_notifications
                                    }
                                />
                            </div>

                            {/* Phone Number */}
                            <div className="grid gap-2">
                                <Label htmlFor="phone_number">
                                    Phone Number
                                </Label>

                                <Input
                                    id="phone_number"
                                    type="tel"
                                    name="phone_number"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.phone_number ?? ''}
                                    autoComplete="tel"
                                    placeholder="Phone number"
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.phone_number}
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing}
                                    data-test="update-preferences-button"
                                >
                                    Save
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

Preferences.layout = {
    breadcrumbs: [
        {
            title: 'Preferences settings',
            href: PreferencesController.edit(),
        },
    ],
};