'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { DollarSign, Zap, Cpu, Database, ShieldAlert, Pencil, Check, X, Loader2, RefreshCw } from 'lucide-react';

interface CostResponse {
    hard_stop_threshold: number;
    serper: {
        serper_credits_remaining: number;
        serper_creds_used: number;
        serper_total_cost: number;
    };
    openai: {
        input_tokens: number;
        output_tokens: number;
        total_tokens: number;
        input_cost: number;
        output_cost: number;
        total_cost: number;
    };
    enrichment: {
        count: number;
    };
    grand_total_spend: number;
}

const usd = (n: number) => `$${n.toFixed(4)}`;

export default function AdminCostsPage() {
    const [data, setData] = useState<CostResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [editing, setEditing] = useState(false);
    const [thresholdInput, setThresholdInput] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchCost = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/cost');
            setData(res.data.data);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.error || 'Failed to load cost data');
            } else {
                setError('Failed to load cost data');
            }
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
                const res = await axios.get('/api/admin/cost');
                if (active) setData(res.data.data);
            } catch (err: unknown) {
                if (!active) return;
                if (axios.isAxiosError(err)) {
                    setError(err.response?.data?.error || 'Failed to load cost data');
                } else {
                    setError('Failed to load cost data');
                }
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
            await axios.patch('/api/admin/cost', null, { params: { threshold: value } });
            setData(prev => (prev ? { ...prev, hard_stop_threshold: value } : prev));
            setEditing(false);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.error || 'Failed to update threshold');
            } else {
                setError('Failed to update threshold');
            }
        } finally {
            setSaving(false);
        }
    };

    const serperTotal = data ? data.serper.serper_credits_remaining + data.serper.serper_creds_used : 0;
    const serperPercentUsed = data && serperTotal > 0 ? (data.serper.serper_creds_used / serperTotal) * 100 : 0;

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Cost Center</h1>
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
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                            <div className="mt-3 h-8 w-20 rounded bg-muted animate-pulse" />
                            <div className="mt-3 h-3 w-28 rounded bg-muted animate-pulse" />
                        </div>
                    ))}
                </div>
            ) : data && (
                <>
                    {/* Cost factor tiles */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {/* Grand total spend */}
                        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-xl font-medium text-muted-foreground">Grand Total Spend</p>
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                                    <DollarSign className="h-4 w-4 text-emerald-500" />
                                </div>
                            </div>
                            <p className="mt-3 text-3xl font-bold text-emerald-500">{usd(data.grand_total_spend)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">across all services</p>
                        </div>

                        {/* Serper */}
                        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-xl font-medium text-muted-foreground">Serper Credits</p>
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                                    <Zap className="h-4 w-4 text-blue-500" />
                                </div>
                            </div>
                            <p className="mt-3 text-3xl font-bold text-blue-500">{data.serper.serper_credits_remaining.toLocaleString()}</p>
                            <p className="mt-1 text-xs text-muted-foreground">of {serperTotal.toLocaleString()} total</p>
                            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, serperPercentUsed)}%` }} />
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{serperPercentUsed.toFixed(1)}% used · {usd(data.serper.serper_total_cost)} spent</p>
                        </div>

                        {/* OpenAI */}
                        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-xl font-medium text-muted-foreground">OpenAI</p>
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                                    <Cpu className="h-4 w-4 text-violet-500" />
                                </div>
                            </div>
                            <p className="mt-3 text-3xl font-bold text-violet-500">{usd(data.openai.total_cost)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{data.openai.total_tokens.toLocaleString()} tokens</p>
                            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                <div className="flex justify-between"><span>Input ({data.openai.input_tokens.toLocaleString()})</span><span className="font-mono">{usd(data.openai.input_cost)}</span></div>
                                <div className="flex justify-between"><span>Output ({data.openai.output_tokens.toLocaleString()})</span><span className="font-mono">{usd(data.openai.output_cost)}</span></div>
                            </div>
                        </div>

                        {/* Enrichment */}
                        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-xl font-medium text-muted-foreground">Enrichment</p>
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                                    <Database className="h-4 w-4 text-amber-500" />
                                </div>
                            </div>
                            <p className="mt-3 text-3xl font-bold text-amber-500">{data.enrichment.count.toLocaleString()}</p>
                            <p className="mt-1 text-xs text-muted-foreground">total enrichments</p>
                        </div>
                    </div>

                    {/* Hard-stop threshold (editable) */}
                    <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                                    <ShieldAlert className="h-5 w-5 text-destructive" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Hard-Stop Threshold</p>
                                    <p className="text-xs text-muted-foreground">Spend limit that halts enrichment when reached</p>
                                </div>
                            </div>

                            {editing ? (
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                        <input
                                            autoFocus
                                            type="text"
                                            inputMode="decimal"
                                            value={thresholdInput}
                                            onChange={e => setThresholdInput(e.target.value.replace(/[^0-9.]/g, ''))}
                                            onKeyDown={e => { if (e.key === 'Enter') saveThreshold(); if (e.key === 'Escape') cancelEdit(); }}
                                            className="h-9 w-28 rounded-md border border-input bg-background pl-6 pr-2 text-sm font-mono outline-none focus:ring-1 focus:ring-ring"
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
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl font-bold font-mono">${data.hard_stop_threshold.toFixed(2)}</span>
                                    <button
                                        onClick={startEdit}
                                        className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm hover:bg-accent cursor-pointer"
                                    >
                                        <Pencil className="h-3.5 w-3.5" /> Edit
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
