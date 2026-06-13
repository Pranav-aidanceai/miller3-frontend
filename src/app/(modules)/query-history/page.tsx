'use client';

import axios from "axios";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface QueryHistoryItem {
  id: string;
  query_type: 'ai' | 'structured';
  raw_input: string;
  result_count: number;
  is_zero_result: boolean;
  execution_time_ms: number;
  created_at: string;
}

export default function QueryHistoryPage() {

  const router = useRouter();
  const [userQueries, setUserQueries] = useState<QueryHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQueryHistory = async () => {
      try {
        const response = await axios.get('/api/query-history');
        const items: QueryHistoryItem[] = response?.data?.data?.items ?? [];
        setUserQueries(items);
      } catch (err: unknown) {
        if (err instanceof axios.AxiosError) {
          setError(err.response?.data?.error ?? 'Failed to load query history');
        } else {
          setError('Failed to load query history');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchQueryHistory();
  }, []);

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold">Query History</h1>
      <p className="text-muted-foreground mt-1">
        {loading ? 'Loading…' : `Your last ${userQueries.length} searches`}
      </p>

      {loading && (
        <div className="mt-12 text-center text-muted-foreground">
          <p className="text-sm">Loading query history…</p>
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
        <div data-tour="query-history-list" className="mt-6 grid gap-3">
          {userQueries.map(q => (
            <div
              key={q.id}
              className="rounded-lg border border-border bg-card p-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{q.raw_input}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    {q.query_type === 'ai' ? '✨ AI' : '🔍 Structured'}
                  </span>
                  <span>{q.result_count} result{q.result_count !== 1 ? 's' : ''}</span>
                  <span>{(() => {
                    const d = new Date(q.created_at);
                    const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(':', ' ');
                    return `${date}, ${time}`;
                  })()}</span>
                </div>
              </div>
              <button
                type="button"
                data-tour="query-replay-button"
                className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent transition-colors cursor-pointer"
                onClick={() => {
                  router.push(`/ai-search?q=${encodeURIComponent(q.raw_input)}`);
                }}
              >
                Replay
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
