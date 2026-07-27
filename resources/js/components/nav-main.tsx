import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        {item.children ? (
                            <NavGroup item={item} isCurrentUrl={isCurrentUrl} />
                        ) : (
                            <SidebarMenuButton
                                asChild
                                isActive={isCurrentUrl(item.href)}
                                tooltip={{ children: item.title }}
                            >
                                <Link href={item.href} prefetch>
                                    {item.icon && <item.icon className="mr-3 h-4 w-4" />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        )}
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}

function NavGroup({
    item,
    isCurrentUrl,
}: {
    item: NavItem;
    isCurrentUrl: (href: NavItem['href']) => boolean;
}) {
    const children = item.children ?? [];

    // Open by default; persist via localStorage so user choice sticks.
    const [open, setOpen] = useState<boolean>(() => {
        if (typeof window === 'undefined') return true;
        const stored = window.localStorage.getItem(`nav-open:${item.title}`);
        return stored === null ? true : stored === '1';
    });

    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(`nav-open:${item.title}`, next ? '1' : '0');
        }
    };

    return (
        <Collapsible open={open} onOpenChange={handleOpenChange} className="group/collapsible">
            <CollapsibleTrigger asChild>
                <SidebarMenuButton
                    isActive={children.some((c) => isCurrentUrl(c.href))}
                    tooltip={{ children: item.title }}
                >
                    {item.icon && <item.icon className="mr-3 h-4 w-4" />}
                    <span className="flex-1 text-left">{item.title}</span>
                    <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <SidebarMenu className="pl-8">
                    {children.map((child) => (
                        <SidebarMenuItem key={child.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={isCurrentUrl(child.href)}
                                tooltip={{ children: child.title }}
                            >
                                <Link href={child.href} prefetch>
                                    {child.icon && <child.icon className="mr-2 h-4 w-4" />}
                                    <span>{child.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </CollapsibleContent>
        </Collapsible>
    );
}
