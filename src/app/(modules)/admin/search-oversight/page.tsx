'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { ListFilter, ChevronDown, Check, Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchLog {
    type: 'ai' | 'structured';
    query: string;
    results: number;
    timestamp: string;
}

interface OversightResponse {
    searches: SearchLog[];
    total: number;
    total_pages: number;
    limit: number;
    offset: number;
    next_cursor: string | null;
    prev_cursor: string | null;
}

const TYPES = ['structured', 'ai'] as const;
type SearchType = typeof TYPES[number];

const TYPE_LABELS: Record<SearchType, string> = {
    structured: 'Structured',
    ai: 'AI',
};

const PRESET_LIMITS = [20, 50, 100] as const;

const FALLBACK_ERROR = 'Failed to load search logs';

function parseError(raw: unknown): string {
    if (!raw) return FALLBACK_ERROR;
    let value: unknown = raw;
    if (typeof raw === 'string') {
        try {
            value = JSON.parse(raw);
        } catch {
            return raw;
        }
    }
    if (value && typeof value === 'object') {
        const obj = value as { detail?: string; error?: { detail?: string } };
        return obj.error?.detail || obj.detail || FALLBACK_ERROR;
    }
    return FALLBACK_ERROR;
}

export default function SearchOversightPage() {
    const [searches, setSearches] = useState<SearchLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [limit, setLimit] = useState(20);
    const [typeFilter, setTypeFilter] = useState<SearchType | null>(null);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const [cursor, setCursor] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [prevCursor, setPrevCursor] = useState<string | null>(null);

    const [typePopoverOpen, setTypePopoverOpen] = useState(false);
    const [limitPopoverOpen, setLimitPopoverOpen] = useState(false);

    useEffect(() => {
        let active = true;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const params: Record<string, string | number> = { limit };
                if (cursor) params.cursor = cursor;
                if (typeFilter) params.type = typeFilter;
                if (from) params.from = new Date(from).toISOString();
                if (to) params.to = new Date(to).toISOString();
                const res = await axios.get('/api/admin/search-oversight', { params });
                if (!active) return;
                const data: OversightResponse = res.data.data;
                setSearches(data.searches ?? []);
                setTotal(data.total ?? 0);
                setTotalPages(data.total_pages ?? 0);
                setNextCursor(data.next_cursor ?? null);
                setPrevCursor(data.prev_cursor ?? null);
            } catch (err: unknown) {
                if (!active) return;
                if (axios.isAxiosError(err)) {
                    setError(parseError(err.response?.data?.error));
                } else {
                    setError('Failed to load search logs');
                }
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [limit, cursor, typeFilter, from, to]);

    const resetToFirstPage = () => {
        setCursor(null);
        setPage(1);
    };

    const handleNext = () => {
        if (!nextCursor) return;
        setCursor(nextCursor);
        setPage(p => p + 1);
    };

    const handlePrev = () => {
        if (page === 1) return;
        setCursor(prevCursor);
        setPage(p => Math.max(1, p - 1));
    };

    const applyLimit = (value: number) => {
        setLimit(value);
        resetToFirstPage();
        setLimitPopoverOpen(false);
    };

    const toggleType = (type: SearchType) => {
        setTypeFilter(prev => (prev === type ? null : type));
        resetToFirstPage();
        setTypePopoverOpen(false);
    };

    const fmtDate = (iso: string) => {
        const d = new Date(iso);
        const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${date}, ${time}`;
    };

    const hasFilters = typeFilter || from || to;
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="flex flex-col gap-4 px-6 pt-3" style={{ height: 'calc(100vh - 4rem)' }}>
            <h1 className="shrink-0 text-2xl font-bold">Search Oversight</h1>

            <div className="flex shrink-0 flex-wrap items-center gap-3">

                {/* Type filter */}
                <Popover open={typePopoverOpen} onOpenChange={setTypePopoverOpen}>
                    <PopoverTrigger asChild>
                        <button
                            className={cn(
                                'flex items-center gap-1.5 h-10 rounded-md border px-3 text-sm cursor-pointer transition-colors',
                                typeFilter ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-background hover:bg-accent'
                            )}
                        >
                            <ListFilter className="h-4 w-4" />
                            {typeFilter ? <span>{TYPE_LABELS[typeFilter]}</span> : 'Type'}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1" align="start">
                        {TYPES.map(type => (
                            <button
                                key={type}
                                onClick={() => toggleType(type)}
                                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                            >
                                {TYPE_LABELS[type]}
                                {typeFilter === type && <Check className="h-4 w-4 text-primary" />}
                            </button>
                        ))}
                        {typeFilter && (
                            <button
                                onClick={() => { setTypeFilter(null); resetToFirstPage(); setTypePopoverOpen(false); }}
                                className="mt-1 w-full rounded-md border-t border-border px-2 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                Clear
                            </button>
                        )}
                    </PopoverContent>
                </Popover>

                {/* Date range */}
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={from}
                        max={to || today}
                        onChange={(e) => { setFrom(e.target.value); resetToFirstPage(); }}
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <input
                        type="date"
                        value={to}
                        min={from || undefined}
                        max={today}
                        onChange={(e) => { setTo(e.target.value); resetToFirstPage(); }}
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background"
                    />
                </div>

                {hasFilters && (
                    <button
                        onClick={() => { setTypeFilter(null); setFrom(''); setTo(''); resetToFirstPage(); }}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                        <X className="h-4 w-4" /> Clear filters
                    </button>
                )}
            </div>

            {error && (
                <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            {!error && (
                <div className="flex-1 overflow-hidden rounded-lg border border-border">
                    <div className="h-full overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10">
                                <tr className="border-b border-border bg-muted">
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Query</th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Results</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 10 }).map((_, i) => (
                                        <tr key={i} className="border-b border-border">
                                            <td className="px-4 py-3"><div className="h-5 w-20 rounded-pill bg-muted animate-pulse" /></td>
                                            <td className="px-4 py-3"><div className="h-4 w-2/3 rounded bg-muted animate-pulse" /></td>
                                            <td className="px-4 py-3"><div className="ml-auto h-4 w-12 rounded bg-muted animate-pulse" /></td>
                                            <td className="px-4 py-3"><div className="h-4 w-32 rounded bg-muted animate-pulse" /></td>
                                        </tr>
                                    ))
                                ) : searches.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-16 text-center text-muted-foreground">
                                            <p className="text-lg font-medium">No searches found</p>
                                            <p className="mt-1 text-sm">Try adjusting your filters</p>
                                        </td>
                                    </tr>
                                ) : (
                                    searches.map((s, i) => (
                                        <tr key={i} className="border-b border-border hover:bg-accent/50 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="rounded-pill bg-muted px-2 py-0.5 text-xs font-medium">{TYPE_LABELS[s.type]}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="max-w-md truncate">{s.query || <span className="text-muted-foreground italic">All companies</span>}</p>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">{s.results.toLocaleString()}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{fmtDate(s.timestamp)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!error && (
                <div className="flex shrink-0 flex-wrap items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Popover open={limitPopoverOpen} onOpenChange={setLimitPopoverOpen}>
                            <PopoverTrigger asChild>
                                <button className="flex items-center gap-1.5 h-9 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent cursor-pointer">
                                    {limit}
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-1" align="start">
                                {PRESET_LIMITS.map(value => (
                                    <button
                                        key={value}
                                        onClick={() => applyLimit(value)}
                                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                                    >
                                        {value}
                                        {limit === value && <Check className="h-4 w-4 text-primary" />}
                                    </button>
                                ))}
                            </PopoverContent>
                        </Popover>
                        <span className="text-xs text-muted-foreground">per page · {total.toLocaleString()} searches</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            disabled={page === 1 || loading}
                            onClick={handlePrev}
                            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent cursor-pointer"
                        >
                            Prev
                        </button>
                        <span className="px-2 text-sm text-muted-foreground">
                            Page {page} of {Math.max(1, totalPages)}
                        </span>
                        <button
                            disabled={!nextCursor || loading}
                            onClick={handleNext}
                            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
