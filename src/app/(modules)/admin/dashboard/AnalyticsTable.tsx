'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, type LucideIcon } from 'lucide-react';
import { getErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import FilterPopover, { type FilterDef } from './FilterPopover';

export interface TableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  className?: string;
  render?: (row: T) => ReactNode;
}

export interface TableData<T> {
  rows: T[];
  page?: number;
  totalPages?: number;
  total?: number;
}

interface AnalyticsTableProps<T> {
  endpoint: string;
  params?: Record<string, string>;
  filters?: FilterDef[];
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  columns: TableColumn<T>[];
  select: (raw: unknown) => TableData<T>;
  /** Show prev/next controls and send a `page` param. */
  paginated?: boolean;
}

export default function AnalyticsTable<T>({
  endpoint,
  params,
  filters,
  icon: Icon,
  iconColor = 'text-blue-500',
  iconBg = 'bg-blue-500/10',
  title,
  subtitle,
  columns,
  select,
  paginated = false,
}: AnalyticsTableProps<T>) {
  const [data, setData] = useState<TableData<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [filterValues, setFilterValues] = useState<Record<string, string>>(() =>
    Object.fromEntries((filters ?? []).map((f) => [f.key, f.default]))
  );

  const requestParams = useMemo(() => {
    const merged: Record<string, string> = { ...params };
    for (const f of filters ?? []) {
      const value = filterValues[f.key] ?? f.default;
      if (value === '' || value === f.omitWhen) continue;
      merged[f.key] = value;
    }
    if (paginated) merged.page = String(page);
    return merged;
  }, [params, filters, filterValues, paginated, page]);

  const paramsKey = JSON.stringify(requestParams);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await axios.get(endpoint, { params: requestParams });
        if (ignore) return;
        setData(select(res.data.data));
        setError(null);
      } catch (err: unknown) {
        if (ignore) return;
        setError(getErrorMessage(err, 'Failed to load data'));
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, paramsKey, reloadKey]);

  const refresh = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const applyFilters = (next: Record<string, string>) => {
    setLoading(true);
    setPage(1);
    setFilterValues(next);
  };

  const goToPage = (next: number) => {
    setLoading(true);
    setPage(next);
  };

  const currentPage = data?.page ?? page;
  const totalPages = data?.totalPages ?? 1;
  const rows = data?.rows ?? [];

  return (
    <div className="min-w-0 xl:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn('w-9 h-9 shrink-0 rounded-lg flex items-center justify-center', iconBg)}>
            <Icon className={cn('h-4 w-4', iconColor)} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {filters && filters.length > 0 && (
            <FilterPopover filters={filters} values={filterValues} onApply={applyFilters} />
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 text-sm text-red-600">
          {error}
        </div>
      ) : (
        <div className="relative min-h-40">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        'px-3 py-2 font-medium whitespace-nowrap',
                        col.align === 'right' ? 'text-right' : 'text-left'
                      )}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={columns.length} className="px-3 py-10 text-center text-muted-foreground">
                      No records found
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => (
                    <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn(
                            'px-3 py-2.5 align-top',
                            col.align === 'right' ? 'text-right tabular-nums' : 'text-left',
                            col.className
                          )}
                        >
                          {col.render
                            ? col.render(row)
                            : String((row as Record<string, unknown>)[col.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-card/60 backdrop-blur-[1px]">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading…
              </div>
            </div>
          )}
        </div>
      )}

      {paginated && !error && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            Page {currentPage} of {totalPages}
            {typeof data?.total === 'number' && ` · ${data.total.toLocaleString()} records`}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={loading || currentPage <= 1}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={loading || currentPage >= totalPages}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
