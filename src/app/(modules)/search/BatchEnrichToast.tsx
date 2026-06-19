'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Loader2, XCircle, X } from 'lucide-react';

type Phase = 'connecting' | 'running' | 'completed' | 'failed';

interface BatchEnrichToastProps {
    toastId: string | number;
    wsUrl: string;
    total: number;
}

/**
 * We don't control the WebSocket payload shape, so every field below is read
 * defensively. Raw frames are logged as `[batch-enrich ws]` — inspect the
 * console against the live backend and tighten these key lists if needed.
 */
const SUCCESS_WORDS = ['completed', 'complete', 'done', 'finished', 'success', 'succeeded'];
const FAILURE_WORDS = ['failed', 'failure', 'error', 'cancelled', 'canceled', 'interrupted', 'aborted'];

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
    for (const k of keys) {
        const v = obj[k];
        if (typeof v === 'number' && !Number.isNaN(v)) return v;
        if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
    }
    return undefined;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
    for (const k of keys) {
        const v = obj[k];
        if (typeof v === 'string' && v.trim() !== '') return v.trim();
    }
    return undefined;
}

export default function BatchEnrichToast({ toastId, wsUrl, total: initialTotal }: BatchEnrichToastProps) {
    const [phase, setPhase] = useState<Phase>('connecting');
    const [total, setTotal] = useState(initialTotal);
    const [processed, setProcessed] = useState(0);
    const [percent, setPercent] = useState(0);
    const [detail, setDetail] = useState<string | null>(null);
    const [summary, setSummary] = useState({ succeeded: 0, failed: 0, duplicate: 0 });

    useEffect(() => {
        // All connection state is local to this effect run so React StrictMode's
        // dev double-mount (which tears down the first socket) can't leak into the
        // real one. `cancelled` = this run is being cleaned up; `settled` = batch
        // reached a terminal state on this connection.
        let cancelled = false;
        let settled = false;
        let processedCount = 0;
        let totalCount = initialTotal;
        let succeededCount = 0;
        let failedCount = 0;
        let duplicateCount = 0;

        let ws: WebSocket;
        try {
            ws = new WebSocket(wsUrl);
        } catch {
            // Defer out of the effect body so we don't setState synchronously.
            queueMicrotask(() => {
                if (cancelled) return;
                setPhase('failed');
                setDetail('Could not open the progress connection.');
            });
            return;
        }

        const settle = (next: Phase, message: string | null) => {
            if (cancelled || settled) return;
            settled = true;
            setPhase(next);
            setDetail(message);
            if (next === 'completed') {
                setProcessed(totalCount);
                setPercent(100);
                // Leave the success state visible briefly, then clear it.
                window.setTimeout(() => toast.dismiss(toastId), 4000);
            }
        };

        const applyProgress = (explicitPercent?: number) => {
            const t = totalCount > 0 ? totalCount : 1;
            const p = Math.min(processedCount, t);
            setProcessed(p);
            setTotal(totalCount > 0 ? totalCount : initialTotal);
            let pct = explicitPercent;
            if (pct == null) pct = (p / t) * 100;
            // Some backends send 0-1 fractions instead of 0-100.
            if (pct > 0 && pct <= 1) pct = pct * 100;
            setPercent(Math.max(0, Math.min(100, Math.round(pct))));
        };

        const handle = (frame: unknown) => {
            if (settled) return;
            if (frame == null || typeof frame !== 'object') return;
            let msg = frame as Record<string, unknown>;
            // Unwrap common envelopes: { data: {...} } / { payload: {...} }.
            for (const wrap of ['data', 'payload', 'message']) {
                const inner = msg[wrap];
                if (inner && typeof inner === 'object') msg = { ...msg, ...(inner as Record<string, unknown>) };
            }

            const statusWord = (pickString(msg, ['status', 'state', 'event', 'type', 'phase']) ?? '').toLowerCase();
            const isRecordEvent = 'company_id' in msg || 'companyId' in msg;

            // Track per-record completions when the frame is about a single company.
            if (isRecordEvent && (statusWord === '' || SUCCESS_WORDS.includes(statusWord) || FAILURE_WORDS.includes(statusWord))) {
                processedCount += 1;
            }

            const explicitTotal = pickNumber(msg, ['total', 'total_records', 'totalRecords', 'count']);
            if (explicitTotal != null && explicitTotal > 0) totalCount = explicitTotal;

            // Outcome counts are cumulative running totals; keep the highest seen.
            const succeeded = pickNumber(msg, ['succeeded', 'success_count', 'completed_count']) ?? 0;
            const failed = pickNumber(msg, ['failed', 'failed_count', 'error_count']) ?? 0;
            const duplicate = pickNumber(msg, ['duplicate', 'duplicates', 'duplicate_count', 'skipped']) ?? 0;
            succeededCount = Math.max(succeededCount, succeeded);
            failedCount = Math.max(failedCount, failed);
            duplicateCount = Math.max(duplicateCount, duplicate);
            setSummary({ succeeded: succeededCount, failed: failedCount, duplicate: duplicateCount });

            const explicitProcessed = pickNumber(msg, ['processed', 'completed', 'done', 'current', 'index'])
                ?? (succeeded || failed ? succeeded + failed : undefined);
            if (explicitProcessed != null) processedCount = Math.max(processedCount, explicitProcessed);

            const explicitPercent = pickNumber(msg, ['progress', 'percent', 'percentage']);

            applyProgress(explicitPercent);
            setPhase(prev => (prev === 'connecting' ? 'running' : prev));

            // A non-record frame carrying a terminal word is the batch outcome.
            if (!isRecordEvent && statusWord) {
                if (FAILURE_WORDS.includes(statusWord)) {
                    settle('failed', pickString(msg, ['detail', 'message', 'error', 'reason']) ?? 'Enrichment failed.');
                    return;
                }
                if (SUCCESS_WORDS.includes(statusWord)) {
                    settle('completed', null);
                    return;
                }
            }

            // Fallback: all records accounted for with no explicit terminal frame.
            if (totalCount > 0 && processedCount >= totalCount) {
                settle('completed', null);
            }
        };

        ws.onopen = () => {
            if (!cancelled) setPhase(prev => (prev === 'connecting' ? 'running' : prev));
        };
        ws.onmessage = (ev) => {
            if (cancelled) return;
            let parsed: unknown;
            try {
                parsed = JSON.parse(ev.data);
            } catch {
                // eslint-disable-next-line no-console
                console.debug('[batch-enrich ws] non-JSON frame', ev.data);
                return;
            }
            // eslint-disable-next-line no-console
            console.debug('[batch-enrich ws]', parsed);
            handle(parsed);
        };
        ws.onerror = () => { if (!cancelled) settle('failed', 'Connection error during enrichment.'); };
        ws.onclose = () => { if (!cancelled) settle('failed', 'Connection closed before completion.'); };

        return () => {
            cancelled = true;
            // Closing a still-CONNECTING socket logs "closed before the connection
            // is established"; wait for it to open, then close cleanly.
            if (ws.readyState === WebSocket.CONNECTING) {
                ws.onopen = () => ws.close();
            } else {
                ws.close();
            }
        };
    }, [wsUrl, toastId, initialTotal]);

    const settled = phase === 'completed' || phase === 'failed';

    const completionText = [
        `${summary.succeeded} enriched`,
        `${summary.failed} failed`,
        ...(summary.duplicate > 0 ? [`${summary.duplicate} duplicate`] : []),
    ].join(' · ');

    return (
        <div className="relative flex w-full flex-col gap-2 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg">
            {settled && (
                <button
                    type="button"
                    aria-label="Dismiss"
                    onClick={() => toast.dismiss(toastId)}
                    className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}

            <div className="flex items-center gap-2 pr-5">
                {phase === 'completed'
                    ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    : phase === 'failed'
                        ? <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
                        : <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />}
                <p className="text-sm font-medium leading-snug">
                    {phase === 'completed'
                        ? 'Batch enrichment complete'
                        : phase === 'failed'
                            ? 'Batch enrichment interrupted'
                            : 'Batch enrichment started'}
                </p>
            </div>

            <Progress value={percent} className="h-1.5" />

            <p className="text-xs text-muted-foreground">
                {phase === 'failed'
                    ? (detail ?? 'Something went wrong.')
                    : phase === 'completed'
                        ? completionText
                        : `${processed} of ${total} compan${total === 1 ? 'y' : 'ies'} enriched (${percent}%)`}
            </p>
        </div>
    );
}
