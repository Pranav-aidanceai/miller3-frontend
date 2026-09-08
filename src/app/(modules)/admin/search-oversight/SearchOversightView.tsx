'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import apiClient from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getErrorMessage } from '@/lib/apiError';
import { BsSliders } from 'react-icons/bs';

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

// The oversight endpoint is cursor-paginated and accepts no sort parameter, so
// the Sort control reorders the rows of the current page only.
const SORTS = ['newest', 'oldest', 'most-results', 'fewest-results'] as const;
type Sort = typeof SORTS[number];

const SORT_LABELS: Record<Sort, string> = {
    newest: 'Newest first',
    oldest: 'Oldest first',
    'most-results': 'Most results',
    'fewest-results': 'Fewest results',
};

// Same trigger treatment as the User Management filters (Figma fileKey
// pskj0D4uvWBsvAB5Csxyt4): rounded outline, sliders glyph, brand fill once the
// filter is active.
const filterTrigger = (active: boolean) =>
    cn(
        'flex items-center gap-1.5 h-9 rounded-xl border px-3.5 text-sm cursor-pointer transition-colors',
        active ? 'border-primary bg-primary/10 text-primary' : 'border-[#CFCFCF] bg-white hover:bg-accent'
    );

export default function SearchOversightView() {
    const [searches, setSearches] = useState<SearchLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [limit, setLimit] = useState(20);
    const [typeFilter, setTypeFilter] = useState<SearchType | null>(null);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [sort, setSort] = useState<Sort>('newest');

    const [cursor, setCursor] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [prevCursor, setPrevCursor] = useState<string | null>(null);

    const [typePopoverOpen, setTypePopoverOpen] = useState(false);
    const [datePopoverOpen, setDatePopoverOpen] = useState(false);
    const [sortPopoverOpen, setSortPopoverOpen] = useState(false);
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
                const res = await apiClient.get('/admin/search-oversight', { params });
                if (!active) return;
                const data: OversightResponse = res.data.data;
                setSearches(data.searches ?? []);
                setTotal(data.total ?? 0);
                setNextCursor(data.next_cursor ?? null);
                setPrevCursor(data.prev_cursor ?? null);
            } catch (err: unknown) {
                if (!active) return;
                setError(getErrorMessage(err, 'Failed to load search logs'));
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [limit, cursor, typeFilter, from, to]);

    // The table body scrolls on its own, so a new page or filter would otherwise
    // open wherever the previous list was left — usually at the bottom.
    const tableScrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        tableScrollRef.current?.scrollTo({ top: 0 });
    }, [limit, cursor, typeFilter, from, to, sort]);

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

    const applySort = (value: Sort) => {
        setSort(value);
        setSortPopoverOpen(false);
    };

    const fmtDate = (iso: string) => {
        const d = new Date(iso);
        const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${date}, ${time}`;
    };

    const fmtShortDate = (value: string) =>
        new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });

    const dateLabel = from && to
        ? `${fmtShortDate(from)} - ${fmtShortDate(to)}`
        : from
            ? `From ${fmtShortDate(from)}`
            : to
                ? `Until ${fmtShortDate(to)}`
                : 'DD-MM-YY';

    const rows = useMemo(() => {
        const list = [...searches];
        switch (sort) {
            case 'oldest':
                return list.sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
            case 'most-results':
                return list.sort((a, b) => b.results - a.results);
            case 'fewest-results':
                return list.sort((a, b) => a.results - b.results);
            default:
                return list.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
        }
    }, [searches, sort]);

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="h-full max-h-screen overflow-auto">
            <div className="py-3 px-4 border-b">
                <h1 className="font-heading text-2xl font-bold">Search Oversight</h1>

                {/* Result count + filters, matching the Figma "Search Oversight"
                    reference (fileKey pskj0D4uvWBsvAB5Csxyt4, node 453:16464): the
                    total is a prominent brand-accent figure on the left with the
                    Type / date / Sort triggers opposite it. */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 font-light">
                    <p className="text-sm font-semibold text-brand-accent">
                        {loading ? '—' : total.toLocaleString()} Search Result{total === 1 ? '' : 's'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Type filter */}
                        <Popover open={typePopoverOpen} onOpenChange={setTypePopoverOpen}>
                            <PopoverTrigger asChild>
                                <button className={filterTrigger(!!typeFilter)}>
                                    <BsSliders className="h-3.5 w-3.5" />
                                    {typeFilter ? <span>{TYPE_LABELS[typeFilter]}</span> : 'Type'}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-1" align="end">
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

                        {/* Date range — the Figma shows a single "DD-MM-YY" trigger,
                            so the from/to pair lives inside the popover. */}
                        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                            <PopoverTrigger asChild>
                                <button className={filterTrigger(!!(from || to))}>
                                    <BsSliders className="h-3.5 w-3.5" />
                                    {dateLabel}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-60 p-3" align="end">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-muted-foreground">From</label>
                                    <input
                                        type="date"
                                        value={from}
                                        max={to || today}
                                        onChange={(e) => { setFrom(e.target.value); resetToFirstPage(); }}
                                        className="h-9 rounded-xl border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background"
                                    />
                                    <label className="mt-1 text-xs text-muted-foreground">To</label>
                                    <input
                                        type="date"
                                        value={to}
                                        min={from || undefined}
                                        max={today}
                                        onChange={(e) => { setTo(e.target.value); resetToFirstPage(); }}
                                        className="h-9 rounded-xl border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background"
                                    />
                                    {(from || to) && (
                                        <button
                                            onClick={() => { setFrom(''); setTo(''); resetToFirstPage(); setDatePopoverOpen(false); }}
                                            className="mt-2 w-full rounded-md border-t border-border px-2 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Sort — page-scoped, see SORTS above */}
                        <Popover open={sortPopoverOpen} onOpenChange={setSortPopoverOpen}>
                            <PopoverTrigger asChild>
                                <button className={filterTrigger(sort !== 'newest')}>
                                    <ArrowUpDown className="h-3.5 w-3.5" />
                                    {sort === 'newest' ? 'Sort' : SORT_LABELS[sort]}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-1" align="end">
                                {SORTS.map(value => (
                                    <button
                                        key={value}
                                        onClick={() => applySort(value)}
                                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                                    >
                                        {SORT_LABELS[value]}
                                        {sort === value && <Check className="h-4 w-4 text-primary" />}
                                    </button>
                                ))}
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mt-6 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {!error && (
                <>
                    <div className="flex items-center justify-between py-3 px-4 border-b">
                        <div className="flex items-center gap-2">
                            <Popover open={limitPopoverOpen} onOpenChange={setLimitPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <button className="flex h-7 items-center gap-1 rounded-md border border-border bg-white px-2 text-xs hover:bg-accent cursor-pointer">
                                        {limit}
                                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
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
                            <span className="text-xs text-[#B3B3B3] font-normal">Per Page</span>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={page === 1 || loading}
                                onClick={handlePrev}
                                aria-label="Previous page"
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-border disabled:opacity-40 hover:bg-accent cursor-pointer"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                disabled={!nextCursor || loading}
                                onClick={handleNext}
                                aria-label="Next page"
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-border disabled:opacity-40 hover:bg-accent cursor-pointer"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-hidden">
                        <div ref={tableScrollRef} className="overflow-y-auto max-h-[62vh]">
                            <table className="w-full text-sm border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-white">
                                        <th className="px-4 py-2 text-left font-medium text-muted-foreground border-collapse border-b border-r">Type</th>
                                        <th className="px-4 py-2 text-left font-medium text-muted-foreground border-collapse border-b border-r">Query</th>
                                        <th className="px-4 py-2 text-right font-medium text-muted-foreground border-collapse border-b border-r">Result</th>
                                        <th className="px-4 py-2 text-left font-medium text-muted-foreground border-collapse border-b">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        Array.from({ length: 9 }).map((_, i) => (
                                            <tr key={i} className="border-b border-border">
                                                <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-muted animate-pulse" /></td>
                                                <td className="px-4 py-3"><div className="h-4 w-2/3 rounded bg-muted animate-pulse" /></td>
                                                <td className="px-4 py-3"><div className="ml-auto h-4 w-12 rounded bg-muted animate-pulse" /></td>
                                                <td className="px-4 py-3"><div className="h-4 w-32 rounded bg-muted animate-pulse" /></td>
                                            </tr>
                                        ))
                                    ) : rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-16 text-center text-muted-foreground">
                                                <p className="text-lg font-medium">No searches found</p>
                                                <p className="mt-1 text-sm">Try adjusting your filters</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((s, i) => (
                                            <tr key={i} className="hover:bg-accent/50 transition-colors">
                                                <td className="px-4 py-3 border-collapse border-b border-r whitespace-nowrap font-medium">
                                                    {TYPE_LABELS[s.type]}
                                                </td>
                                                <td className="px-4 py-3 border-collapse border">
                                                    <p className="max-w-md truncate">{s.query || <span className="text-muted-foreground italic">All companies</span>}</p>
                                                </td>
                                                <td className="px-4 py-3 border-collapse border text-right">{s.results.toLocaleString()}</td>
                                                <td className="px-4 py-3 border-collapse border-b whitespace-nowrap text-muted-foreground">{fmtDate(s.timestamp)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
