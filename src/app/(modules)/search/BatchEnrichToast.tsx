'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import apiClient from '@/lib/api/client';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Loader2, XCircle, X } from 'lucide-react';
import { store } from '@/store/store';
import { updateCreditsRemaining } from '@/store/slices/authSlice';

type Phase = 'connecting' | 'running' | 'finalizing' | 'completed' | 'failed';

/**
 * The backend keeps working for a short while after the last progress frame,
 * so the enriched rows aren't readable the instant the batch reports done.
 * We hold the toast — and the refetch it triggers — for this long before
 * calling the run complete.
 */
const FINALIZE_DELAY_SECONDS = Number(process.env.NEXT_PUBLIC_BATCH_ENRICHMENT_DELAY_SECONDS) || 30;

/**
 * The socket authenticates with a single-use ticket, so every (re)connect
 * fetches a fresh one. A dropped connection is retried with exponential
 * backoff (1s, 2s, 4s, 8s, 8s) before the run is reported as interrupted;
 * the budget resets once frames flow again.
 */
const MAX_RECONNECT_ATTEMPTS = 5;
const MAX_RECONNECT_DELAY_MS = 8000;

/**
 * Once reconnects are exhausted, fall back to polling the REST status endpoint
 * until the batch reaches a terminal state. Gives up after this many
 * consecutive failed polls (that aren't simply the browser being offline).
 */
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_FAILURES = 6;

type ConnectionNote = 'reconnecting' | 'polling' | null;

/** Close codes the backend uses when it refuses the socket. */
const WS_CLOSE_UNAUTHORIZED = 4401; // missing, expired or already-used ticket
const WS_CLOSE_FORBIDDEN = 4403;    // not the batch owner

/**
 * A single company's result, emitted as soon as its frame arrives so the list
 * behind the toast can flip that row while the rest of the batch is still
 * running. `null` means the frame didn't carry the field — keep what you have.
 */
export interface EnrichRecordUpdate {
    companyId: string;
    /** Per-record status (`record_status`), falling back to the frame status. */
    status: string | null;
    succeeded: boolean;
    hasEmail: boolean | null;
    hasPhone: boolean | null;
    hasWebsite: boolean | null;
}

