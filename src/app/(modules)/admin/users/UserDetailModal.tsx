'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api/client';
import { X, Loader2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getErrorMessage } from '@/lib/apiError';
import { useAppSelector } from '@/store/hooks';

interface RoleDefaults {
    // Unified monthly credit allowance for this role. `searches` / `exports` /
    // `enrichments` are deprecated aliases the backend still sends — same number.
    credits: number;
    export_rows: number;
    export_rows_per_credit: number;
}

interface CustomQuotas {
    enabled: boolean;
    unified_quota_monthly: number | null;
    export_rows_per_credit: number | null;
    export_row_cap: number | null;
}

// The single unified balance shared by AI search, enrichment and export.
// `limit` is -1 for admins (unlimited).
interface CreditsLeft {
    total: number;
    used: number;
    limit: number;
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
    credits_left: CreditsLeft
}

const ROLES = ['free', 'standard', 'premium', 'admin'] as const;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    inactive: 'Deactivated',
    pending: 'Pending',
    rejected: 'Rejected',
};

const statusBadge: Record<string, string> = {
    active: 'bg-success/10 text-success',
    inactive: 'bg-destructive/10 text-destructive',
    pending: 'bg-warning/10 text-warning',
    rejected: 'bg-destructive/10 text-destructive',
};

type ActionKey = 'accept' | 'reject' | 'deactivate' | 'reactivate';

