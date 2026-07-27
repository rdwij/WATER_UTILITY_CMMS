import { Link } from '@inertiajs/react';
import {
    LayoutGrid,
    Users,
    Key,
    ShieldCheck,
    SlidersHorizontal,
    UserCog,
    ListChecks,
    Plus,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import * as employees from '@/routes/employees';
import * as users from '@/routes/users';
import * as roles from '@/routes/roles';
import * as permissions from '@/routes/permissions';
import { usePage } from '@inertiajs/react';
import type { NavItem } from '@/types';

/**
 * Build the sidebar's nav tree from the authenticated user's
 * permissions. Each top-level item is shown when the user has the
 * relevant `.view` permission; its children appear when the user has
 * the corresponding verb (`.view`, `.create`, `.edit`, `.delete`).
 */
function buildNavItems(user: { permissions?: string[] } | null | undefined): NavItem[] {
    const items: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
    ];

    // --- Employees -------------------------------------------------
    if (
        user?.permissions?.includes('employees.view') ||
        user?.permissions?.includes('employees.create')
    ) {
        items.push({
            title: 'Employees',
            href: '#',
            icon: Users,
            children: [
                user?.permissions?.includes('employees.view') && {
                    title: 'All Employees',
                    href: employees.index(),
                    icon: ListChecks,
                },
                user?.permissions?.includes('employees.create') && {
                    title: 'New Employee',
                    href: employees.create(),
                    icon: Plus,
                },
            ].filter(Boolean) as NavItem[],
        });
    }

    // --- User Management (Users + Roles + Permissions) -------------
    const userMgmtChildren: NavItem[] = [];

    if (user?.permissions?.includes('users.view')) {
        userMgmtChildren.push(
            { title: 'All Users', href: users.index(), icon: Users },
            user?.permissions?.includes('users.create')
                ? { title: 'New User', href: users.create(), icon: Plus }
                : null,
        );
    }
    if (user?.permissions?.includes('roles.view')) {
        userMgmtChildren.push(
            { title: 'All Roles', href: roles.index(), icon: ShieldCheck },
            user?.permissions?.includes('roles.create')
                ? { title: 'New Role', href: roles.create(), icon: Plus }
                : null,
        );
    }
    if (user?.permissions?.includes('permissions.view')) {
        userMgmtChildren.push(
            { title: 'All Permissions', href: permissions.index(), icon: Key },
            user?.permissions?.includes('permissions.create')
                ? { title: 'New Permission', href: permissions.create(), icon: Plus }
                : null,
        );
    }

    if (userMgmtChildren.length > 0) {
        items.push({
            title: 'User Management',
            href: '#',
            icon: UserCog,
            children: userMgmtChildren.filter(Boolean) as NavItem[],
        });
    }

    // --- Settings --------------------------------------------------
    if (user?.permissions?.includes('settings.view')) {
        items.push({
            title: 'Settings',
            href: '#',
            icon: SlidersHorizontal,
            children: [
                {
                    title: 'Profile',
                    href: '/settings/profile',
                    icon: UserCog,
                },
                user?.permissions?.includes('settings.edit')
                    ? {
                          title: 'Preferences',
                          href: '/settings/preferences',
                          icon: SlidersHorizontal,
                      }
                    : null,
            ].filter(Boolean) as NavItem[],
        });
    }

    return items;
}

export function AppSidebar() {
    const { auth } = usePage().props;
    const user = auth?.user;
    const allNavItems = buildNavItems(user);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={allNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={[]} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
