'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { ListFilter, ChevronDown, Check, Search, RefreshCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebounce } from '@/hooks/useDebounce';
import UserDetailModal from './UserDetailModal';

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

const ROLES = ['free', 'standard', 'premium', 'admin'] as const;
type Role = typeof ROLES[number];

const STATUSES = ['active', 'inactive', 'pending', 'rejected'] as const;
type Status = typeof STATUSES[number];

const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending Approval',
    rejected: 'Rejected',
};

const PRESET_LIMITS = [20, 50, 100] as const;

const roleBadge: Record<string, string> = {
    admin: 'bg-destructive/10 text-destructive',
    premium: 'bg-primary/10 text-primary',
    standard: 'bg-warning/10 text-warning',
    free: 'bg-muted text-muted-foreground',
};

const statusBadge: Record<string, string> = {
    active: 'bg-success/10 text-success',
    inactive: 'bg-muted text-muted-foreground',
    pending: 'bg-warning/10 text-warning',
    rejected: 'bg-destructive/10 text-destructive',
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [roleFilter, setRoleFilter] = useState<Role | null>(null);
    const [statusFilter, setStatusFilter] = useState<Status | null>(null);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search.trim(), 400);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const [rolePopoverOpen, setRolePopoverOpen] = useState(false);
    const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
    const [limitPopoverOpen, setLimitPopoverOpen] = useState(false);
    const [customMode, setCustomMode] = useState(false);
    const [customLimit, setCustomLimit] = useState('');

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, string | number> = { page, limit };
            if (roleFilter) params.role = roleFilter;
            if (statusFilter) params.status = statusFilter;
            if (debouncedSearch) params.username = debouncedSearch;
            const res = await axios.get('/api/admin/users', { params });
            const payload: UsersResponse = res.data.data;
            setUsers(payload.users ?? []);
            setTotal(payload.total ?? 0);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.error || 'Failed to load users');
            } else {
                setError('Failed to load users');
            }
        } finally {
            setLoading(false);
        }
    }, [page, limit, roleFilter, statusFilter, debouncedSearch]);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const params: Record<string, string | number> = { page, limit };
                if (roleFilter) params.role = roleFilter;
                if (statusFilter) params.status = statusFilter;
                if (debouncedSearch) params.username = debouncedSearch;
                const res = await axios.get('/api/admin/users', { params });
                if (!active) return;
                const payload: UsersResponse = res.data.data;
                setUsers(payload.users ?? []);
                setTotal(payload.total ?? 0);
            } catch (err: unknown) {
                if (!active) return;
                if (axios.isAxiosError(err)) {
                    setError(err.response?.data?.error || 'Failed to load users');
                } else {
                    setError('Failed to load users');
                }
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [page, limit, roleFilter, statusFilter, debouncedSearch]);

    // Reset to the first page whenever a new search term is applied. Adjusting
    // state during render (instead of in an effect) avoids a cascading re-render.
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

    const applyLimit = (value: number) => {
        setLimit(value);
        setPage(1);
        setCustomMode(false);
        setCustomLimit('');
        setLimitPopoverOpen(false);
    };

    const applyCustomLimit = () => {
        const value = parseInt(customLimit, 10);
        if (!value || value < 1) return;
        applyLimit(value);
    };

    return (
        <div className="px-6 pt-3 h-full max-h-screen overflow-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">User Management</h1>
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

            {/* Toolbar */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative w-full max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or email"
                        className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background"
                    />
                </div>

                {/* Role filter */}
                <Popover open={rolePopoverOpen} onOpenChange={setRolePopoverOpen}>
                    <PopoverTrigger asChild>
                        <button
                            className={cn(
                                'flex items-center gap-1.5 h-10 rounded-md border px-3 text-sm cursor-pointer transition-colors',
                                roleFilter
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-input bg-background hover:bg-accent'
                            )}
                        >
                            <ListFilter className="h-4 w-4" />
                            {roleFilter ? <span className="capitalize">{roleFilter}</span> : 'Role'}
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
                                'flex items-center gap-1.5 h-10 rounded-md border px-3 text-sm cursor-pointer transition-colors',
                                statusFilter
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-input bg-background hover:bg-accent'
                            )}
                        >
                            <ListFilter className="h-4 w-4" />
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

            {error && (
                <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            {!error && (
                <div className="mt-6 rounded-lg border border-border overflow-hidden">
                    <div className="overflow-y-auto max-h-[60vh]">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10">
                            <tr className="border-b border-border bg-muted">
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Searches Today</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Exports (this month)</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Active</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 9 }).map((_, i) => (
                                    <tr key={i} className="border-b border-border">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                                                <div className="space-y-1.5">
                                                    <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
                                                    <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3"><div className="h-5 w-16 rounded-pill bg-muted animate-pulse" /></td>
                                        <td className="px-4 py-3"><div className="ml-auto h-4 w-8 rounded bg-muted animate-pulse" /></td>
                                        <td className="px-4 py-3"><div className="ml-auto h-4 w-8 rounded bg-muted animate-pulse" /></td>
                                        <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-muted animate-pulse" /></td>
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-16 text-center text-muted-foreground">
                                        <p className="text-lg font-medium">No users found</p>
                                    </td>
                                </tr>
                            ) : (
                                users.map(u => (
                                    <tr key={u.id} onClick={() => setSelectedUserId(u.id)} className="border-b border-border cursor-pointer hover:bg-accent/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{u.avatar || u.name.charAt(0)}</div>
                                                <div><p className="font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3"><span className={cn('rounded-pill px-2 py-0.5 text-xs font-medium capitalize', roleBadge[u.role])}>{u.role}</span></td>
                                        <td className="px-4 py-3 text-right">{u.searches_today.total}</td>
                                        <td className="px-4 py-3 text-right">{u.exports_this_month}</td>
                                        <td className="px-4 py-3"><span className={cn('rounded-pill px-2 py-0.5 text-xs font-medium', statusBadge[u.status] ?? 'bg-muted text-muted-foreground')}>{STATUS_LABELS[u.status] ?? u.status}</span></td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">{u.last_active ? new Date(u.last_active).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {!error && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        {/* Row limit */}
                        <Popover
                            open={limitPopoverOpen}
                            onOpenChange={(open) => {
                                setLimitPopoverOpen(open);
                                if (!open) { setCustomMode(false); setCustomLimit(''); }
                            }}
                        >
                            <PopoverTrigger asChild>
                                <button className="flex items-center gap-1.5 h-9 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent cursor-pointer">
                                    {limit}
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-1" align="start">
                                {PRESET_LIMITS.map(value => (
                                    <button
                                        key={value}
                                        onClick={() => applyLimit(value)}
                                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                                    >
                                        {value}
                                        {limit === value && !customMode && <Check className="h-4 w-4 text-primary" />}
                                    </button>
                                ))}
                                {customMode ? (
                                    <div className="mt-1 border-t border-border p-1.5">
                                        <input
                                            autoFocus
                                            type="text"
                                            inputMode="numeric"
                                            value={customLimit}
                                            onChange={e => setCustomLimit(e.target.value.replace(/[^0-9]/g, ''))}
                                            onKeyDown={e => { if (e.key === 'Enter') applyCustomLimit(); }}
                                            placeholder="Enter number"
                                            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                                        />
                                        <button
                                            onClick={applyCustomLimit}
                                            disabled={!customLimit}
                                            className="mt-1.5 w-full rounded-md bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setCustomMode(true)}
                                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                                    >
                                        Custom
                                        {!PRESET_LIMITS.includes(limit as typeof PRESET_LIMITS[number]) && <Check className="h-4 w-4 text-primary" />}
                                    </button>
                                )}
                            </PopoverContent>
                        </Popover>
                        <span className="text-xs text-muted-foreground">per page · {total.toLocaleString()} users</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            disabled={page === 1 || loading}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent cursor-pointer"
                        >
                            Prev
                        </button>
                        <span className="px-2 text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            disabled={page >= totalPages || loading}
                            onClick={() => setPage(p => p + 1)}
                            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>
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
