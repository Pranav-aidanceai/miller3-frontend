'use client';

import axios from "axios";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

interface QueryHistoryItem {
  query_type: 'ai' | 'structured';
  raw_input: string | null;
  result_count: number;
  created_at: string;
  user_email: string | null;
}

type Scope = 'personal' | 'all';

export default function QueryHistoryPage() {

  const router = useRouter();
  const role = useSelector((state: RootState) => state.auth.role);
  const isAdmin = role === 'ADMIN';
  const [userQueries, setUserQueries] = useState<QueryHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(0);
  const [scope, setScope] = useState<Scope>('personal');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get('/api/query-history', {
          params: { page, limit: perPage, scope: isAdmin ? scope : undefined },
        });
        if (!active) return;
        const data = response?.data?.data;
        setUserQueries(data?.items ?? []);
        setTotalPages(data?.total_pages ?? 0);
      } catch (err: unknown) {
        if (!active) return;
        if (err instanceof axios.AxiosError) {
          setError(err.response?.data?.error ?? 'Failed to load query history');
        } else {
          setError('Failed to load query history');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [page, perPage, scope, isAdmin]);

  return (
    <div className="flex flex-col p-5" style={{ height: 'calc(100vh - 3rem)' }}>
      {/* Static header */}
      <div className="shrink-0 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Query History</h1>
        {isAdmin && (
          <div className="relative">
            <select
              value={scope}
              onChange={e => { setScope(e.target.value as Scope); setPage(1); }}
              className="h-9 rounded-md border border-input bg-background px-3 pr-8 text-sm appearance-none cursor-pointer"
            >
              <option value="personal">Personal</option>
              <option value="all">All</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        )}
      </div>

      <div className="mt-4 flex-1 overflow-auto">
        {loading && (
          <div data-tour="query-history-list" className="grid gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                  <div className="mt-3 flex flex-wrap gap-3">
                    <div className="h-3 w-12 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                  </div>
                </div>
                <div className="h-8 w-16 shrink-0 rounded-md bg-muted animate-pulse" />
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
            <p className="text-lg font-medium">No queries yet</p>
            <p className="mt-1 text-sm">Run a search to see it here</p>
          </div>
        )}

        {!loading && !error && userQueries.length > 0 && (
          <div data-tour="query-history-list" className="grid gap-3">
            {userQueries.map((q, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{q.raw_input ?? 'Structured search'}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {q.query_type === 'ai' ? 'AI' : 'Structured'}
                    </span>
                    <span>{q.result_count} result{q.result_count !== 1 ? 's' : ''}</span>
                    <span>{(() => {
                      const d = new Date(q.created_at);
                      const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(':', ' ');
                      return `${date}, ${time}`;
                    })()}</span>
                    {q.user_email && <span className="text-primary">{q.user_email}</span>}
                  </div>
                </div>
                {q.raw_input && (
                  <button
                    type="button"
                    data-tour="query-replay-button"
                    className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => {
                      router.push(`/ai-search?q=${encodeURIComponent(q.raw_input!)}`);
                    }}
                  >
                    Replay
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Static pagination footer — admins only */}
      {isAdmin && !error && totalPages > 1 && (
        <div className="shrink-0 mt-4 flex items-center justify-between border-t border-border pt-4">
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
