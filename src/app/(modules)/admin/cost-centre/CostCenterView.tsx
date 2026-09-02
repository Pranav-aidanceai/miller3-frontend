'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { Pencil, Check, X, Loader2, RefreshCw } from 'lucide-react';
import { getErrorMessage } from '@/lib/apiError';

interface CostResponse {
    hard_stop_threshold: number;
    serper: {
        serper_credits_remaining: number;
        serper_creds_used: number;
        serper_total_cost: number;
    } | null;
    openai: {
        total_requests: number;
        input_tokens: number;
        output_tokens: number;
        total_tokens: number;
        estimated_cost: number;
        period_days: number;
    } | null;
    enrichment: {
        count: number;
    } | null;
    grand_total_spend: number;
    latency_ms?: number;
}

const usd = (n: number) => `$${n?.toFixed(4)}`;

export default function CostCenterView() {
    const [data, setData] = useState<CostResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [editing, setEditing] = useState(false);
    const [thresholdInput, setThresholdInput] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchCost = useCallback(async () => {
        try {
            const res = await apiClient.get('/admin/cost');
            setData(res.data.data);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to load cost data'));
        } finally {
            setLoading(false);
        }
    }, []);

    const refresh = () => {
        setLoading(true);
        setError(null);
        void fetchCost();
    };

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await apiClient.get('/admin/cost');
                if (active) setData(res.data.data);
            } catch (err: unknown) {
                if (!active) return;
                setError(getErrorMessage(err, 'Failed to load cost data'));
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, []);

    const startEdit = () => {
        setThresholdInput(String(data?.hard_stop_threshold ?? ''));
        setEditing(true);
    };

    const cancelEdit = () => {
        setEditing(false);
        setThresholdInput('');
    };

    const saveThreshold = async () => {
        const value = Number(thresholdInput);
        if (!thresholdInput || Number.isNaN(value) || value < 0) return;
        setSaving(true);
        try {
            await apiClient.patch('/admin/cost', null, { params: { threshold: value } });
            setData(prev => (prev ? { ...prev, hard_stop_threshold: value } : prev));
            setEditing(false);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to update threshold'));
        } finally {
            setSaving(false);
        }
    };

    const serperTotal = data?.serper ? data.serper.serper_credits_remaining + data.serper.serper_creds_used : 0;
    const serperPercentUsed = data?.serper && serperTotal > 0 ? (data.serper.serper_creds_used / serperTotal) * 100 : 0;

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-heading text-2xl font-bold">Cost Center</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Usage and spend across services</p>
                </div>
                <button
                    type="button"
                    onClick={refresh}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
                >
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div className="rounded-xl border border-border bg-card p-5 shadow-sm md:col-span-3">
                            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                            <div className="mt-4 h-10 w-40 rounded bg-muted animate-pulse" />
                        </div>
                        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                            <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                            <div className="mt-4 h-8 w-16 rounded bg-muted animate-pulse" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className={cn('rounded-xl border border-border bg-card p-5 shadow-sm', i === 1 && 'md:col-span-2')}>
                                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                                <div className="mt-3 h-8 w-20 rounded bg-muted animate-pulse" />
                                <div className="mt-3 h-3 w-28 rounded bg-muted animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : data && (
                <>
                    {/* Row 1: Grand Total Spend + Hard-Stop Threshold, matching the
                        Figma "Cost Center" reference exactly (fileKey
                        pskj0D4uvWBsvAB5Csxyt4, node 450:14497) — the wide spend
                        figure sits beside the editable threshold, not below it. */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:col-span-3">
                            <p className="text-sm font-semibold text-primary">Grand Total Spend</p>
                            <p className="mt-2 font-heading text-4xl font-bold tracking-tight text-primary">{usd(data.grand_total_spend)}</p>
                        </div>

                        <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
                            <div>
                                <p className="text-sm font-semibold">Hard-Stop Threshold</p>
                                <p className="mt-1 text-[10px] font-light text-muted-foreground">Spend limit that halts enrichment when reached</p>
                            </div>

                            {editing ? (
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                        <input
                                            autoFocus
                                            type="text"
                                            inputMode="decimal"
                                            value={thresholdInput}
                                            onChange={e => setThresholdInput(e.target.value.replace(/[^0-9.]/g, ''))}
                                            onKeyDown={e => { if (e.key === 'Enter') saveThreshold(); if (e.key === 'Escape') cancelEdit(); }}
                                            className="h-9 w-24 rounded-md border border-input bg-background pl-6 pr-2 text-sm font-mono outline-none focus:ring-1 focus:ring-ring"
                                        />
                                    </div>
                                    <button
                                        onClick={saveThreshold}
                                        disabled={saving || !thresholdInput}
                                        className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    </button>
                                    <button
                                        onClick={cancelEdit}
                                        disabled={saving}
                                        className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-accent disabled:opacity-40 cursor-pointer"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="mt-3 flex items-end justify-between">
                                    <span className="font-heading text-3xl font-bold tracking-tight text-destructive">${data.hard_stop_threshold.toFixed(0)}</span>
                                    <button
                                        onClick={startEdit}
                                        className="flex h-7 items-center gap-1 rounded-md border border-primary px-2 text-xs font-medium text-primary hover:bg-primary/10 cursor-pointer"
                                    >
                                        <Pencil className="h-3 w-3" /> Edit
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Serper Credits + Open AI (cost & token breakdown combined
                        in one card, per Figma) + Enrichment. */}
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                        {data.serper && (
                            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                                <p className="text-sm font-semibold text-brand-accent">Serper Credits</p>
                                <p className="mt-2 font-heading text-3xl font-bold tracking-tight text-brand-accent">{data.serper.serper_credits_remaining.toLocaleString()}</p>
                                <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                                    <span>of {serperTotal.toLocaleString()} total</span>
                                    <span>{serperPercentUsed.toFixed(1)}% used</span>
                                </div>
                                <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full rounded-full bg-brand-accent transition-all" style={{ width: `${Math.min(100, serperPercentUsed)}%` }} />
                                </div>
                                <p className="mt-2 text-right text-sm text-muted-foreground">
                                    <span className="font-medium text-brand-accent">{usd(data.serper.serper_total_cost)}</span> spent
                                </p>
                            </div>
                        )}

                        {data.openai && (
                            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row md:col-span-2">
                                <div className="flex flex-1 flex-col justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-brand-secondary">Open AI</p>
                                        <p className="mt-2 font-heading text-3xl font-bold tracking-tight text-brand-secondary">{usd(data.openai.estimated_cost)}</p>
                                    </div>
                                    <p className="mt-3 text-sm text-muted-foreground">
                                        Estimated over {data.openai.period_days} day{data.openai.period_days === 1 ? '' : 's'}
                                    </p>
                                </div>
                                <div className="flex flex-1 flex-col justify-between gap-2 sm:pl-4">
                                    <div className="text-sm">
                                        <div className="flex justify-between py-1 border-b border-t"><span className="text-muted-foreground">Total Tokens</span><span className="font-medium text-brand-secondary">{data.openai.total_tokens.toLocaleString()}</span></div>
                                        <div className="flex justify-between py-1.5"><span className="text-muted-foreground">Input Tokens</span><span className="font-medium text-brand-secondary">{data.openai.input_tokens.toLocaleString()}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Output Tokens</span><span className="font-medium text-brand-secondary">{data.openai.output_tokens.toLocaleString()}</span></div>
                                    </div>
                                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Requests</span><span className="font-medium text-brand-secondary">{data.openai.total_requests.toLocaleString()}</span></div>
                                </div>
                            </div>
                        )}

                        {data.enrichment && (
                            <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col gap-10">
                                <p className="text-sm font-semibold">Enrichment</p>
                                <div>
                                    <p className="mt-2 font-heading text-3xl font-bold tracking-tight text-primary">{data.enrichment.count.toLocaleString()}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">Total Enrichments</p>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