// Per-action copy for the confirm step, which renders inline beneath the
// user detail rather than replacing it. `accept` never confirms — clicking
// it calls the API directly.
const CONFIRM_COPY: Record<Exclude<ActionKey, 'accept'>, {
    prompt: (name: string) => string;
    reasonLabel: string;
    confirmLabel: string;
    confirmDestructive: boolean;
}> = {
    reject: {
        prompt: (name) => `Are you sure you want to reject ${name}?`,
        reasonLabel: 'Reason for rejection',
        confirmLabel: 'Reject',
        confirmDestructive: true,
    },
    deactivate: {
        prompt: (name) => `Reason for removal of ${name}`,
        reasonLabel: '',
        confirmLabel: 'Remove User',
        confirmDestructive: true,
    },
    reactivate: {
        prompt: (name) => `Reason for reactivating ${name}`,
        reasonLabel: '',
        confirmLabel: 'Reactivate User',
        confirmDestructive: false,
    },
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

// A single modal shell with three modes: the live user detail (role,
// credits, custom quotas, status-appropriate actions); a confirm step that
// keeps the identity block and swaps the editable sections for a reason box;
// and a terminal success notice for accept (the only action Figma shows a
// dedicated post-success screen for).
type Mode = 'detail' | 'confirm' | 'success';

export default function UserDetailModal({ userId, status, onClose, onUpdated }: UserDetailModalProps) {
    const currentUserId = useAppSelector(state => state.auth.user?.id);

    const [user, setUser] = useState<GetUserResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [role, setRole] = useState<string>('');
    const [savingRole, setSavingRole] = useState(false);

    const [overrideEnabled, setOverrideEnabled] = useState(false);
    const [quotaEditing, setQuotaEditing] = useState(false);
    const [savingQuotas, setSavingQuotas] = useState(false);
    const [reasonError, setReasonError] = useState(false);
    const [overrideValues, setOverrideValues] = useState<Record<string, string>>({
        unified_quota_monthly: '',
        export_rows_per_credit: '',
        reason: '',
    });

    const [mode, setMode] = useState<Mode>('detail');
    const [confirmAction, setConfirmAction] = useState<Exclude<ActionKey, 'accept'> | null>(null);
    const [successAction, setSuccessAction] = useState<ActionKey | null>(null);
    const [actionLoading, setActionLoading] = useState<ActionKey | null>(null);
    const [actionReason, setActionReason] = useState('');
    const [actionReasonError, setActionReasonError] = useState(false);

    const fetchUser = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get('/admin/get-user', { params: { user_id: userId } });
            const data: GetUserResponse = res.data.data;
            setUser(data);
            setRole(data.role);
            setOverrideEnabled(data.custom_quotas.enabled);
            setOverrideValues({
                unified_quota_monthly: data.custom_quotas.unified_quota_monthly?.toString() ?? '',
                export_rows_per_credit: data.custom_quotas.export_rows_per_credit?.toString() ?? '',
                reason: data.override_reason ?? '',
            });
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to load user details'));
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await apiClient.get('/admin/get-user', { params: { user_id: userId } });
                if (!active) return;
                const data: GetUserResponse = res.data.data;
                setUser(data);
                setRole(data.role);
                setOverrideEnabled(data.custom_quotas.enabled);
                setOverrideValues({
                    unified_quota_monthly: data.custom_quotas.unified_quota_monthly?.toString() ?? '',
                    export_rows_per_credit: data.custom_quotas.export_rows_per_credit?.toString() ?? '',
                    reason: data.override_reason ?? '',
                });
            } catch (err: unknown) {
                if (!active) return;
                setError(getErrorMessage(err, 'Failed to load user details'));
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
            await apiClient.patch('/admin/update-role', null, { params: { user_id: user.id, role } });
            setUser(prev => (prev ? { ...prev, role } : prev));
            toast.success(`Role updated to ${role}`);
            fetchUser();
            onUpdated?.();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Failed to update role'));
        } finally {
            setSavingRole(false);
        }
    };

    const startCreateQuota = () => {
        setOverrideEnabled(true);
        setQuotaEditing(true);
    };

    const startEditQuota = () => {
        setQuotaEditing(true);
    };

    const cancelQuotaEdit = () => {
        if (!user) return;
        setQuotaEditing(false);
        setOverrideEnabled(user.custom_quotas.enabled);
        setReasonError(false);
        setOverrideValues({
            unified_quota_monthly: user.custom_quotas.unified_quota_monthly?.toString() ?? '',
            export_rows_per_credit: user.custom_quotas.export_rows_per_credit?.toString() ?? '',
            reason: user.override_reason ?? '',
        });
    };

    const saveQuotas = async () => {
        if (!user) return;
        if (!overrideValues.reason.trim()) {
            setReasonError(true);
            return;
        }
        setReasonError(false);
        setSavingQuotas(true);
        try {
            await apiClient.patch('/admin/update-credits', {
                user_id: user.id,
                enabled: true,
                unified_quota_monthly: overrideValues.unified_quota_monthly ? Number(overrideValues.unified_quota_monthly) : null,
                export_rows_per_credit: overrideValues.export_rows_per_credit ? Number(overrideValues.export_rows_per_credit) : null,
                override_reason: overrideValues.reason.trim() || null,
            });
            toast.success(`Quotas updated for ${user.name}`);
            setQuotaEditing(false);
            fetchUser();
            onUpdated?.();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Failed to update quotas'));
        } finally {
            setSavingQuotas(false);
        }
    };

    const removeQuota = async () => {
        if (!user) return;
        setSavingQuotas(true);
        try {
            await apiClient.patch('/admin/update-credits', {
                user_id: user.id,
                enabled: false,
                unified_quota_monthly: 0,
                export_rows_per_credit: 0,
                override_reason: ''
            });
            toast.success(`Custom quota removed for ${user.name}`);
            setOverrideEnabled(false);
            setQuotaEditing(false);
            setOverrideValues({ unified_quota_monthly: '', export_rows_per_credit: '', reason: '' });
            fetchUser();
            onUpdated?.();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Failed to remove quota'));
        } finally {
            setSavingQuotas(false);
        }
    };

    const runAction = async (action: ActionKey, reason?: string) => {
        if (!user) return;
        setActionLoading(action);
        try {
            await apiClient.patch('/admin/user-status',
                { action, reason },
                { params: { user_id: user.id } });
            onUpdated?.();
            if (action === 'accept') {
                // Figma shows a dedicated "User Approved" success notice for
                // this action only — reject/deactivate/reactivate close
                // straight from their own confirm dialog.
                setSuccessAction('accept');
                setMode('success');
            } else {
                onClose();
            }
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, `Failed to ${action}`));
            setActionLoading(null);
            setMode('detail');
            setConfirmAction(null);
        }
    };

    const openConfirm = (action: Exclude<ActionKey, 'accept'>) => {
        setConfirmAction(action);
        setActionReason('');
        setActionReasonError(false);
        setMode('confirm');
    };

    const cancelConfirm = () => {
        setMode('detail');
        setConfirmAction(null);
        setActionReason('');
        setActionReasonError(false);
    };

    const submitConfirm = () => {
        if (!confirmAction) return;
        const reason = actionReason.trim();
        if (!reason) {
            setActionReasonError(true);
            return;
        }
        runAction(confirmAction, reason);
    };

    const effectiveStatus = user?.status ?? status;
    // Admins can't deactivate their own account.
    const isSelf = !!currentUserId && currentUserId === userId;
    const availableActions = (effectiveStatus ? STATUS_ACTIONS[effectiveStatus] ?? [] : [])
        .filter(k => !(isSelf && k === 'deactivate'));

    const creditsLeft = user?.credits_left;
    const creditsUnlimited = (creditsLeft?.limit ?? 0) < 0;
    const creditsPct = !creditsUnlimited && creditsLeft?.limit && creditsLeft.limit > 0 && creditsLeft.total != null
        ? Math.min((creditsLeft.total / creditsLeft.limit) * 100, 100)
        : 0;
    const creditsColor = creditsUnlimited ? 'border-success text-success' : creditsPct > 60 ? 'border-success text-success' : creditsPct > 30 ? 'border-warning text-warning' : 'border-destructive text-destructive';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md flex flex-col rounded-2xl bg-card overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : error ? (
                    <div className="p-6">
                        <div className="flex justify-end">
                            <button onClick={onClose} className="rounded-md p-1 hover:bg-accent cursor-pointer"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {error}
                        </div>
                    </div>
                ) : user && mode === 'success' && successAction ? (
                    <>
                        {/* Terminal success notice — white header, teal footer,
                            matching Figma's "User Approved" dialog. */}
                        <div className="flex items-center justify-between border-b border-border p-5">
                            <p className="text-lg font-bold">User Approved</p>
                            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 text-sm text-foreground">
                            {user.name} has been approved as a {capitalize(role)} tier user.
                        </div>
                        <div className="flex justify-end bg-primary p-4">
                            <button
                                onClick={onClose}
                                className="rounded-md bg-background px-5 py-2 text-sm font-semibold text-primary hover:opacity-90 cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </>
                ) : user && (
                    <>
                        <div className="flex items-center justify-between bg-primary p-5 text-primary-foreground">
                            <p className="text-lg font-bold">{effectiveStatus === 'pending' ? 'Add / Reject User' : 'User Details'}</p>
                            <button onClick={onClose} className="rounded-md p-1 text-primary-foreground/80 hover:text-primary-foreground cursor-pointer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto space-y-5">
                            <div className="flex items-center gap-3 p-5 border-b">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-base font-semibold text-muted-foreground">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold truncate">{user.name}</p>
                                        {effectiveStatus && (
                                            <span className={cn('rounded-md px-2 py-0.5 text-xs font-medium', statusBadge[effectiveStatus] ?? 'bg-muted text-muted-foreground')}>
                                                {STATUS_LABELS[effectiveStatus] ?? effectiveStatus}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-[#5A5A5A] font-light truncate">{user.email}</p>
                                </div>
                            </div>

                            {effectiveStatus === 'rejected' && user.rejection_reason && (
                                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
                                    <p className="text-xs font-semibold text-destructive">Rejection reason</p>
                                    <p className="mt-0.5 text-sm text-foreground whitespace-pre-wrap">{user.rejection_reason}</p>
                                </div>
                            )}

                            {/* Role, credits and quota editing are hidden while a
                                reason is being entered — the confirm step keeps only
                                the identity block above it. */}
                            {mode !== 'confirm' && (
                                <>
                                    {/* Role + Credits Balance, side by side per Figma */}
                                    <div className="grid grid-cols-2 gap-4 px-5">
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground">Role</label>
                                            <div className="mt-1 flex items-center gap-1.5">
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
                                                {role !== user.role && (
                                                    <button
                                                        onClick={updateRole}
                                                        disabled={savingRole}
                                                        aria-label="Save role"
                                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 cursor-pointer"
                                                    >
                                                        {savingRole ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground">Credits Balance</label>
                                            <div className="mt-1">
                                                <span className={cn('inline-flex h-9 items-center rounded-full border-2 px-4 text-sm font-semibold', creditsColor)}>
                                                    {creditsUnlimited ? '∞' : `${creditsLeft?.total ?? 0}/${creditsLeft?.limit ?? 0}`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className='flex flex-col gap-2'>
                                        <div className="flex items-center justify-between px-5">
                                            <span className="text-sm font-normal text-[#5A5A5A]">Custom Credit Quotas</span>
                                            {!quotaEditing && overrideEnabled && (
                                                <div className="flex items-center gap-3 text-xs font-medium">
                                                    <button onClick={startEditQuota} className="text-primary underline underline-offset-2 cursor-pointer">Edit</button>
                                                    <button onClick={removeQuota} disabled={savingQuotas} className="text-destructive underline underline-offset-2 cursor-pointer disabled:opacity-40">Remove</button>
                                                </div>
                                            )}
                                            {!quotaEditing && !overrideEnabled && (
                                                <button onClick={startCreateQuota} className="text-xs font-medium text-primary underline underline-offset-2 cursor-pointer">
                                                    Create Custom Quota
                                                </button>
                                            )}
                                        </div>

                                        {quotaEditing ? (
                                            <div className="space-y-3 rounded-lg bg-[#F0F0F0] p-3 mx-5 mb-5">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-xs font-light text-[#5A5A5A] capitalize">Credit Quota (monthly)</label>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={overrideValues.unified_quota_monthly}
                                                            onChange={e => setOverrideValues(prev => ({ ...prev, unified_quota_monthly: e.target.value.replace(/[^0-9]/g, '') }))}
                                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-mono outline-none focus:ring-1 focus:ring-ring"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-light text-[#5A5A5A] capitalize">Export rows per credit</label>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={overrideValues.export_rows_per_credit}
                                                            onChange={e => setOverrideValues(prev => ({ ...prev, export_rows_per_credit: e.target.value.replace(/[^0-9]/g, '') }))}
                                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-mono outline-none focus:ring-1 focus:ring-ring"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-light text-[#5A5A5A] capitalize">Override reason <span className="text-destructive">*</span></label>
                                                    <textarea
                                                        placeholder='Enter Reason'
                                                        value={overrideValues.reason}
                                                        onChange={e => { setOverrideValues(prev => ({ ...prev, reason: e.target.value })); if (reasonError) setReasonError(false); }}
                                                        className={cn('w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 resize-none',
                                                            reasonError ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring')} rows={2} />
                                                    {reasonError && <p className="mt-1 text-xs text-destructive">Please provide a reason</p>}
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={cancelQuotaEdit} disabled={savingQuotas} className="rounded-lg border border-primary bg-white px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-40 cursor-pointer">
                                                        Cancel
                                                    </button>
                                                    <button onClick={saveQuotas} disabled={savingQuotas} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 cursor-pointer">
                                                        {savingQuotas && <Loader2 className="h-4 w-4 animate-spin" />}
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        ) : overrideEnabled ? (
                                            <div className="space-y-4 rounded-lg bg-[#F0F0F0] p-3 text-sm mx-5 mb-5">
                                                <p className='flex flex-col gap-1'><span className="text-[#5A5A5A] font-light text-xs">Credit Quota</span><span className="font-normal text-[#313131]">{overrideValues.unified_quota_monthly || '—'}</span></p>
                                                <p className='flex flex-col gap-1'><span className="text-[#5A5A5A] font-light text-xs">Override Reason</span><span className="font-normal text-[#313131]">{overrideValues.reason || '—'}</span></p>
                                            </div>
                                        ) : null}
                                    </div>
                                </>
                            )}

                            {/* Confirm-with-reason step, shown under the identity
                                block so the admin can re-check who they are acting
                                on while typing. */}
                            {mode === 'confirm' && confirmAction && (() => {
                                const copy = CONFIRM_COPY[confirmAction];
                                return (
                                    <div className="space-y-2 px-5 pb-5">
                                        <p className="text-sm font-medium">{copy.prompt(user.name)}</p>
                                        {copy.reasonLabel && (
                                            <label className="block text-xs font-medium text-muted-foreground">{copy.reasonLabel}</label>
                                        )}
                                        <textarea
                                            autoFocus
                                            value={actionReason}
                                            onChange={e => { setActionReason(e.target.value); if (actionReasonError) setActionReasonError(false); }}
                                            rows={3}
                                            placeholder="Enter Reason"
                                            className={cn('w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 resize-none',
                                                actionReasonError ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring')}
                                        />
                                        {actionReasonError && <p className="text-xs text-destructive">Please provide a reason</p>}
                                    </div>
                                );
                            })()}
                        </div>

                        {mode === 'confirm' && confirmAction ? (
                            <div className="flex items-center justify-end gap-2 bg-primary p-4">
                                <button
                                    onClick={cancelConfirm}
                                    disabled={actionLoading !== null}
                                    className="rounded-md border border-primary-foreground/40 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-foreground/10 disabled:opacity-40 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitConfirm}
                                    disabled={actionLoading !== null}
                                    className={cn('flex items-center gap-1.5 rounded-md px-5 py-2 text-sm font-semibold disabled:opacity-40 cursor-pointer',
                                        CONFIRM_COPY[confirmAction].confirmDestructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-background text-primary hover:opacity-90')}
                                >
                                    {actionLoading === confirmAction && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {CONFIRM_COPY[confirmAction].confirmLabel}
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-2 bg-primary p-4">
                                {availableActions.includes('deactivate') ? (
                                    <button
                                        onClick={() => openConfirm('deactivate')}
                                        className="text-sm font-medium text-primary-foreground underline underline-offset-2 cursor-pointer"
                                    >
                                        Remove User
                                    </button>
                                ) : <span />}

                                <div className="flex items-center gap-2">
                                    {availableActions.includes('reject') && (
                                        <button
                                            onClick={() => openConfirm('reject')}
                                            disabled={actionLoading !== null}
                                            className="rounded-md bg-destructive px-5 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40 cursor-pointer"
                                        >
                                            Reject User
                                        </button>
                                    )}
                                    {availableActions.includes('accept') && (
                                        <button
                                            onClick={() => runAction('accept')}
                                            disabled={actionLoading !== null}
                                            className="flex items-center gap-1.5 rounded-md bg-background px-5 py-2 text-sm font-semibold text-primary hover:opacity-90 disabled:opacity-40 cursor-pointer"
                                        >
                                            {actionLoading === 'accept' && <Loader2 className="h-4 w-4 animate-spin" />}
                                            Accept User
                                        </button>
                                    )}
                                    {availableActions.includes('reactivate') && (
                                        <button
                                            onClick={() => openConfirm('reactivate')}
                                            disabled={actionLoading !== null}
                                            className="rounded-md bg-background px-5 py-2 text-sm font-semibold text-primary hover:opacity-90 disabled:opacity-40 cursor-pointer"
                                        >
                                            Reactivate User
                                        </button>
                                    )}
                                    {!availableActions.includes('reject') && !availableActions.includes('accept') && !availableActions.includes('reactivate') && (
                                        <button
                                            onClick={onClose}
                                            className="rounded-md border border-primary-foreground/40 px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-foreground/10 cursor-pointer"
                                        >
                                            Close
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
