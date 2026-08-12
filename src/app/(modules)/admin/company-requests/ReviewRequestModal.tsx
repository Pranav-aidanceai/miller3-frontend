'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Check, Loader2, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/apiError';
import { companyFieldLabel, formatCompanyFieldValue } from '@/lib/companyFields';
import type {
    AdminCompanyUpdateRequest,
    CompanyFieldAction,
    CompanyFieldReviewDecision,
    CompanyUpdateReviewPayload,
} from '@/types/search';

/** Working state for one field while the admin makes up their mind. */
interface DraftDecision {
    action: CompanyFieldAction;
    reason: string;
}

export default function ReviewRequestModal({
    request,
    onClose,
    onReviewed,
}: {
    request: AdminCompanyUpdateRequest;
    onClose: () => void;
    /** Fired after a successful review so the list can refresh. */
    onReviewed: () => void;
}) {
    const fields = Object.entries(request.requested_changes ?? {});
    const [decisions, setDecisions] = useState<Record<string, DraftDecision>>(() =>
        Object.fromEntries(fields.map(([key]) => [key, { action: 'approve' as CompanyFieldAction, reason: '' }]))
    );
    const [reviewReason, setReviewReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Counted off `fields` rather than the draft map, so the tallies can only
    // ever describe the fields actually being submitted.
    const approvedCount = fields.filter(([key]) => decisions[key]?.action === 'approve').length;
    const rejectedCount = fields.length - approvedCount;
    // A rejection the requester can't learn anything from is worse than no review.
    const missingRejectReasons = fields.filter(
        ([key]) => decisions[key]?.action === 'reject' && decisions[key].reason.trim() === ''
    );
    const canSubmit = fields.length > 0 && missingRejectReasons.length === 0;

    const setDecision = (key: string, patch: Partial<DraftDecision>) =>
        setDecisions(d => ({ ...d, [key]: { ...d[key], ...patch } }));

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !submitting) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, submitting]);

    const handleSubmit = async () => {
        if (!canSubmit || submitting) return;

        // The API requires field_decisions to cover `requested_changes` exactly —
        // no extra keys, none omitted — so this always walks `fields` itself.
        // Approved fields are applied to the company immediately; the overall
        // status is derived server-side from the mix of actions.
        const field_decisions = fields.reduce<Record<string, CompanyFieldReviewDecision>>((acc, [key]) => {
            const draft = decisions[key];
            acc[key] = { action: draft.action, reason: draft.reason.trim() || null };
            return acc;
        }, {});

        const payload: CompanyUpdateReviewPayload = {
            request_id: request.request_id,
            field_decisions,
            ...(reviewReason.trim() ? { reason: reviewReason.trim() } : {}),
        };

        setSubmitting(true);
        try {
            await axios.post('/api/admin/company-request', payload);
            toast.success(
                rejectedCount === 0 ? 'Request approved'
                    : approvedCount === 0 ? 'Request rejected'
                        : `Review submitted — ${approvedCount} approved, ${rejectedCount} rejected`
            );
            onReviewed();
            onClose();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Failed to submit review'), {
                duration: 5000,
                className: '!bg-destructive !text-white !border-destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !submitting && onClose()} />

            <div className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border/50 bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="shrink-0 border-b border-border px-6 py-5 pr-14">
                    <h2 className="text-xl font-semibold">Review Request</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{request.company_name}</span>
                        {' · raised by '}
                        <span className="font-medium text-foreground">{request.requested_by_email ?? request.requested_by}</span>
                    </p>
                    {request.reason && (
                        <p className="mt-2 wrap-break-word rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Their reason: </span>
                            {request.reason}
                        </p>
                    )}
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        aria-label="Close"
                        className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors cursor-pointer hover:bg-accent hover:text-foreground disabled:opacity-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
                    {fields.map(([key, value]) => {
                        const draft = decisions[key];
                        const approve = draft.action === 'approve';
                        const reasonMissing = !approve && draft.reason.trim() === '';

                        return (
                            <div
                                key={key}
                                className={cn(
                                    'rounded-lg border px-3 py-3 transition-colors',
                                    approve ? 'border-success/40 bg-success/5' : 'border-destructive/40 bg-destructive/5'
                                )}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground">{companyFieldLabel(key)}</p>
                                        <p className="wrap-break-word text-sm font-medium">
                                            {formatCompanyFieldValue(key, value)}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 overflow-hidden rounded-lg border border-border">
                                        <button
                                            type="button"
                                            disabled={submitting}
                                            onClick={() => setDecision(key, { action: 'approve' })}
                                            className={cn(
                                                'flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50',
                                                approve ? 'bg-success text-white' : 'bg-background text-muted-foreground hover:bg-accent'
                                            )}
                                        >
                                            <Check className="h-3.5 w-3.5" /> Approve
                                        </button>
                                        <button
                                            type="button"
                                            disabled={submitting}
                                            onClick={() => setDecision(key, { action: 'reject' })}
                                            className={cn(
                                                'flex items-center gap-1 border-l border-border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50',
                                                !approve ? 'bg-destructive text-white' : 'bg-background text-muted-foreground hover:bg-accent'
                                            )}
                                        >
                                            <X className="h-3.5 w-3.5" /> Reject
                                        </button>
                                    </div>
                                </div>

                                <input
                                    type="text"
                                    value={draft.reason}
                                    disabled={submitting}
                                    onChange={e => setDecision(key, { reason: e.target.value })}
                                    placeholder={approve ? 'Note for the requester (optional)' : 'Why is this rejected?'}
                                    className={cn(
                                        'mt-3 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 disabled:opacity-50',
                                        reasonMissing
                                            ? 'border-destructive focus:ring-destructive/30'
                                            : 'border-input focus:ring-ring'
                                    )}
                                />
                            </div>
                        );
                    })}

                    <div>
                        <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Overall note</h3>
                        <textarea
                            rows={2}
                            value={reviewReason}
                            disabled={submitting}
                            onChange={e => setReviewReason(e.target.value)}
                            placeholder="Optional — shown to the requester alongside the per-field decisions."
                            className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                        />
                    </div>
                </div>

                <div className="shrink-0 border-t border-border px-6 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                            {missingRejectReasons.length
                                ? `Add a reason for ${missingRejectReasons.map(([k]) => companyFieldLabel(k)).join(', ')}`
                                : `${approvedCount} to approve · ${rejectedCount} to reject`}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={submitting}
                                className="h-10 rounded-lg border border-border px-4 text-sm font-medium transition-colors cursor-pointer hover:bg-accent disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !canSubmit}
                                className="flex h-10 min-w-36 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all cursor-pointer hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" /> Submit review
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
