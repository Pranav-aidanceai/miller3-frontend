'use client';

import { ChevronLeft, ChevronRight, LogOut, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout, toggleSidebar } from '@/store/slices/authSlice';
import { adminNav, mainNav, roleBadgeColor } from '@/lib/constants';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';

export function AppSidebar() {

    const dispatch = useAppDispatch();
    const router = useRouter();
    const pathName = usePathname();
    const user = useAppSelector(state => state.auth.user)
    const role = useAppSelector(state => state.auth.role)
    const sidebarCollapsed = useAppSelector(state => state.auth.sidebarCollapsed);
    const isAdmin = role === 'ADMIN';

    const [profileOpen, setProfileOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const openProfile = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        setProfileOpen(true);
    };
    const closeProfile = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setProfileOpen(false), 120);
    };

    const NavItem = ({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) => {
        const active = pathName === to || (to !== '/' && pathName.startsWith(to + '/'));
        return (
            <Link
                href={to}
                className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                title={sidebarCollapsed ? label : undefined}
            >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>{label}</span>}
            </Link>
        );
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await axios.post('/api/auth/logout');
            dispatch(logout());
            router.push('/');
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
            setShowLogoutModal(false);
        }
    };

    return (
        <aside
            data-tour="sidebar"
            className={cn(
                'flex h-full flex-col border-r border-border bg-card transition-all duration-200',
                sidebarCollapsed ? 'w-16' : 'w-60'
            )}
        >
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
                {!sidebarCollapsed && (
                    <span className="text-lg font-bold tracking-tight">
                        <span className="text-gradient">Miller3</span>
                    </span>
                )}
                <button
                    onClick={() => dispatch(toggleSidebar())}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                    aria-label="Toggle sidebar"
                >
                    {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-auto p-3">
                {!sidebarCollapsed && (
                    <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Main</p>
                )}
                {mainNav.map(item => <NavItem key={item.to} {...item} />)}

                {isAdmin && (
                    <>
                        <div className="my-3 border-t border-border" />
                        {!sidebarCollapsed && (
                            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</p>
                        )}
                        {adminNav.map(item => <NavItem key={item.to} {...item} />)}
                    </>
                )}
            </nav>

            <div className="border-t border-border p-3">
                {user && (
                    sidebarCollapsed ? (
                        <Popover open={profileOpen} onOpenChange={setProfileOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    onMouseEnter={openProfile}
                                    onMouseLeave={closeProfile}
                                    className="mx-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary uppercase cursor-pointer"
                                    aria-label="Profile"
                                >
                                    {user.name.charAt(0)}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                side="right"
                                align="end"
                                sideOffset={12}
                                onOpenAutoFocus={(e) => e.preventDefault()}
                                onMouseEnter={openProfile}
                                onMouseLeave={closeProfile}
                                className="w-56 gap-0 p-0"
                            >
                                <div className="flex items-center gap-3 p-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary uppercase">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{user.name}</p>
                                        <span className={cn('mt-0.5 inline-block rounded-pill px-1.5 py-0.5 text-[10px] font-semibold uppercase', roleBadgeColor[user.role])}>
                                            {user.role}
                                        </span>
                                    </div>
                                </div>
                                <div className="border-t border-border p-1">
                                    <button
                                        type="button"
                                        onClick={() => { setProfileOpen(false); setShowLogoutModal(true); }}
                                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-destructive transition-colors cursor-pointer"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Sign out
                                    </button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary uppercase">
                                {user.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="truncate text-sm font-medium">{user.name}</p>
                                <span className={cn('inline-block rounded-pill px-1.5 py-0.5 text-[10px] font-semibold uppercase', roleBadgeColor[user.role])}>
                                    {user.role}
                                </span>
                            </div>
                            <div className="flex gap-1">
                                {/* <Link href="/settings" className="rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors" aria-label="Settings">
                                    <Settings className="h-4 w-4" />
                                </Link> */}
                                <button onClick={() => setShowLogoutModal(true)} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer" aria-label="Log out">
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )
                )}
            </div>

            {showLogoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-sm rounded-2xl border border-border/50 bg-background p-6 shadow-2xl">
                        <div className="mb-6 flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                                <LogOut className="h-5 w-5 text-destructive" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Sign out</h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Are you sure you want to log out of your account?
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                disabled={isLoggingOut}
                                className="h-10 min-w-24 rounded-lg border border-border px-4 text-sm font-medium transition-colors cursor-pointer hover:bg-accent disabled:opacity-50"
                            >
                                No
                            </button>
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="flex h-10 min-w-24 items-center justify-center gap-2 rounded-lg bg-destructive px-4 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoggingOut ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Logging out...
                                    </>
                                ) : (
                                    'Yes'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}