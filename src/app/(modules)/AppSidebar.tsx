'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { adminNav, mainNav } from '@/lib/constants';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarTrigger,
} from '@/components/ui/sidebar';

export function AppSidebar() {
    const pathName = usePathname();
    const role = useAppSelector((state) => state.auth.role);
    const isAdmin = role === 'ADMIN';

    const isActive = (to: string) =>
        pathName === to || (to !== '/' && pathName.startsWith(to + '/'));

    return (
        <Sidebar collapsible="icon" data-tour="sidebar">
            <SidebarHeader className="flex-row items-center justify-between">
                <Link
                    href="/search"
                    className="flex min-w-0 items-center gap-2 px-2 pt-2 text-lg font-bold tracking-tight group-data-[collapsible=icon]:hidden"
                >
                    <Image src="/brand/logomark.svg" alt="" width={34} height={29} />
                    <span className="text-[#1E1E1E] truncate">VendorLens</span>
                </Link>
                <SidebarTrigger />
            </SidebarHeader>

            <SidebarContent>
                {/* Figma's sidebar (fileKey nPLWw73lkfNSi2MZX2bIsU, node
                    2:15818) has no header above the main nav items — only
                    the admin section below gets a label ("Admin Actions"). */}
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {/* Admins raise no update requests of their own — they edit
                                records directly and review everyone else's under Admin. */}
                            {mainNav
                                .filter((item) => !(isAdmin && item.to === '/my-requests'))
                                .map((item) => (
                                    <SidebarMenuItem key={item.to}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive(item.to)}
                                            tooltip={item.label}
                                        >
                                            <Link href={item.to}>
                                                <item.icon />
                                                <span>{item.label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {isAdmin && (
                    <SidebarGroup>
                        <SidebarGroupLabel>Admin Actions</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {adminNav.map((item) => (
                                    <SidebarMenuItem key={item.to}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive(item.to)}
                                            tooltip={item.label}
                                        >
                                            <Link href={item.to}>
                                                <item.icon />
                                                <span>{item.label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>
        </Sidebar>
    );
}
