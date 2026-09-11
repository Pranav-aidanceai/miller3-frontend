'use client';

import { Command, Sparkles, Zap, Download, X, Infinity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import axios from 'axios';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import {
    clearSearchState,
    dismissLowCreditsBanner,
    isLowCreditsBannerDismissed,
} from '@/lib/session';
import { accountMenu, type AccountMenuKey } from '@/lib/constants';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

// Export is billed per block of companies rather than per company; the block
// size is fixed by the backend's pricing, not configurable per environment.
const EXPORT_BLOCK_SIZE = 50;

/** What each action costs, for the breakdown shown on hovering the bar. */
const CREDIT_COSTS = [
    {
        icon: Sparkles,
        label: 'AI Search',
        cost: Number(process.env.NEXT_PUBLIC_AI_SEARCH_CREDIT_DEDUCTION) || 5,
        per: 'search',
    },
    {
        icon: Zap,
        label: 'Enrichment',
        cost: Number(process.env.NEXT_PUBLIC_ENRICHMENT_CREDIT_DEDUCTION) || 3,
        per: 'company',
    },
    {
        icon: Download,
        label: 'Export',
        cost: Number(process.env.NEXT_PUBLIC_EXPORT_CREDIT_DEDUCTION) || 1,
        per: `${EXPORT_BLOCK_SIZE} companies`,
    },
];

/**
 * How much of the balance is left, as the pill's three colour bands. Shared by
 * the pill and the low-balance banner so the two can never disagree about what
 * counts as running low. `limit < 0` means unlimited (admin).
 */
function creditHealth(remaining: number, limit: number): 'unlimited' | 'ok' | 'warn' | 'low' {
    if (limit < 0) return 'unlimited';
    const pct = limit > 0 ? Math.min((remaining / limit) * 100, 100) : 0;
    return pct > 60 ? 'ok' : pct > 30 ? 'warn' : 'low';
}

// Single unified balance shared by AI search, enrichment and export, drawn as
// a "<remaining>/<limit> Credits" pill whose outline carries the health colour.
// Unlimited accounts get a green infinity symbol, since there is no ratio to
// render.
function CreditBar({ remaining, limit }: { remaining: number; limit: number }) {
    const health = creditHealth(remaining, limit);
    const unlimited = health === 'unlimited';

    const borderColor = health === 'low' ? 'border-red-500' : health === 'warn' ? 'border-yellow-400' : 'border-green-500';

    return (
        <div className={`group relative flex h-9 cursor-default select-none items-center gap-2 rounded-full border-2 ${borderColor} bg-background px-4 transition-colors`}>
            <span className="text-sm font-medium tabular-nums text-foreground">
                {unlimited ? <Infinity size={16} /> : `${remaining}/${limit}`}
            </span>
            <span className="text-sm text-muted-foreground">Credits</span>

            {/* Cost breakdown, on hover. Purely informational, so it never takes
                the pointer — that also keeps it from flickering at the edges. */}
            <div
                role="tooltip"
                className="pointer-events-none invisible absolute right-0 top-full z-50 mt-2 w-60 rounded-lg border border-border bg-popover p-3 text-popover-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100"
            >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Credit usage
                </p>
                <ul className="mt-2 space-y-2">
                    {CREDIT_COSTS.map(({ icon: Icon, label, cost, per }) => (
                        <li key={label} className="flex items-start gap-2">
                            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                                <p className="text-xs font-medium leading-tight">{label}</p>
                                <p className="text-[11px] leading-tight text-muted-foreground">
                                    {cost} {cost === 1 ? 'credit' : 'credits'} per {per}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
                {unlimited && (
                    <p className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
                        Your account has unlimited credits.
                    </p>
                )}
            </div>
        </div>
    );
}

/**
 * Full-width nudge under the header, shown while the balance sits in the pill's
 * red band. Closing it silences it for the rest of the sign-in only — a fresh
 * login clears the flag (see LoginForm), so a low balance is surfaced again.
 */
function LowCreditsBanner({
    name,
    remaining,
    limit,
    onBuy,
    onDismiss,
}: {
    name: string;
    remaining: number;
    limit: number;
    onBuy: () => void;
    onDismiss: () => void;
}) {
    return (
        <div className="relative flex shrink-0 items-center justify-center gap-4 bg-primary m-3 rounded-xl px-12 py-2.5 text-primary-foreground text-heading">
            <p className="text-sm font-light">
                Hi, {name} <span className="font-semibold tabular-nums">{remaining}/{limit}</span>{' '}
                credits left. Don&apos;t have enough credits?
            </p>
            <button
                onClick={onBuy}
                className="shrink-0 rounded-md bg-background px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-background/90 cursor-pointer"
            >
                Buy Credits
            </button>
            <button
                onClick={onDismiss}
                aria-label="Dismiss low credit notice"
                className="absolute right-4 flex size-5 items-center justify-center rounded-full bg-primary-foreground text-primary transition-opacity hover:opacity-80 cursor-pointer"
            >
                <X className="size-3.5" strokeWidth={2.5} />
            </button>
        </div>
    );
}

export function TopBar() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const credits_left = useAppSelector(state => state.auth.credits_left);
    const user = useAppSelector(state => state.auth.user);
    const role = useAppSelector(state => state.auth.role);

    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // True only after client-side hydration, without a cascading effect render
    // (same pattern as ModuleShell). Gates the sessionStorage read below, which
    // has no server-side answer.
    const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
    // Re-renders on dismiss; sessionStorage is what survives a route change.
    const [dismissedNow, setDismissedNow] = useState(false);

    const remaining = credits_left?.total ?? 0;
    const limit = credits_left?.limit ?? 0;
    const showCreditsBanner =
        mounted &&
        !!user &&
        !dismissedNow &&
        !isLowCreditsBannerDismissed() &&
        creditHealth(remaining, limit) === 'low';

    const dismissCreditsBanner = () => {
        dismissLowCreditsBanner();
        setDismissedNow(true);
    };

    // Admin accounts are neither billed against a plan nor metered on credits,
    // so the two billing entries have nothing to show them.
    const menuItems = role === 'ADMIN'
        ? accountMenu.filter(item => item.key !== 'plan' && item.key !== 'buy-credits')
        : accountMenu;

    // Handlers for the `accountMenu` entries that have no route of their own.
    const openDialog: Partial<Record<AccountMenuKey, () => void>> = {
        logout: () => setShowLogoutDialog(true),
    };

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
            <header className="flex h-14 items-center justify-between border-b border-border bg-[#F9F9F9] px-4 md:px-6">
                <div className="flex items-center gap-4">
                    {/* The desktop trigger lives in AppSidebar's own header; on
                        mobile the sidebar renders as an off-canvas sheet, so it
                        needs a trigger here instead. */}
                    <SidebarTrigger className="md:hidden" />
                    <div className="hidden items-center gap-4 invisible md:flex">
                        <button
                            className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                        >
                            <Command className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Search...</span>
                            <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] font-mono sm:inline">⌘K</kbd>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div data-tour="credits" className="flex items-center gap-2">
                        <CreditBar remaining={remaining} limit={limit} />
                    </div>

                    {/* Notifications */}
                    {/* <button className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Notifications">
                        <Bell className="h-4 w-4" />
                    </button> */}

                    {/* Account menu — replaces the profile block that used to sit
                        in the sidebar footer, so the sidebar is nav only now. */}
                    {user && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    data-tour="account-menu"
                                    aria-label="Account menu"
                                    className="rounded-full ring-offset-background transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=open]:ring-2 data-[state=open]:ring-primary/40"
                                >
                                    <Avatar className="h-9 w-9 rounded-full ring-1 ring-border cursor-pointer">
                                        <AvatarFallback className="rounded-full bg-primary/10 text-sm font-medium uppercase text-primary">
                                            {user.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="bottom" align="end" className="w-40 mt-1 p-0">
                                {/* <DropdownMenuLabel className="font-normal">
                                    <p className="truncate text-sm font-medium">{user.name}</p>
                                    <p className="truncate text-xs font-normal text-muted-foreground">
                                        {user.email}
                                    </p>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            'mt-1.5 w-fit border-0 px-1.5 py-0 text-[10px] font-semibold uppercase',
                                            roleBadgeColor[user.role]
                                        )}
                                    >
                                        {user.role}
                                    </Badge>
                                </DropdownMenuLabel> */}
                                {menuItems.map(({ key, icon: Icon, label, ...item }) => (
                                    <DropdownMenuItem
                                        key={key}
                                        variant={'variant' in item ? item.variant : 'default'}
                                        onSelect={() =>
                                            'to' in item ? router.push(item.to) : openDialog[key]?.()
                                        }
                                        className='text-[#424242] font-heading text-xs font-normal cursor-pointer px-2 py-1.5 bg-[#F9F9F9] hover:bg-white'
                                    >
                                        <Icon />
                                        {label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </header>

            {showCreditsBanner && (
                <LowCreditsBanner
                    name={user.name.split(' ')[0]}
                    remaining={remaining}
                    limit={limit}
                    onBuy={() => router.push('/buy-credits')}
                    onDismiss={dismissCreditsBanner}
                />
            )}

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
