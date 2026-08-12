'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Check, ChevronDown, ChevronUp, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/apiError';
import { companyFieldLabel, formatCompanyFieldValue } from '@/lib/companyFields';
import type {
    AdminCompanyUpdateRequest,
    AdminCompanyUpdateRequestsResponse,
    CompanyUpdateStatus,
} from '@/types/search';
import ReviewRequestModal from './ReviewRequestModal';

const STATUS_FILTERS: { value: CompanyUpdateStatus | 'all'; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'partially_approved', label: 'Partially approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All' },
];

const STATUS_BADGE: Record<CompanyUpdateStatus, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-warning/10 text-warning' },
    approved: { label: 'Approved', className: 'bg-success/10 text-success' },
    partially_approved: { label: 'Partially approved', className: 'bg-primary/10 text-primary' },
    rejected: { label: 'Rejected', className: 'bg-destructive/10 text-destructive' },
};

/** Fields a card shows before collapsing the rest behind "Show more". */
const COLLAPSED_FIELD_COUNT = 2;

function formatTimestamp(iso: string): string {
    const d = new Date(iso);
    const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${date}, ${time}`;
}

function StatusBadge({ status }: { status: CompanyUpdateStatus }) {
    // An unrecognised status still reads as itself rather than vanishing.
    const badge = STATUS_BADGE[status] ?? { label: status, className: 'bg-muted text-muted-foreground' };
    return (
        <span className={cn('shrink-0 rounded-pill px-2 py-0.5 text-xs font-semibold', badge.className)}>
            {badge.label}
        </span>
    );
}

function RequestCard({ request, onReview }: { request: AdminCompanyUpdateRequest; onReview: () => void }) {
    const [expanded, setExpanded] = useState(false);
    const changes = Object.entries(request.requested_changes ?? {});
    const hiddenCount = Math.max(0, changes.length - COLLAPSED_FIELD_COUNT);
    const shown = expanded ? changes : changes.slice(0, COLLAPSED_FIELD_COUNT);

    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{request.company_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="text-primary">{request.requested_by_email ?? request.requested_by}</span>
                        {` · ${formatTimestamp(request.created_at)}`}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={request.status} />
                    {request.status === 'pending' && (
                        <button
                            type="button"
                            onClick={onReview}
                            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer hover:bg-accent"
                        >
                            Review
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-3 space-y-1.5">
                {changes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No fields recorded on this request.</p>
                ) : (
                    shown.map(([key, value]) => {
                        const decision = request.field_decisions?.[key];
                        const approved = decision ? decision.action === 'approve' : null;
                        return (
                            <div
                                key={key}
                                className={cn(
                                    'rounded-md border px-3 py-2',
                                    approved === true ? 'border-success/40 bg-success/5'
                                        : approved === false ? 'border-destructive/40 bg-destructive/5'
                                            : 'border-border bg-muted/30'
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <span className="text-xs text-muted-foreground">{companyFieldLabel(key)}</span>
                                        <p className="wrap-break-word text-sm font-medium">
                                            {formatCompanyFieldValue(key, value)}
                                        </p>
                                        {/* Set when the reviewer applied something other than what
                                            was proposed. Nothing is applied on a rejection, so the
                                            value is only meaningful alongside an approval. */}
                                        {approved === true && decision?.value != null && (
                                            <p className="wrap-break-word text-xs text-success">
                                                Applied as {formatCompanyFieldValue(key, decision.value)}
                                            </p>
                                        )}
                                    </div>
                                    {approved !== null && (
                                        <span
                                            className={cn(
                                                'flex shrink-0 items-center gap-1 text-xs font-medium',
                                                approved ? 'text-success' : 'text-destructive'
                                            )}
                                        >
                                            {approved ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                                            {approved ? 'Approved' : 'Rejected'}
                                        </span>
                                    )}
                                </div>
                                {decision?.reason && <p className="mt-1 text-xs text-muted-foreground">{decision.reason}</p>}
                            </div>
                        );
                    })
                )}

                {hiddenCount > 0 && (
                    <button
                        type="button"
                        onClick={() => setExpanded(e => !e)}
                        className="flex items-center gap-1 rounded-md px-1 py-1 text-xs font-medium text-primary transition-colors cursor-pointer hover:underline"
                    >
                        {expanded ? (
                            <>
                                <ChevronUp className="h-3.5 w-3.5" /> Show less
                            </>
                        ) : (
                            <>
                                <ChevronDown className="h-3.5 w-3.5" />
                                Show {hiddenCount} more field{hiddenCount === 1 ? '' : 's'}
                            </>
                        )}
                    </button>
                )}
            </div>

            {request.reason && (
                <p className="mt-3 wrap-break-word border-t border-border pt-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Their reason: </span>
                    {request.reason}
                </p>
            )}

            {request.status === 'pending' && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> Awaiting your review.
                </p>
            )}
        </div>
    );
}

export default function CompanyRequestsPage() {
    const [requests, setRequests] = useState<AdminCompanyUpdateRequest[]>([]);
    // Pending is what an admin lands here to act on, so it leads.
    const [status, setStatus] = useState<CompanyUpdateStatus | 'all'>('pending');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [total, setTotal] = useState(0);
    const [reviewing, setReviewing] = useState<AdminCompanyUpdateRequest | null>(null);
    // Bumped after a review so the list refetches without resetting the filters.
    const [refreshKey, setRefreshKey] = useState(0);

    const totalPages = Math.ceil(total / perPage);

    useEffect(() => {
        let active = true;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await axios.get<AdminCompanyUpdateRequestsResponse>('/api/admin/company-request', {
                    params: { status: status === 'all' ? undefined : status, page, limit: perPage },
                });
                if (!active) return;
                setRequests(response.data?.requests ?? []);
                setTotal(response.data?.total ?? 0);
            } catch (err: unknown) {
                if (!active) return;
                setError(getErrorMessage(err, 'Failed to load company requests'));
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [status, page, perPage, refreshKey]);

    const handleReviewed = useCallback(() => setRefreshKey(k => k + 1), []);

    return (
        <div className="flex flex-col p-5" style={{ height: 'calc(100vh - 3rem)' }}>
            <div className="shrink-0">
                <h1 className="text-2xl font-bold">Company Requests</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Company detail changes users have proposed. Approve or reject each field individually.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                    {STATUS_FILTERS.map(f => (
                        <button
                            key={f.value}
                            type="button"
                            onClick={() => { setStatus(f.value); setPage(1); }}
                            className={cn(
                                'rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                                status === f.value
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* pr-3 keeps the cards clear of the scrollbar rather than sitting under it. */}
            <div className="mt-4 flex-1 overflow-auto pr-3">
                {loading && (
                    <div className="grid gap-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="rounded-lg border border-border bg-card p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="h-4 w-1/3 rounded bg-muted animate-pulse" />
                                        <div className="mt-2 h-3 w-1/2 rounded bg-muted animate-pulse" />
                                    </div>
                                    <div className="h-5 w-20 shrink-0 rounded-pill bg-muted animate-pulse" />
                                </div>
                                <div className="mt-3 space-y-1.5">
                                    <div className="h-12 w-full rounded-md bg-muted animate-pulse" />
                                    <div className="h-12 w-full rounded-md bg-muted animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && error && (
                    <div className="mt-12 text-center text-destructive">
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {!loading && !error && requests.length === 0 && (
                    <div className="mt-12 text-center text-muted-foreground">
                        <p className="text-lg font-medium">
                            {status === 'all'
                                ? 'No requests yet'
                                : `No ${STATUS_FILTERS.find(f => f.value === status)?.label.toLowerCase()} requests`}
                        </p>
                        <p className="mt-1 text-sm">Changes users propose from a company drawer land here.</p>
                    </div>
                )}

                {!loading && !error && requests.length > 0 && (
                    <div className="grid gap-3">
                        {requests.map(r => (
                            <RequestCard key={r.request_id} request={r} onReview={() => setReviewing(r)} />
                        ))}
                    </div>
                )}
            </div>

            {!error && totalPages > 1 && (
                <div className="shrink-0 mt-4 flex items-center justify-between border-t border-border pt-4">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <select
                                value={perPage}
                                onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                                className="h-9 rounded-md border border-input bg-background px-2 pr-8 text-sm appearance-none cursor-pointer"
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                        <span className="text-xs text-muted-foreground">per page</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            disabled={page === 1 || loading}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent cursor-pointer"
                        >
                            Prev
                        </button>

                        {[page - 1, page, page + 1]
                            .filter(p => p >= 1 && p <= totalPages)
                            .map(p => (
                                <button
                                    key={p}
                                    disabled={loading}
                                    onClick={() => setPage(p)}
                                    className={cn(
                                        'min-w-8 rounded-md border px-2 py-1.5 text-sm transition-colors cursor-pointer',
                                        p === page
                                            ? 'border-primary bg-primary text-primary-foreground font-semibold pointer-events-none'
                                            : 'border-border hover:bg-accent disabled:opacity-50'
                                    )}
                                >
                                    {p}
                                </button>
                            ))}

                        <button
                            disabled={page >= totalPages || loading}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {reviewing && (
                <ReviewRequestModal
                    request={reviewing}
                    onClose={() => setReviewing(null)}
                    onReviewed={handleReviewed}
                />
            )}
        </div>
    );
}
