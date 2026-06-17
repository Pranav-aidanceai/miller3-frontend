'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { X, Save, Loader2, Shield, Gauge, UserCheck, UserX, Ban, RotateCcw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RoleDefaults {
    searches: number;
    exports: number;
    export_rows: number;
    enrichments: number;
}

interface CustomQuotas {
    enabled: boolean;
    search_quota_monthly: number | null;
    export_quota_monthly: number | null;
    export_row_cap: number | null;
    enrichment_quota_monthly: number | null;
}

interface CreditLeft {
    ai_search: number,
    enrichment: number,
    export: number
}

interface GetUserResponse {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    rejection_reason: string | null
    role_defaults: RoleDefaults;
    custom_quotas: CustomQuotas;
    override_reason: string | null;
    credits_left: CreditLeft
}

const ROLES = ['free', 'standard', 'premium', 'admin'] as const;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const roleBadge: Record<string, string> = {
    admin: 'bg-destructive/10 text-destructive',
    premium: 'bg-primary/10 text-primary',
    standard: 'bg-warning/10 text-warning',
    free: 'bg-muted text-muted-foreground',
};

const CREDIT_LABELS: Record<keyof CreditLeft, string> = {
    ai_search: 'AI Search',
    enrichment: 'Enrichment',
    export: 'Export',
};

const QUOTA_FIELDS: { key: keyof CustomQuotas; label: string }[] = [
    { key: 'search_quota_monthly', label: 'Search quota (monthly)' },
    { key: 'export_quota_monthly', label: 'Export quota (monthly)' },
    { key: 'enrichment_quota_monthly', label: 'Enrichment quota (monthly)' },
];

const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending Approval',
    rejected: 'Rejected',
};

const statusBadge: Record<string, string> = {
    active: 'bg-success/10 text-success',
    inactive: 'bg-muted text-muted-foreground',
    pending: 'bg-warning/10 text-warning',
    rejected: 'bg-destructive/10 text-destructive',
};

type ActionKey = 'accept' | 'reject' | 'deactivate' | 'reactivate';

interface ActionDef {
    key: ActionKey;
    label: string;
    icon: typeof UserCheck;
    variant: 'primary' | 'destructive';
    confirm?: boolean;
    requiresReason?: boolean;
    reasonLabel?: string;
    reasonPlaceholder?: string;
    success: string;
}

const ACTIONS: Record<ActionKey, ActionDef> = {
    accept: { key: 'accept', label: 'Accept user', icon: UserCheck, variant: 'primary', success: 'User accepted' },
    reject: { key: 'reject', label: 'Reject user', icon: UserX, variant: 'destructive', confirm: true, requiresReason: true, reasonLabel: 'Reason for rejection', reasonPlaceholder: 'Explain why this user is being rejected', success: 'User rejected' },
    deactivate: { key: 'deactivate', label: 'Deactivate user', icon: Ban, variant: 'destructive', confirm: true, requiresReason: true, reasonLabel: 'Reason for deactivation', reasonPlaceholder: 'Explain why this user is being deactivated', success: 'User deactivated' },
    reactivate: { key: 'reactivate', label: 'Reactivate user', icon: RotateCcw, variant: 'primary', confirm: true, requiresReason: true, reasonLabel: 'Reason for reactivation', reasonPlaceholder: 'Explain why this user is being reactivated', success: 'User reactivated' },
};

// Which actions are available for a given account status.
const STATUS_ACTIONS: Record<string, ActionKey[]> = {
    pending: ['accept', 'reject'],
    rejected: ['accept'],
    active: ['deactivate'],
    inactive: ['reactivate'],
};

interface UserDetailModalProps {
    userId: string;
    status?: string;
    onClose: () => void;
    onUpdated?: () => void;
}

