'use client';

import { getErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import apiClient from '@/lib/api/client';
import { RefreshCw } from 'lucide-react';

interface FieldCompleteness {
    count: number;
    total: number;
    pct: number;
}

interface DataHealthResponse {
    enrichment_success_rate: number;
    stale_records: number;
    total_companies: number;
    field_completeness: {
        phone: FieldCompleteness;
        email: FieldCompleteness;
        website: FieldCompleteness;
    };
}

// Field rows in Figma order (fileKey pskj0D4uvWBsvAB5Csxyt4, node 452:16054):
// Phone → primary (deep teal), Email → brand-accent (blue), Website →
// brand-secondary (discovery teal) — same three colors used for the stat
// tiles above them.
const FIELD_ROWS: { key: keyof DataHealthResponse['field_completeness']; label: string; text: string; bar: string }[] = [
    { key: 'phone', label: 'Phone', text: 'text-primary', bar: 'bg-primary' },
    { key: 'email', label: 'Email', text: 'text-brand-accent', bar: 'bg-brand-accent' },
    { key: 'website', label: 'Website', text: 'text-brand-secondary', bar: 'bg-brand-secondary' },
];

export default function DataHealthView() {
    const [data, setData] = useState<DataHealthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDataHealth = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get('/admin/data-health');
            setData(res.data.data);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to load data health metrics'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await apiClient.get('/admin/data-health');
                if (active) setData(res.data.data);
            } catch (err: unknown) {
                if (!active) return;
                setError(getErrorMessage(err, 'Failed to load data health metrics'));
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, []);

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-heading text-2xl font-bold">Data Health</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Data base quality metrics</p>
                </div>
                <button
                    type="button"
                    onClick={fetchDataHealth}
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

            {/* Summary Cards — plain label + colored figure, no icon badge,
                matching the Figma reference exactly. */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-4">
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <p className="text-sm font-semibold">Enrichment Success Rate</p>
                    {loading ? (
                        <div className="mt-2 h-9 w-24 rounded bg-muted animate-pulse" />
                    ) : (
                        <p className="mt-2 font-heading text-3xl font-bold tracking-tight text-primary">
                            {(data?.enrichment_success_rate ?? 0).toFixed(1)}%
                        </p>
                    )}
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <p className="text-sm font-semibold">Stale Records (90+ days)</p>
                    {loading ? (
                        <div className="mt-2 h-9 w-16 rounded bg-muted animate-pulse" />
                    ) : (
                        <p className="mt-2 font-heading text-3xl font-bold tracking-tight text-brand-secondary">
                            {(data?.stale_records ?? 0).toLocaleString()}
                        </p>
                    )}
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <p className="text-sm font-semibold">Total Companies</p>
                    {loading ? (
                        <div className="mt-2 h-9 w-24 rounded bg-muted animate-pulse" />
                    ) : (
                        <p className="mt-2 font-heading text-3xl font-bold tracking-tight text-brand-accent">
                            {(data?.total_companies ?? 0).toLocaleString()}
                        </p>
                    )}
                </div>
            </div>

            {/* Field Completeness */}
            {loading ? (
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <div className="h-5 w-40 rounded bg-muted animate-pulse mb-5" />
                    <div className="space-y-5">
                        {[1, 2, 3].map((i) => (
                            <div key={i}>
                                <div className="h-4 w-32 rounded bg-muted animate-pulse mb-2" />
                                <div className="h-1.5 rounded-full bg-muted animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h2 className="font-heading text-base font-semibold mb-5">Field Completeness</h2>
                    <div className="space-y-4">
                        {data && FIELD_ROWS.map(({ key, label, text, bar }) => {
                            const field = data.field_completeness[key];
                            return (
                                <div key={key}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className={cn('text-sm font-semibold', text)}>{label}</span>
                                        <span className="text-sm text-muted-foreground">
                                            {field.count.toLocaleString()} ({field.pct.toFixed(2)}%)
                                        </span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                        <div className={cn('h-full rounded-full', bar)} style={{ width: `${Math.min(100, field.pct)}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
