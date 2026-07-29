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
    Building2,
    Boxes,
    ClipboardList,
    Wrench,
    ShieldAlert,
    Trash2,
    Wallet,
    ClipboardCheck,
    BarChart3,
    Calendar,
    FolderLock,
    Network,
    Tags,
    Package,
    FileLock,
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
import * as departments from '@/routes/departments';
import { usePage } from '@inertiajs/react';
import type { NavItem } from '@/types';

/**
 * Build the sidebar's nav tree from the authenticated user's
 * permissions. Each top-level item is shown when the user has the
 * relevant `.view` permission; its children appear when the user has
 * the corresponding verb (`.view`, `.create`, `.edit`, `.delete`,
 * `.manage`, `.approve`, etc.).
 *
 * Mirrors the ISO 55000 permission catalog from
 * `database/seeders/PermissionSeeder.php`. Modules without a
 * backing controller yet still surface a "coming soon" child so
 * the navigation layout matches the eventual feature set.
 */
function buildNavItems(user: { permissions?: string[] } | null | undefined): NavItem[] {
    const has = (perm: string) =>
        user?.permissions?.includes(perm) ?? false;
    const items: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
    ];

    // --- Asset Register (FR-01 / FR-04 / FR-05) --------------------
    if (
        has('assets.view') ||
        has('asset-classifications.view') ||
        has('asset-locations.view') ||
        has('asset-categories.view')
    ) {
        const assetChildren: NavItem[] = [];
        if (has('assets.view')) {
            assetChildren.push({ title: 'All Assets', href: '#', icon: Boxes });
        }
        if (has('asset-classifications.view')) {
            assetChildren.push({ title: 'Classifications', href: '#', icon: Network });
        }
        if (has('asset-locations.view')) {
            assetChildren.push({ title: 'Locations', href: '#', icon: Tags });
        }
        if (has('asset-categories.view')) {
            assetChildren.push({ title: 'Categories', href: '#', icon: Tags });
        }

        items.push({
            title: 'Asset Register',
            href: '#',
            icon: Boxes,
            children: assetChildren,
        });
    }

    // --- Acquisitions & Disposal (FR-02 / FR-08 / FR-09) -----------
    if (
        has('acquisitions.view') ||
        has('disposal.view')
    ) {
        const children: NavItem[] = [];
        if (has('acquisitions.view')) {
            children.push({ title: 'Acquisitions', href: '#', icon: Package });
        }
        if (has('disposal.view')) {
            children.push({ title: 'Disposals', href: '#', icon: Trash2 });
        }

        items.push({
            title: 'Lifecycle',
            href: '#',
            icon: ClipboardList,
            children: children,
        });
    }

    // --- Maintenance (FR-06 / FR-07) -------------------------------
    if (
        has('work-orders.view') ||
        has('scheduled-maintenance.view') ||
        has('stock.view')
    ) {
        const children: NavItem[] = [];
        if (has('work-orders.view')) {
            children.push({ title: 'Work Orders', href: '#', icon: Wrench });
        }
        if (has('scheduled-maintenance.view')) {
            children.push({ title: 'Schedules', href: '#', icon: Calendar });
        }
        if (has('stock.view')) {
            children.push({ title: 'Stock', href: '#', icon: Package });
        }

        items.push({
            title: 'Maintenance',
            href: '#',
            icon: Wrench,
            children: children,
        });
    }

    // --- Audit, Risk & Compliance (FR-10) -------------------------
    if (
        has('audit.view') ||
        has('risk.view') || // reserved for future FR-12 expansion
        has('events.view')
    ) {
        const children: NavItem[] = [];
        if (has('audit.view')) {
            children.push({ title: 'Audits', href: '#', icon: ClipboardCheck });
        }
        if (has('events.view')) {
            children.push({ title: 'Events', href: '#', icon: Calendar });
        }

        items.push({
            title: 'Audit & Risk',
            href: '#',
            icon: ShieldAlert,
            children: children,
        });
    }

    // --- Finance & Analytics ---------------------------------------
    if (has('finance.view') || has('analytics.view')) {
        const children: NavItem[] = [];
        if (has('finance.view')) {
            children.push({ title: 'Finance', href: '#', icon: Wallet });
        }
        if (has('analytics.view')) {
            children.push({ title: 'Analytics', href: '#', icon: BarChart3 });
        }

        items.push({
            title: 'Finance & Analytics',
            href: '#',
            icon: Wallet,
            children: children,
        });
    }

    // --- Departments (ISO 55000 §6.2 organizational context) --------
    if (
        has('departments.view') ||
        has('departments.create')
    ) {
        items.push({
            title: 'Departments',
            href: '#',
            icon: Building2,
            children: [
                has('departments.view') && {
                    title: 'All Departments',
                    href: departments.index(),
                    icon: ListChecks,
                },
                has('departments.create') && {
                    title: 'New Department',
                    href: departments.create(),
                    icon: Plus,
                },
            ].filter(Boolean) as NavItem[],
        });
    }

    // --- Employees (HR records) ------------------------------------
    if (
        has('employees.view') ||
        has('employees.create')
    ) {
        items.push({
            title: 'Employees',
            href: '#',
            icon: Users,
            children: [
                has('employees.view') && {
                    title: 'All Employees',
                    href: employees.index(),
                    icon: ListChecks,
                },
                has('employees.create') && {
                    title: 'New Employee',
                    href: employees.create(),
                    icon: Plus,
                },
            ].filter(Boolean) as NavItem[],
        });
    }

    // --- User Management (Users + Roles + Permissions + RBAC view) -
    const userMgmtChildren: NavItem[] = [];

    if (has('users.view')) {
        userMgmtChildren.push(
            { title: 'All Users', href: users.index(), icon: Users },
            has('users.create')
                ? { title: 'New User', href: users.create(), icon: Plus }
                : null,
        );
    }
    if (has('roles.view')) {
        userMgmtChildren.push(
            { title: 'All Roles', href: roles.index(), icon: ShieldCheck },
            has('roles.create')
                ? { title: 'New Role', href: roles.create(), icon: Plus }
                : null,
        );
    }
    if (has('permissions.view')) {
        userMgmtChildren.push(
            { title: 'All Permissions', href: permissions.index(), icon: Key },
            has('permissions.create')
                ? { title: 'New Permission', href: permissions.create(), icon: Plus }
                : null,
        );
    }

    // Combined RBAC overview — visible to anyone with edit access to
    // roles or permissions, since it is the auditor's primary entry point.
    if (has('roles.edit') || has('permissions.edit')) {
        userMgmtChildren.push({
            title: 'RBAC Overview',
            href: '/rbac',
            icon: ShieldCheck,
        });
    }
    if (has('admin-files.view')) {
        userMgmtChildren.push({
            title: 'Admin Files',
            href: '#',
            icon: FileLock,
        });
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
    if (has('settings.view')) {
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
                has('settings.edit')
                    ? {
                          title: 'Preferences',
                          href: '/settings/preferences',
                          icon: SlidersHorizontal,
                      }
                    : null,
            ].filter(Boolean) as NavItem[],
        });
    }

    // Touch `folders` so unused-import warnings stay quiet even
    // before the Admin Files module is wired to a controller.
    void FolderLock;

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
