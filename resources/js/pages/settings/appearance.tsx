import { Head } from '@inertiajs/react';
import Controller from '@/actions/Inertia/Controller';
import AppearanceToggle from '@/components/appearance-toggle';
import Heading from '@/components/heading';

export default function Appearance() {
    return (
        <>
            <Head title="Appearance settings" />

            <h1 className="sr-only">Appearance settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Appearance settings"
                    description="Update the appearance settings for your account"
                />
                <AppearanceToggle />
            </div>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Appearance settings',
            href: Controller['/settings/appearance'](),
        },
    ],
};
