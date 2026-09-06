'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { Check, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorMessage } from '@/lib/apiError';
import UserDetailModal from './UserDetailModal';
import { BsSliders } from "react-icons/bs";

interface AdminUser {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: 'free' | 'standard' | 'premium' | 'admin';
    searches_today: {
        ai: number;
        structured: number;
        total: number;
    };
    status: string
    exports_this_month: number;
    last_active: string | null;
}

interface UsersResponse {
    users: AdminUser[];
    total: number;
    page: number;
}

const LIMIT = 25;

const ROLES = ['free', 'standard', 'premium', 'admin'] as const;
type Role = typeof ROLES[number];

const STATUSES = ['active', 'inactive', 'pending', 'rejected'] as const;
type Status = typeof STATUSES[number];

// Copy matches the Figma "User Management" reference exactly (fileKey
// pskj0D4uvWBsvAB5Csxyt4): "Pending" not "Pending Approval", "Deactivated"
// not "Inactive".
const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    inactive: 'Deactivated',
    pending: 'Pending',
    rejected: 'Rejected',
};

// Free = neutral gray, Standard = soft blue, Premium = solid dark-teal pill —
// colors lifted directly from the Figma table. Admin has no Figma sample; it
// keeps the app's existing destructive/red treatment for a privileged role.
const roleBadge: Record<string, string> = {
    admin: 'bg-destructive/10 text-destructive',
    premium: 'bg-primary text-primary-foreground',
    standard: 'bg-[#E7F0FF] text-[#1D69FF]',
    free: 'bg-[#D6D6D6] text-[#5A5A5A]',
};

const statusBadge: Record<string, string> = {
    active: 'bg-success/10 text-success',
    inactive: 'bg-destructive/10 text-destructive',
    pending: 'bg-warning/10 text-warning',
    rejected: 'bg-destructive/10 text-destructive',
};

