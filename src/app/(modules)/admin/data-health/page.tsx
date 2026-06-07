'use client';

import { Activity, TrendingUp, Database, Phone, Mail, Globe, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import axios from 'axios';

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

export default function AdminDataHealthPage() {
    const [data, setData] = useState<DataHealthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDataHealth = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get('/api/admin/data-health');
            setData(res.data.data);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.error || 'Failed to load data health metrics');
            } else {
                setError('Failed to load data health metrics');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDataHealth();
    }, []);

    if (error) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold">Data Health</h1>
                <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Data Health</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Database quality metrics</p>
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

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
                {/* Enrichment Success Rate */}
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-muted-foreground">Enrichment Success Rate</p>
                            {loading ? (
                                <div className="mt-2 h-7 w-20 rounded bg-muted animate-pulse" />
                            ) : (
                                <p className="mt-2 text-3xl font-bold text-emerald-500">
                                    {(data?.enrichment_success_rate ?? 0).toFixed(1)}%
                                </p>
                            )}
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                        </div>
                    </div>
                </div>

                {/* Stale Records */}
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-muted-foreground">Stale Records (90+ days)</p>
                            {loading ? (
                                <div className="mt-2 h-7 w-16 rounded bg-muted animate-pulse" />
                            ) : (
                                <p className="mt-2 text-3xl font-bold text-amber-500">
                                    {(data?.stale_records ?? 0).toLocaleString()}
                                </p>
                            )}
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Activity className="h-5 w-5 text-amber-500" />
                        </div>
                    </div>
                </div>

                {/* Total Companies */}
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-muted-foreground">Total Companies</p>
                            {loading ? (
                                <div className="mt-2 h-7 w-16 rounded bg-muted animate-pulse" />
                            ) : (
                                <p className="mt-2 text-3xl font-bold text-blue-500">
                                    {(data?.total_companies ?? 0).toLocaleString()}
                                </p>
                            )}
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Database className="h-5 w-5 text-blue-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Field Completeness */}
            {loading ? (
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <div className="h-6 w-40 rounded bg-muted animate-pulse mb-5" />
                    <div className="space-y-5">
                        {[1, 2, 3].map((i) => (
                            <div key={i}>
                                <div className="h-4 w-32 rounded bg-muted animate-pulse mb-2" />
                                <div className="h-2 rounded-full bg-muted animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h2 className="font-semibold text-lg mb-5">Field Completeness</h2>
                    <div className="space-y-5">
                        {data && [
                            {
                                label: 'Phone',
                                icon: Phone,
                                field: data.field_completeness.phone,
                                color: 'text-blue-500',
                                bgColor: 'bg-blue-500'
                            },
                            {
                                label: 'Email',
                                icon: Mail,
                                field: data.field_completeness.email,
                                color: 'text-violet-500',
                                bgColor: 'bg-violet-500'
                            },
                            {
                                label: 'Website',
                                icon: Globe,
                                field: data.field_completeness.website,
                                color: 'text-cyan-500',
                                bgColor: 'bg-cyan-500'
                            }
                        ].map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.label}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-8 h-8 rounded-lg ${item.bgColor}/10 flex items-center justify-center`}>
                                                <Icon className={`h-4 w-4 ${item.color}`} />
                                            </div>
                                            <span className="text-sm font-medium">{item.label}</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {item.field.count.toLocaleString()} / {item.field.total.toLocaleString()} ({(item.field.pct * 100).toFixed(2)}%)
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${item.bgColor}`}
                                            style={{ width: `${item.field.pct * 100}%` }}
                                        />
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