export default function UserDetailModal({ userId, status, onClose, onUpdated }: UserDetailModalProps) {
    const [user, setUser] = useState<GetUserResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [role, setRole] = useState<string>('');
    const [savingRole, setSavingRole] = useState(false);

    const [overrideEnabled, setOverrideEnabled] = useState(false);
    const [savingQuotas, setSavingQuotas] = useState(false);
    const [reasonError, setReasonError] = useState(false);
    const [overrideValues, setOverrideValues] = useState<Record<string, string>>({
        search_quota_monthly: '',
        export_quota_monthly: '',
        enrichment_quota_monthly: '',
        reason: '',
    });

    const [actionLoading, setActionLoading] = useState<ActionKey | null>(null);
    const [confirming, setConfirming] = useState<ActionKey | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectReasonError, setRejectReasonError] = useState(false);

    const fetchUser = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get('/api/admin/get-user', { params: { user_id: userId } });
            const data: GetUserResponse = res.data.data;
            setUser(data);
            setRole(data.role);
            setOverrideEnabled(data.custom_quotas.enabled);
            setOverrideValues({
                search_quota_monthly: data.custom_quotas.search_quota_monthly?.toString() ?? '',
                export_quota_monthly: data.custom_quotas.export_quota_monthly?.toString() ?? '',
                enrichment_quota_monthly: data.custom_quotas.enrichment_quota_monthly?.toString() ?? '',
                reason: data.override_reason ?? '',
            });
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.error || 'Failed to load user details');
            } else {
                setError('Failed to load user details');
            }
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await axios.get('/api/admin/get-user', { params: { user_id: userId } });
                if (!active) return;
                const data: GetUserResponse = res.data.data;
                setUser(data);
                setRole(data.role);
                setOverrideEnabled(data.custom_quotas.enabled);
                setOverrideValues({
                    search_quota_monthly: data.custom_quotas.search_quota_monthly?.toString() ?? '',
                    export_quota_monthly: data.custom_quotas.export_quota_monthly?.toString() ?? '',
                    enrichment_quota_monthly: data.custom_quotas.enrichment_quota_monthly?.toString() ?? '',
                    reason: data.override_reason ?? '',
                });
            } catch (err: unknown) {
                if (!active) return;
                if (axios.isAxiosError(err)) {
                    setError(err.response?.data?.error || 'Failed to load user details');
                } else {
                    setError('Failed to load user details');
                }
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [userId]);

    const updateRole = async () => {
        if (!user || role === user.role) return;
        setSavingRole(true);
        try {
            await axios.patch('/api/admin/update-role', null, { params: { user_id: user.id, role } });
            setUser(prev => (prev ? { ...prev, role } : prev));
            toast.success(`Role updated to ${role}`);
            fetchUser();
            onUpdated?.();
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
            toast.error(msg || 'Failed to update role');
        } finally {
            setSavingRole(false);
        }
    };

    const saveQuotas = async () => {
        if (!user) return;
        if (overrideEnabled && !overrideValues.reason.trim()) {
            setReasonError(true);
            return;
        }
        setReasonError(false);
        setSavingQuotas(true);
        try {
            await axios.patch('/api/admin/update-credits', {
                user_id: user.id,
                enabled: overrideEnabled,
                search_quota_monthly: overrideValues.search_quota_monthly ? Number(overrideValues.search_quota_monthly) : null,
                export_quota_monthly: overrideValues.export_quota_monthly ? Number(overrideValues.export_quota_monthly) : null,
                enrichment_quota_monthly: overrideValues.enrichment_quota_monthly ? Number(overrideValues.enrichment_quota_monthly) : null,
                override_reason: overrideValues.reason.trim() || null,
            });
            toast.success(`Quotas updated for ${user.name}`);
            onUpdated?.();
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
            toast.error(msg || 'Failed to update quotas');
        } finally {
            setSavingQuotas(false);
        }
    };

    const runAction = async (action: ActionDef) => {
        if (!user) return;
        const reason = rejectReason.trim();
        if (action.requiresReason && !reason) {
            setRejectReasonError(true);
            return;
        }
        setActionLoading(action.key);
        try {
            await axios.patch('/api/admin/user-status',
                { action: action.key, reason: action.requiresReason ? reason : undefined },
                { params: { user_id: user.id } });
            toast.success(action.success);
            onUpdated?.();
            onClose();
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err) ? err.response?.data?.error : null;
            toast.error(msg || `Failed to ${action.label.toLowerCase()}`);
            setActionLoading(null);
            setConfirming(null);
        }
    };

    const cancelConfirm = () => {
        setConfirming(null);
        setRejectReason('');
        setRejectReasonError(false);
    };

    const effectiveStatus = user?.status ?? status;
    const availableActions = (effectiveStatus ? STATUS_ACTIONS[effectiveStatus] ?? [] : []).map(k => ACTIONS[k]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-card border border-border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : error ? (
                    <div className="p-6">
                        <div className="flex justify-end">
                            <button onClick={onClose} className="rounded-md p-1 hover:bg-accent cursor-pointer"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                            {error}
                        </div>
                    </div>
                ) : user && (
                    <>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4 border-b border-border p-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="w-full flex flex-col gap-0">
                                    <div className='flex items-center gap-2'>
                                        <p className="text-lg font-bold truncate">{user.name}</p>
                                        <p className={cn('rounded-md px-2 py-0.5 text-xs font-medium capitalize', roleBadge[user.role])}>{user.role}</p>
                                        {effectiveStatus && (
                                            <p className={cn('rounded-md px-2 py-0.5 text-xs font-medium', statusBadge[effectiveStatus] ?? 'bg-muted text-muted-foreground')}>
                                                {STATUS_LABELS[effectiveStatus] ?? effectiveStatus}
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="overflow-y-auto p-6 space-y-6">
                            {/* Rejection reason */}
                            {effectiveStatus === 'rejected' && user.rejection_reason && (
                                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
                                    <UserX className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                                    <div>
                                        <p className="text-xs font-semibold text-destructive">Rejection reason</p>
                                        <p className="mt-0.5 text-sm text-foreground whitespace-pre-wrap">{user.rejection_reason}</p>
                                    </div>
                                </div>
                            )}

                            {/* Account actions */}
                            {availableActions.length > 0 && (
                                <section>
                                    <h3 className="mb-2 text-sm font-semibold">Account actions</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {availableActions.map(action => {
                                            const Icon = action.icon;
                                            const busy = actionLoading === action.key;
                                            const isConfirming = confirming === action.key;
                                            const destructive = action.variant === 'destructive';
                                            if (isConfirming) {
                                                return (
                                                    <div key={action.key} className="w-full space-y-3 rounded-md border border-border bg-muted/40 p-3">
                                                        <div className="flex items-center gap-2">
                                                            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                                                            <span className="text-sm">Confirm {action.label.toLowerCase()}?</span>
                                                        </div>
                                                        {action.requiresReason && (
                                                            <div>
                                                                <label className="text-xs font-medium text-muted-foreground">
                                                                    {action.reasonLabel ?? 'Reason'} <span className="text-destructive">*</span>
                                                                </label>
                                                                <textarea
                                                                    autoFocus
                                                                    value={rejectReason}
                                                                    onChange={e => { setRejectReason(e.target.value); if (rejectReasonError) setRejectReasonError(false); }}
                                                                    rows={2}
                                                                    placeholder={action.reasonPlaceholder ?? 'Provide a reason'}
                                                                    className={cn('mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 resize-none',
                                                                        rejectReasonError ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring')}
                                                                />
                                                                {rejectReasonError && <p className="mt-1 text-xs text-destructive">Please provide a reason</p>}
                                                            </div>
                                                        )}
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={cancelConfirm}
                                                                disabled={busy}
                                                                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-40 cursor-pointer"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={() => runAction(action)}
                                                                disabled={busy}
                                                                className={cn('flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40 cursor-pointer',
                                                                    destructive ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90')}
                                                            >
                                                                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                                                                {action.requiresReason ? action.label : 'Yes'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <button
                                                    key={action.key}
                                                    onClick={() => (action.confirm ? setConfirming(action.key) : runAction(action))}
                                                    disabled={actionLoading !== null}
                                                    className={cn(
                                                        'flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors',
                                                        destructive
                                                            ? 'border border-destructive/40 text-destructive hover:bg-destructive/10'
                                                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                    )}
                                                >
                                                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                                                    {action.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* Role */}
                            <section>
                                <div className="mb-2 flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="text-sm font-semibold">Role</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Select value={role} onValueChange={setRole}>
                                        <SelectTrigger className="h-9 flex-1">
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ROLES.map(r => (
                                                <SelectItem key={r} value={r}>{capitalize(r)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <button
                                        onClick={updateRole}
                                        disabled={role === user.role || savingRole}
                                        className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {savingRole && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Update
                                    </button>
                                </div>
                            </section>

                            {/* Credits left */}
                            <section>
                                <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase">Credits Left</h3>
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    {(Object.keys(CREDIT_LABELS) as (keyof CreditLeft)[]).map(k => {
                                        const value = user.credits_left?.[k];
                                        return (
                                            <div key={k} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                                                <p className="text-xs text-muted-foreground">{CREDIT_LABELS[k]}</p>
                                                <p className="font-medium font-mono">{value == null ? '—' : value >= 999999 ? '∞' : value}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Custom quotas */}
                            <section>
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Gauge className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-semibold">Custom quotas</span>
                                    </div>
                                    <button onClick={() => setOverrideEnabled(!overrideEnabled)}
                                        className={cn('h-5 w-9 rounded-full transition-colors cursor-pointer', overrideEnabled ? 'bg-primary' : 'bg-muted')}>
                                        <div className={cn('h-4 w-4 rounded-full bg-primary-foreground transition-transform ml-0.5', overrideEnabled && 'translate-x-4')} />
                                    </button>
                                </div>

                                {overrideEnabled && (
                                    <div className="space-y-3 rounded-lg border border-border p-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            {QUOTA_FIELDS.map(f => (
                                                <div key={f.key}>
                                                    <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={overrideValues[f.key]}
                                                        onChange={e => setOverrideValues(prev => ({ ...prev, [f.key]: e.target.value.replace(/[^0-9]/g, '') }))}
                                                        className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-mono outline-none focus:ring-1 focus:ring-ring"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground">Override reason <span className="text-destructive">*</span></label>
                                            <textarea value={overrideValues.reason}
                                                onChange={e => { setOverrideValues(prev => ({ ...prev, reason: e.target.value })); if (reasonError) setReasonError(false); }}
                                                className={cn('mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 resize-none',
                                                    reasonError ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring')} rows={2} />
                                            {reasonError && <p className="mt-1 text-xs text-destructive">Please provide a reason</p>}
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2 border-t border-border p-4">
                            <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent cursor-pointer">
                                Cancel
                            </button>
                            <button onClick={saveQuotas} disabled={savingQuotas}
                                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                                {savingQuotas ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save Quotas
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