export default function UsersView() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [roleFilter, setRoleFilter] = useState<Role | null>(null);
    const [statusFilter, setStatusFilter] = useState<Status | null>(null);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search.trim(), 400);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [rolePopoverOpen, setRolePopoverOpen] = useState(false);
    const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);


    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, string | number> = { page, LIMIT };
            if (roleFilter) params.role = roleFilter;
            if (statusFilter) params.status = statusFilter;
            if (debouncedSearch) params.username = debouncedSearch;
            const res = await apiClient.get('/admin/users', { params });
            const payload: UsersResponse = res.data.data;
            setUsers(payload.users ?? []);
            setTotal(payload.total ?? 0);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to load users'));
        } finally {
            setLoading(false);
        }
    }, [page, roleFilter, statusFilter, debouncedSearch]);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const params: Record<string, string | number> = { page, LIMIT };
                if (roleFilter) params.role = roleFilter;
                if (statusFilter) params.status = statusFilter;
                if (debouncedSearch) params.username = debouncedSearch;
                const res = await apiClient.get('/admin/users', { params });
                if (!active) return;
                const payload: UsersResponse = res.data.data;
                setUsers(payload.users ?? []);
                setTotal(payload.total ?? 0);
            } catch (err: unknown) {
                if (!active) return;
                setError(getErrorMessage(err, 'Failed to load users'));
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [page, roleFilter, statusFilter, debouncedSearch]);

    // The table body scrolls on its own, so a new page or filter would otherwise
    // open wherever the previous list was left — usually at the bottom.
    const tableScrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        tableScrollRef.current?.scrollTo({ top: 0 });
    }, [page, roleFilter, statusFilter, debouncedSearch]);

    const [prevSearch, setPrevSearch] = useState(debouncedSearch);
    if (debouncedSearch !== prevSearch) {
        setPrevSearch(debouncedSearch);
        setPage(1);
    }

    const toggleRole = (role: Role) => {
        setPage(1);
        setRoleFilter(prev => (prev === role ? null : role));
        setRolePopoverOpen(false);
    };

    const toggleStatus = (status: Status) => {
        setPage(1);
        setStatusFilter(prev => (prev === status ? null : status));
        setStatusPopoverOpen(false);
    };

    return (
        <div className="h-full max-h-screen overflow-auto">
            <div className='py-3 px-4 border-b'>
                <div className="flex items-center justify-between">
                    <h1 className="font-heading text-2xl font-bold">User Management</h1>
                    <button
                        type="button"
                        onClick={fetchUsers}
                        disabled={loading}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                        Refresh
                    </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 font-light">
                    <div className="relative w-full max-w-xs">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by user name or email"
                            className="h-10 w-full rounded-xl border border-input bg-white pl-3 pr-9 text-sm font-light outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background"
                        />
                        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>

                    {/* Role filter */}
                    <Popover open={rolePopoverOpen} onOpenChange={setRolePopoverOpen}>
                        <PopoverTrigger asChild>
                            <button
                                className={cn(
                                    'flex items-center gap-1.5 h-9 rounded-xl border px-3.5 text-sm cursor-pointer transition-colors',
                                    roleFilter
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-[#CFCFCF] bg-white hover:bg-accent'
                                )}
                            >
                                <BsSliders className="h-3.5 w-3.5" />
                                {roleFilter ? <span className="capitalize">{roleFilter}</span> : 'Roles'}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-1" align="start">
                            {ROLES.map(role => (
                                <button
                                    key={role}
                                    onClick={() => toggleRole(role)}
                                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm capitalize hover:bg-accent cursor-pointer"
                                >
                                    {role}
                                    {roleFilter === role && <Check className="h-4 w-4 text-primary" />}
                                </button>
                            ))}
                            {roleFilter && (
                                <button
                                    onClick={() => { setRoleFilter(null); setPage(1); setRolePopoverOpen(false); }}
                                    className="mt-1 w-full rounded-md border-t border-border px-2 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                    Clear
                                </button>
                            )}
                        </PopoverContent>
                    </Popover>

                    {/* Status filter */}
                    <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
                        <PopoverTrigger asChild>
                            <button
                                className={cn(
                                    'flex items-center gap-1.5 h-9 rounded-xl border px-3.5 text-sm cursor-pointer transition-colors',
                                    statusFilter
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-[#CFCFCF] bg-white hover:bg-accent'
                                )}
                            >
                                <BsSliders className="h-3.5 w-3.5" />
                                {statusFilter ? <span>{STATUS_LABELS[statusFilter]}</span> : 'Status'}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-1" align="start">
                            {STATUSES.map(status => (
                                <button
                                    key={status}
                                    onClick={() => toggleStatus(status)}
                                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                                >
                                    {STATUS_LABELS[status]}
                                    {statusFilter === status && <Check className="h-4 w-4 text-primary" />}
                                </button>
                            ))}
                            {statusFilter && (
                                <button
                                    onClick={() => { setStatusFilter(null); setPage(1); setStatusPopoverOpen(false); }}
                                    className="mt-1 w-full rounded-md border-t border-border px-2 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                    Clear
                                </button>
                            )}
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {error && (
                <div className="mt-6 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {!error && (
                <>
                    <div className="flex items-center justify-between py-3 px-4 border-b">
                        <span className="text-xs text-[#B3B3B3] font-normal">
                            {loading ? 'Loading…' : `Showing ${users.length} of ${total.toLocaleString()} Users`}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={page === 1 || loading}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                aria-label="Previous page"
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-border disabled:opacity-40 hover:bg-accent cursor-pointer"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                disabled={page >= totalPages || loading}
                                onClick={() => setPage(p => p + 1)}
                                aria-label="Next page"
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-border disabled:opacity-40 hover:bg-accent cursor-pointer"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-hidden">
                        <div ref={tableScrollRef} className="overflow-y-auto max-h-[62vh]">
                            <table className="w-full text-sm border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-white">
                                        <th className="px-4 py-2 text-left font-medium text-muted-foreground border-collapse border-b border-r">User</th>
                                        <th className="px-4 py-2 text-left font-medium text-muted-foreground border-collapse border-b border-r">Mail ID</th>
                                        <th className="px-4 py-2 text-left font-medium text-muted-foreground border-collapse border-b border-r">Role</th>
                                        <th className="px-4 py-2 text-right font-medium text-muted-foreground border-collapse border-b border-r">Searches (Today)</th>
                                        <th className="px-4 py-2 text-right font-medium text-muted-foreground border-collapse border-b border-r">Exports (Monthly)</th>
                                        <th className="px-4 py-2 text-left font-medium text-muted-foreground border-collapse border-b border-r">Onboarding Status</th>
                                        <th className="px-4 py-2 text-left font-medium text-muted-foreground border-collapse border-b">Last Active</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        Array.from({ length: 9 }).map((_, i) => (
                                            <tr key={i} className="border-b border-border">
                                                <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-muted animate-pulse" /></td>
                                                <td className="px-4 py-3"><div className="h-4 w-32 rounded bg-muted animate-pulse" /></td>
                                                <td className="px-4 py-3"><div className="h-5 w-16 rounded-pill bg-muted animate-pulse" /></td>
                                                <td className="px-4 py-3"><div className="ml-auto h-4 w-8 rounded bg-muted animate-pulse" /></td>
                                                <td className="px-4 py-3"><div className="ml-auto h-4 w-8 rounded bg-muted animate-pulse" /></td>
                                                <td className="px-4 py-3"><div className="h-5 w-20 rounded-pill bg-muted animate-pulse" /></td>
                                                <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-muted animate-pulse" /></td>
                                            </tr>
                                        ))
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-16 text-center text-muted-foreground">
                                                <p className="text-lg font-medium">No users found</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map(u => (
                                            <tr key={u.id} onClick={() => setSelectedUserId(u.id)} className="cursor-pointer hover:bg-accent/50 transition-colors">
                                                <td className="px-4 py-3 border-collapse border-b border-r">
                                                    <span className="font-medium text-primary underline underline-offset-2">{u.name}</span>
                                                </td>
                                                <td className="px-4 py-3 border-collapse border text-muted-foreground">{u.email}</td>
                                                <td className="px-4 py-3 border-collapse border"><span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', roleBadge[u.role])}>{u.role}</span></td>
                                                <td className="px-4 py-3 border-collapse border text-right">{u.searches_today.total}</td>
                                                <td className="px-4 py-3 border-collapse border text-right">{u.exports_this_month}</td>
                                                <td className="px-4 py-3 border-collapse border"><span className={cn('rounded-pill px-2 py-0.5 text-xs font-medium', statusBadge[u.status] ?? 'bg-muted text-muted-foreground')}>{STATUS_LABELS[u.status] ?? u.status}</span></td>
                                                <td className="px-4 py-3 border-collapse border-b text-xs text-muted-foreground">{u.last_active ? new Date(u.last_active).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {selectedUserId && (
                <UserDetailModal
                    userId={selectedUserId}
                    status={users.find(u => u.id === selectedUserId)?.status}
                    onClose={() => setSelectedUserId(null)}
                    onUpdated={fetchUsers}
                />
            )}
        </div>
    );
}
