'use client';

import apiClient from '@/lib/api/client';
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { StructuredFilters, structuredFiltersToQuery, describeStructuredFilters } from "../search/replayParams";

interface QueryHistoryResponse {
  items: QueryHistoryItem[];
  total: number;
  total_pages: number;
  limit: number;
  offset: number;
  next_cursor: string | null;
  prev_cursor: string | null;
}

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

const PER_PAGE_OPTIONS = [25, 50, 100] as const;

export default function SearchHistoryView() {

  const router = useRouter();
  const [userQueries, setUserQueries] = useState<QueryHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [perPage, setPerPage] = useState(25);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [perPageOpen, setPerPageOpen] = useState(false);

  // /query-history is cursor-paginated: each response carries the cursors for
  // the pages either side of it, so `page` is only a display counter.
  const [cursor, setCursor] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursor, setPrevCursor] = useState<string | null>(null);

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
            limit: perPage,
            cursor: cursor ?? undefined,
            query_type: typeFilter === 'all' ? undefined : typeFilter,
          },
        });
        if (!active) return;
        const data: QueryHistoryResponse | undefined = response?.data?.data;
        setUserQueries(data?.items ?? []);
        setTotalPages(data?.total_pages ?? 0);
        setNextCursor(data?.next_cursor ?? null);
        setPrevCursor(data?.prev_cursor ?? null);
      } catch (err: unknown) {
        if (!active) return;
        setError(getErrorMessage(err, 'Failed to load search history'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [cursor, perPage, typeFilter]);

  // The list scrolls on its own, so a new page would otherwise open wherever
  // the previous one was left — usually somewhere down the list.
  const listScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listScrollRef.current?.scrollTo({ top: 0 });
  }, [cursor, perPage, typeFilter]);

  // Any change to the query invalidates the cursor chain — restart from the
  // first page rather than replaying a cursor cut for the previous filter.
  const resetToFirstPage = () => {
    setCursor(null);
    setPage(1);
  };

  const selectType = (value: TypeFilter) => {
    setTypeFilter(value);
    resetToFirstPage();
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

      {/* Pager above the list, matching Search Oversight: page-size popover on
          the left, arrow steppers on the right. */}
      {!error && (
        <div className="shrink-0 flex items-center justify-between border-b border-border py-3 px-6">
          <div className="flex items-center gap-2">
            <Popover open={perPageOpen} onOpenChange={setPerPageOpen}>
              <PopoverTrigger asChild>
                <button className="flex h-7 items-center gap-1 rounded-md border border-border bg-white px-2 text-xs hover:bg-accent cursor-pointer">
                  {perPage}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1" align="start">
                {PER_PAGE_OPTIONS.map(value => (
                  <button
                    key={value}
                    onClick={() => { setPerPage(value); resetToFirstPage(); setPerPageOpen(false); }}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                  >
                    {value}
                    {perPage === value && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
            <span className="text-xs font-normal text-[#B3B3B3]">Per Page</span>
            {totalPages > 0 && (
              <span className="text-xs font-normal text-[#B3B3B3]">
                Page {page} of {totalPages}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 1 || loading}
              onClick={handlePrev}
              aria-label="Previous page"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!nextCursor || loading}
              onClick={handleNext}
              aria-label="Next page"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div ref={listScrollRef} className="flex-1 overflow-auto">
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
                : describeStructuredFilters(q.filters_applied, q.raw_input);
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
    </div>
  );
}
