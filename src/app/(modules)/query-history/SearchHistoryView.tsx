'use client';

import apiClient from '@/lib/api/client';
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { getErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { StructuredFilters, structuredFiltersToQuery, describeStructuredFilters } from "../search/replayParams";

interface QueryHistoryItem {
  query_type: 'ai' | 'structured';
  raw_input: string | null;
  filters_applied: StructuredFilters | null;
  result_count: number;
  created_at: string;
  user_email: string | null;
}

const TYPE_FILTERS = [
  { value: 'all' as const, label: 'All' },
  { value: 'structured' as const, label: 'Search' },
  { value: 'ai' as const, label: 'AI Search' },
];
type TypeFilter = typeof TYPE_FILTERS[number]['value'];

export default function SearchHistoryView() {

  const router = useRouter();
  const role = useSelector((state: RootState) => state.auth.role);
  const isAdmin = role === 'ADMIN';
  const [userQueries, setUserQueries] = useState<QueryHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const replay = (q: QueryHistoryItem) => {
    if (q.query_type === 'structured') {
      const query = structuredFiltersToQuery(q.filters_applied ?? {});
      router.push(query ? `/search?${query}` : '/search');
      return;
    }
    router.push(`/ai-search?q=${encodeURIComponent(q.raw_input!)}`);
  };

  const canReplay = (q: QueryHistoryItem) =>
    q.query_type === 'structured'
      ? !!structuredFiltersToQuery(q.filters_applied ?? {})
      : !!q.raw_input;

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get('/query-history', {
          params: {
            page,
            limit: perPage,
            query_type: typeFilter === 'all' ? undefined : typeFilter,
          },
        });
        if (!active) return;
        const data = response?.data?.data;
        setUserQueries(data?.items ?? []);
        setTotalPages(data?.total_pages ?? 0);
      } catch (err: unknown) {
        if (!active) return;
        setError(getErrorMessage(err, 'Failed to load search history'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [page, perPage, typeFilter]);

  const selectType = (value: TypeFilter) => {
    setTypeFilter(value);
    setPage(1);
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 3rem)' }}>
      <div className="shrink-0 flex items-center justify-between gap-4 border-b border-border py-3 px-6">
        <h1 className="font-heading text-sm font-normal">Search History</h1>
        <div className="flex items-center gap-2">
          {TYPE_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => selectType(value)}
              className={cn(
                'rounded-full border px-3 py-1 text-sm font-normal font-heading transition-colors cursor-pointer',
                typeFilter === value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:bg-accent'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && (
          <div data-tour="query-history-list">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start justify-between gap-4 border-b border-border py-4">
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                  <div className="mt-2 h-3 w-48 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-4 w-24 shrink-0 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-12 text-center text-destructive">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && userQueries.length === 0 && (
          <div className="mt-12 text-center text-muted-foreground">
            <p className="text-lg font-medium">No searches yet</p>
            <p className="mt-1 text-sm">Run a search to see it here</p>
          </div>
        )}

        {!loading && !error && userQueries.length > 0 && (
          <div data-tour="query-history-list">
            {userQueries.map((q, i) => {
              const title = q.query_type === 'ai'
                ? (q.raw_input ?? 'AI search')
                : describeStructuredFilters(q.filters_applied);
              const dateTime = (() => {
                const d = new Date(q.created_at);
                const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                return `${date}, ${time}`;
              })();

              return (
                <div key={i} className="flex items-start justify-between gap-4 border-b border-border py-3 px-6 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-normal font-heading wrap-break-word">{title}</p>
                    <p className="mt-1 text-xs font-heading font-light text-muted-foreground wrap-break-word">
                      {q.result_count} result{q.result_count !== 1 ? 's' : ''}, {dateTime}
                      {q.user_email && <span className="text-primary"> · {q.user_email}</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {q.query_type === 'ai' && (
                      <span className="rounded-full bg-ai/10 px-2.5 py-0.5 text-sm font-normal font-heading text-ai">AI Search</span>
                    )}
                    {canReplay(q) && (
                      <button
                        type="button"
                        data-tour="query-replay-button"
                        className="text-xs font-normal font-heading text-primary underline underline-offset-2 hover:opacity-80 cursor-pointer"
                        onClick={() => replay(q)}
                      >
                        View Search Data
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Static pagination footer — admins only */}
      {isAdmin && !error && totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-between border-t border-border py-3 px-6">
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
              .map(p => {
                const isActive = p === page;
                return (
                  <button
                    key={p}
                    disabled={loading}
                    onClick={() => setPage(p)}
                    className={cn(
                      'min-w-8 rounded-md border px-2 py-1.5 text-sm transition-colors cursor-pointer',
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground font-semibold pointer-events-none'
                        : 'border-border hover:bg-accent disabled:opacity-50'
                    )}
                  >
                    {p}
                  </button>
                );
              })}

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
    </div>
  );
}
