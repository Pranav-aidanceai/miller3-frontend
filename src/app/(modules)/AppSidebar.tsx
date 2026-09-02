'use client';

import { LogOut } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import axios from 'axios';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { clearSearchState } from '@/lib/session';
import { adminNav, mainNav, roleBadgeColor } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function AppSidebar() {
    const dispatch = useAppDispatch();
    const pathName = usePathname();
    const user = useAppSelector((state) => state.auth.user);
    const role = useAppSelector((state) => state.auth.role);
    const isAdmin = role === 'ADMIN';

    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const isActive = (to: string) =>
        pathName === to || (to !== '/' && pathName.startsWith(to + '/'));

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await apiClient.post('/auth/logout');
            clearSearchState();
            dispatch(logout());
            window.location.replace('/');
        } catch (error) {
            const message = axios.isAxiosError(error)
                ? error.response?.data?.errors?.[0]?.message
                : null;
            toast.error(message || 'Logout failed', {
                duration: 5000,
                position: 'bottom-right',
                className: '!bg-destructive !text-white !border-destructive',
            });
            setIsLoggingOut(false);
            setShowLogoutDialog(false);
        }
    };

    return (
        <>
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
                    <SidebarGroup>
                        <SidebarGroupLabel>Main</SidebarGroupLabel>
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
                            <SidebarGroupLabel>Admin</SidebarGroupLabel>
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

                <SidebarFooter>
                    {user && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent"
                                >
                                    <Avatar className="h-7 w-7 rounded-full">
                                        <AvatarFallback className="rounded-full bg-primary/10 text-primary uppercase">
                                            {user.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex min-w-0 flex-1 flex-col text-left leading-tight">
                                        <span className="truncate text-sm font-medium">{user.name}</span>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                'w-fit border-0 px-1.5 py-0 text-[10px] font-semibold uppercase',
                                                roleBadgeColor[user.role]
                                            )}
                                        >
                                            {user.role}
                                        </Badge>
                                    </div>
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="top" align="start" className="w-56">
                                <DropdownMenuLabel className="font-normal">
                                    <p className="truncate text-sm font-medium">{user.name}</p>
                                    <p className="truncate text-xs font-normal text-muted-foreground">
                                        {user.email}
                                    </p>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() => setShowLogoutDialog(true)}
                                >
                                    <LogOut />
                                    Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </SidebarFooter>
            </Sidebar>

            <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sign out</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to log out of your account?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoggingOut}>No</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleLogout();
                            }}
                            disabled={isLoggingOut}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            {isLoggingOut ? 'Logging out...' : 'Yes'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
