'use client';

import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout, toggleSidebar } from '@/store/slices/authSlice';
import { adminNav, mainNav, roleBadgeColor } from '@/lib/constants';
import { logoutAction } from '../auth/authServices';
import { toast } from 'sonner';
import { usePathname, useRouter } from 'next/navigation';

export function AppSidebar() {

    const dispatch = useAppDispatch();
    const router = useRouter();
    const pathName = usePathname();
    const user = useAppSelector(state => state.auth.user)
    const role = useAppSelector(state => state.auth.role)
    const sidebarCollapsed = useAppSelector(state => state.auth.sidebarCollapsed);
    const isAdmin = role === 'Admin';

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
        const { data, errors } = await logoutAction();
        if (errors || !data) {
            toast.error(errors?.[0].message || 'Logout failed', {
                duration: 5000,
                position: 'bottom-right',
                className: '!bg-destructive !text-white !border-destructive',
            });
            return;
        }
        dispatch(logout());
        router.push('/');
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
                    <div className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center')}>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary uppercase">
                            {user.name.charAt(0)}
                        </div>
                        {!sidebarCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="truncate text-sm font-medium">{user.name}</p>
                                <span className={cn('inline-block rounded-pill px-1.5 py-0.5 text-[10px] font-semibold uppercase', roleBadgeColor[user.role])}>
                                    {user.role}
                                </span>
                            </div>
                        )}
                        {!sidebarCollapsed && (
                            <div className="flex gap-1">
                                {/* <Link href="/settings" className="rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors" aria-label="Settings">
                                    <Settings className="h-4 w-4" />
                                </Link> */}
                                <button onClick={handleLogout} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer" aria-label="Log out">
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
}