interface BatchEnrichToastProps {
    toastId: string | number;
    batchId: string;
    total: number;
    onComplete?: () => void;
    onRecord?: (update: EnrichRecordUpdate) => void;
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

function pickBoolean(obj: Record<string, unknown>, keys: string[]): boolean | undefined {
    for (const k of keys) {
        const v = obj[k];
        if (typeof v === 'boolean') return v;
        if (typeof v === 'string') {
            const s = v.trim().toLowerCase();
            if (s === 'true') return true;
            if (s === 'false') return false;
        }
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

export default function BatchEnrichToast({ toastId, batchId, total: initialTotal, onComplete, onRecord }: BatchEnrichToastProps) {

    const onCompleteRef = useRef(onComplete);
    const onRecordRef = useRef(onRecord);
    useEffect(() => { onCompleteRef.current = onComplete; onRecordRef.current = onRecord; });

    const [phase, setPhase] = useState<Phase>('connecting');
    const [total, setTotal] = useState(initialTotal);
    const [processed, setProcessed] = useState(0);
    const [percent, setPercent] = useState(0);
    const [detail, setDetail] = useState<string | null>(null);
    const [summary, setSummary] = useState({ succeeded: 0, failed: 0, duplicate: 0 });
    const [secondsLeft, setSecondsLeft] = useState(FINALIZE_DELAY_SECONDS);
    const [connectionNote, setConnectionNote] = useState<ConnectionNote>(null);

    useEffect(() => {
        let cancelled = false;
        let settled = false;
        let processedCount = 0;
        let totalCount = initialTotal;
        let succeededCount = 0;
        let failedCount = 0;
        let duplicateCount = 0;

        let finalizeTimer: number | undefined;
        let countdownTimer: number | undefined;
        let dismissTimer: number | undefined;

        let ws: WebSocket | null = null;
        let connecting = false;
        let reconnectTimer: number | undefined;
        let pollTimer: number | undefined;
        let polling = false;
        let pollFailures = 0;
        let reconnectAttempts = 0;
        // A 4401 gets one immediate retry with a fresh ticket; re-armed once
        // frames arrive, so a later expiry can be retried again.
        let ticketRetryUsed = false;
        // Frames may be re-sent after a reconnect; count each company once.
        const seenCompanies = new Set<string>();

        const finish = () => {
            if (cancelled) return;
            setPhase('completed');
            onCompleteRef.current?.();
            dismissTimer = window.setTimeout(() => toast.dismiss(toastId), 4000);
        };

        const settle = (next: Phase, message: string | null) => {
            if (cancelled || settled) return;
            settled = true;
            window.clearTimeout(reconnectTimer);
            window.clearTimeout(pollTimer);
            setConnectionNote(null);
            setDetail(message);
            if (next !== 'completed') {
                setPhase(next);
                return;
            }
            setProcessed(totalCount);
            setPercent(100);
            if (FINALIZE_DELAY_SECONDS <= 0) {
                finish();
                return;
            }
            // Hold here so the backend can finish writing the batch; only then
            // do we report completion and let the list refetch.
            setPhase('finalizing');
            setSecondsLeft(FINALIZE_DELAY_SECONDS);
            countdownTimer = window.setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
            finalizeTimer = window.setTimeout(() => {
                window.clearInterval(countdownTimer);
                finish();
            }, FINALIZE_DELAY_SECONDS * 1000);
        };

        const applyProgress = (explicitPercent?: number) => {
            const t = totalCount > 0 ? totalCount : 1;
            const p = Math.min(processedCount, t);
            setProcessed(p);
            setTotal(totalCount > 0 ? totalCount : initialTotal);
            let pct = explicitPercent;
            // A frame may report progress as a 0–1 fraction; our own
            // processed/total ratio is already 0–100 (1 of 100 is 1%, not 100%).
            if (pct != null && pct > 0 && pct <= 1) pct = pct * 100;
            if (pct == null) pct = (p / t) * 100;
            setPercent(Math.max(0, Math.min(100, Math.round(pct))));
        };

        const handle = (frame: unknown) => {
            if (frame == null || typeof frame !== 'object') return;
            let msg = frame as Record<string, unknown>;
            for (const wrap of ['data', 'payload', 'message']) {
                const inner = msg[wrap];
                if (inner && typeof inner === 'object') msg = { ...msg, ...(inner as Record<string, unknown>) };
            }
            if ((pickString(msg, ['type']) ?? '').toLowerCase() === 'credits') {
                const remaining = pickNumber(msg, ['remaining', 'credits_left', 'remaining_credits']);
                if (remaining != null) store.dispatch(updateCreditsRemaining(remaining));
                return;
            }

            if (settled) return;

            const statusWord = (pickString(msg, ['status', 'state', 'event', 'type', 'phase']) ?? '').toLowerCase();
            const isRecordEvent = 'company_id' in msg || 'companyId' in msg;
            const companyId = pickString(msg, ['company_id', 'companyId']);
            const firstSeen = !companyId || !seenCompanies.has(companyId);

            if (isRecordEvent && firstSeen && (statusWord === '' || SUCCESS_WORDS.includes(statusWord) || FAILURE_WORDS.includes(statusWord))) {
                processedCount += 1;
                if (companyId) seenCompanies.add(companyId);
            }

            // Each progress frame carries the company it just finished, with
            // flags for what was found. Hand it up so the row can be patched
            // now rather than waiting for the batch to finish and refetch.
            if (companyId) {
                const recordStatus = pickString(msg, ['record_status', 'recordStatus']) ?? null;
                const outcome = (recordStatus ?? statusWord).toLowerCase();
                onRecordRef.current?.({
                    companyId,
                    status: recordStatus,
                    succeeded: SUCCESS_WORDS.includes(outcome),
                    hasEmail: pickBoolean(msg, ['has_email', 'hasEmail']) ?? null,
                    hasPhone: pickBoolean(msg, ['has_phone', 'has_mobile_number', 'hasPhone', 'hasMobileNumber']) ?? null,
                    hasWebsite: pickBoolean(msg, ['has_website', 'hasWebsite']) ?? null,
                });
            }

            const explicitTotal = pickNumber(msg, ['total', 'total_records', 'totalRecords', 'count']);
            if (explicitTotal != null && explicitTotal > 0) totalCount = explicitTotal;

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
            if (totalCount > 0 && processedCount >= totalCount) {
                settle('completed', null);
            }
        };

        // Status payload: { status, total_records, processed, succeeded, failed,
        // duplicate_count, percentage, completed_at, cancelled_at, … }. The
        // percentage is derived from processed/total rather than trusting
        // `percentage`, whose 0–100 scale the frame heuristic in applyProgress
        // would misread at ≤1%.
        const applyStatus = (body: Record<string, unknown>) => {
            const t = pickNumber(body, ['total_records']);
            if (t != null && t > 0) totalCount = t;
            const p = pickNumber(body, ['processed']);
            if (p != null) processedCount = Math.max(processedCount, p);
            succeededCount = Math.max(succeededCount, pickNumber(body, ['succeeded']) ?? 0);
            failedCount = Math.max(failedCount, pickNumber(body, ['failed']) ?? 0);
            duplicateCount = Math.max(duplicateCount, pickNumber(body, ['duplicate_count']) ?? 0);
            setSummary({ succeeded: succeededCount, failed: failedCount, duplicate: duplicateCount });
            applyProgress();
            setPhase(prev => (prev === 'connecting' ? 'running' : prev));

            const status = (pickString(body, ['status']) ?? '').toLowerCase();
            const wasCancelled = !!pickString(body, ['cancelled_at']) || status === 'cancelled' || status === 'canceled';
            if (wasCancelled) {
                settle('failed', 'Enrichment was cancelled.');
            } else if (FAILURE_WORDS.includes(status)) {
                settle('failed', 'Enrichment failed.');
            } else if (SUCCESS_WORDS.includes(status) || !!pickString(body, ['completed_at'])) {
                settle('completed', null);
            }
        };

        const poll = async () => {
            if (cancelled || settled) return;
            const next = () => {
                if (cancelled || settled) return;
                pollTimer = window.setTimeout(() => { void poll(); }, POLL_INTERVAL_MS);
            };
            // Offline: skip this tick without counting it as a failure.
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                next();
                return;
            }
            try {
                const res = await apiClient.get(`/batch-enrichment/${encodeURIComponent(batchId)}/status`);
                if (cancelled) return;
                pollFailures = 0;
                const body = res.data?.data;
                if (body && typeof body === 'object') applyStatus(body as Record<string, unknown>);
            } catch (err) {
                if (cancelled) return;
                const status = axios.isAxiosError(err) ? err.response?.status : undefined;
                if (status === 401 || status === 403) {
                    settle('failed', "You don't have access to this batch's progress.");
                    return;
                }
                if (status === 404) {
                    settle('failed', 'This batch could not be found.');
                    return;
                }
                pollFailures += 1;
                if (pollFailures >= MAX_POLL_FAILURES) {
                    settle('failed', 'Lost track of progress. Enrichment continues in the background — refresh the list later to see results.');
                    return;
                }
            }
            next();
        };

        // The socket couldn't be re-established: switch to polling for the
        // rest of the run. Per-company row updates aren't available this way;
        // the list refetches via onComplete once the batch finishes.
        const startPolling = () => {
            if (cancelled || settled || polling) return;
            polling = true;
            window.clearTimeout(reconnectTimer);
            setConnectionNote('polling');
            void poll();
        };

        const scheduleReconnect = () => {
            if (cancelled || settled) return;
            setConnectionNote('reconnecting');
            // Offline: don't burn attempts — the `online` listener resumes.
            if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                startPolling();
                return;
            }
            const delay = Math.min(1000 * 2 ** reconnectAttempts, MAX_RECONNECT_DELAY_MS);
            reconnectAttempts += 1;
            window.clearTimeout(reconnectTimer);
            reconnectTimer = window.setTimeout(() => { void connect(); }, delay);
        };

        const connect = async () => {
            if (cancelled || settled || connecting || ws) return;
            connecting = true;
            window.clearTimeout(reconnectTimer);

            // A ticket is single-use and expires in 60s: fetch one right before
            // every connection attempt, never reuse.
            let url: string | undefined;
            try {
                const res = await apiClient.post(`/batch-enrichment/${encodeURIComponent(batchId)}/ws-ticket`, {});
                url = res.data?.data?.ws_url;
            } catch (err) {
                connecting = false;
                if (cancelled) return;
                const status = axios.isAxiosError(err) ? err.response?.status : undefined;
                if (status === 401 || status === 403) {
                    settle('failed', "You don't have access to this batch's progress.");
                } else if (status === 404) {
                    settle('failed', 'This batch could not be found.');
                } else {
                    scheduleReconnect();
                }
                return;
            }
            connecting = false;
            if (cancelled || settled) return;
            if (!url) {
                scheduleReconnect();
                return;
            }

            let socket: WebSocket;
            try {
                socket = new WebSocket(url);
            } catch {
                settle('failed', 'Could not open the progress connection.');
                return;
            }
            ws = socket;

            socket.onopen = () => {
                if (cancelled) return;
                setConnectionNote(null);
                setPhase(prev => (prev === 'connecting' ? 'running' : prev));
            };
            socket.onmessage = (ev) => {
                if (cancelled) return;
                // Frames are flowing: the connection is healthy again.
                reconnectAttempts = 0;
                ticketRetryUsed = false;
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
            // Every error is followed by a close event; recovery happens there.
            socket.onerror = () => {};
            socket.onclose = (ev) => {
                if (ws !== socket) return;
                ws = null;
                if (cancelled || settled) return;
                if (ev.code === WS_CLOSE_FORBIDDEN) {
                    settle('failed', "You don't have access to this batch's progress.");
                } else if (ev.code === WS_CLOSE_UNAUTHORIZED) {
                    if (ticketRetryUsed) {
                        settle('failed', 'The progress connection was refused.');
                        return;
                    }
                    ticketRetryUsed = true;
                    void connect();
                } else {
                    scheduleReconnect();
                }
            };
        };

        // Reconnect straight away when the network returns or the tab wakes,
        // instead of waiting out the backoff.
        const resumeNow = () => {
            if (cancelled || settled || polling || ws || connecting) return;
            if (document.visibilityState === 'hidden') return;
            window.clearTimeout(reconnectTimer);
            void connect();
        };
        window.addEventListener('online', resumeNow);
        document.addEventListener('visibilitychange', resumeNow);

        void connect();

        return () => {
            cancelled = true;
            window.removeEventListener('online', resumeNow);
            document.removeEventListener('visibilitychange', resumeNow);
            window.clearTimeout(reconnectTimer);
            window.clearTimeout(pollTimer);
            window.clearTimeout(finalizeTimer);
            window.clearTimeout(dismissTimer);
            window.clearInterval(countdownTimer);
            const socket = ws;
            ws = null;
            if (!socket) return;
            if (socket.readyState === WebSocket.CONNECTING) {
                socket.onopen = () => socket.close();
            } else {
                socket.close();
            }
        };
    }, [batchId, toastId, initialTotal]);

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
                            : phase === 'finalizing'
                                ? 'Finishing up'
                                : 'Batch enrichment started'}
                </p>
            </div>

            <Progress value={percent} className="h-1.5" />

            <p className="text-xs text-muted-foreground">
                {phase === 'failed'
                    ? (detail ?? 'Something went wrong.')
                    : phase === 'completed'
                        ? completionText
                        : phase === 'finalizing'
                            ? `Collecting and organizing enriched data${secondsLeft > 0 ? ` (${secondsLeft}s)` : ''}…`
                            : `${processed} of ${total} compan${total === 1 ? 'y' : 'ies'} enriched (${percent}%)${connectionNote === 'reconnecting' ? ' · Reconnecting…' : connectionNote === 'polling' ? ' · Checking periodically' : ''}`}
            </p>
        </div>
    );
}
