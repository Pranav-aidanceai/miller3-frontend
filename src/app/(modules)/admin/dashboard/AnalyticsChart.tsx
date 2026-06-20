'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Loader2, RefreshCw, type LucideIcon } from 'lucide-react';
import { getErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { Chart, type ChartOptions } from '@highcharts/react';
import type * as Highcharts from 'highcharts';
import FilterPopover, { type FilterDef } from './FilterPopover';

type PiePoint = { name: string; y: number | null };

interface ChartSeries {
  name: string;
  data: (number | null)[] | PiePoint[];
  colorByPoint?: boolean;
}

export interface ChartApiResponse {
  chart_type: string;
  title?: string;
  filters_applied?: Record<string, unknown>;
  xAxis?: { categories: string[] };
  series: ChartSeries[];
}

// Palette aligned with the dashboard stat cards.
const SERIES_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
];

// Format date-like category labels (e.g. "2026-06", "2026-05-19", "2026-05-19 14:00")
// for tooltip headers; leave non-date labels ("24h", "Active", …) untouched.
function formatCategory(label: string): string {
  let m = /^(\d{4})-(\d{2})$/.exec(label);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString(undefined, {
      month: 'short',
      year: 'numeric',
    });
  }
  m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(label);
  if (m) {
    const d = new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4] ?? 0),
      Number(m[5] ?? 0)
    );
    return m[4]
      ? d.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return label;
}

const formatValue = (v: number | null | undefined) =>
  typeof v === 'number' ? v.toLocaleString() : '—';

interface TooltipPoint {
  key?: string | number;
  y?: number | null;
  color?: string;
  series: { name: string };
}

interface TooltipContext extends TooltipPoint {
  percentage?: number;
  points?: TooltipPoint[];
}

function buildOptions(data: ChartApiResponse): ChartOptions {
  const isLine = data.chart_type === 'line';
  const isPie = data.chart_type === 'pie';
  // The API labels grouped category charts as "bar"; render them as vertical columns.
  const seriesType = isPie ? 'pie' : isLine ? 'line' : 'column';
  const showLegend = !isPie && data.series.length > 1;

  return {
    chart: {
      type: seriesType,
      backgroundColor: 'transparent',
      spacing: [8, 8, 8, 8],
      style: { fontFamily: 'inherit' },
    },
    colors: SERIES_COLORS,
    title: { text: undefined },
    credits: { enabled: false },
    accessibility: { enabled: false },
    xAxis: {
      categories: data.xAxis?.categories,
      visible: !isPie,
      lineColor: 'rgba(100,116,139,0.25)',
      tickColor: 'rgba(100,116,139,0.25)',
      labels: {
        style: { color: '#64748b', fontSize: '11px' },
      },
    },
    yAxis: {
      title: { text: undefined },
      visible: !isPie,
      gridLineColor: 'rgba(100,116,139,0.15)',
      labels: { style: { color: '#64748b', fontSize: '11px' } },
    },
    legend: {
      enabled: showLegend,
      itemStyle: { color: '#334155', fontWeight: '500', fontSize: '12px' },
      itemHoverStyle: { color: '#64748b' },
    },
    tooltip: {
      shared: isLine,
      useHTML: true,
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderRadius: 8,
      style: { color: '#0f172a', fontSize: '12px' },
      formatter: function (this: Highcharts.Point): string {
        const ctx = this as unknown as TooltipContext;
        if (isPie) {
          const pct = typeof ctx.percentage === 'number' ? ` (${ctx.percentage.toFixed(1)}%)` : '';
          return `<span style="font-weight:600">${String(ctx.key ?? '')}</span><br/>${formatValue(ctx.y)}${pct}`;
        }
        const points = ctx.points ?? [{ key: ctx.key, y: ctx.y, color: ctx.color, series: ctx.series }];
        const header = formatCategory(String(points[0].key ?? ''));
        const body = points
          .map(
            (pt) =>
              `<div><span style="color:${pt.color ?? '#94a3b8'}">●</span> ${pt.series.name}: <b>${formatValue(pt.y)}</b></div>`
          )
          .join('');
        return `<div style="font-weight:600;margin-bottom:2px">${header}</div>${body}`;
      },
    },
    plotOptions: {
      series: { connectNulls: false },
      column: {
        borderRadius: 3,
        borderWidth: 0,
        pointPadding: 0.05,
        groupPadding: 0.12,
      },
      line: {
        lineWidth: 2,
        marker: { radius: 2, symbol: 'circle' },
      },
      pie: {
        innerSize: '55%',
        borderWidth: 0,
        dataLabels: {
          enabled: true,
          format: '{point.name}: {point.percentage:.0f}%',
          style: { color: '#334155', fontSize: '11px', fontWeight: '500', textOutline: 'none' },
        },
      },
    },
    series: data.series.map((s) => ({
      ...s,
      type: seriesType,
    })) as ChartOptions['series'],
  };
}

interface AnalyticsChartProps {
  endpoint: string;
  params?: Record<string, string>;
  filters?: FilterDef[];
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  height?: number;
  wide?: boolean;
  /** Pick the chart payload out of the API response (e.g. nested `highcharts.by_role`). */
  select?: (raw: unknown) => ChartApiResponse;
}

export default function AnalyticsChart({
  endpoint,
  params,
  filters,
  icon: Icon,
  iconColor = 'text-blue-500',
  iconBg = 'bg-blue-500/10',
  title,
  subtitle,
  height = 340,
  wide = false,
  select,
}: AnalyticsChartProps) {
  const [options, setOptions] = useState<ChartOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-chart filter state, seeded from each filter's default.
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() =>
    Object.fromEntries((filters ?? []).map((f) => [f.key, f.default]))
  );

  // Merge static params with the active filters, dropping "All"/omit sentinels.
  const requestParams = useMemo(() => {
    const merged: Record<string, string> = { ...params };
    for (const f of filters ?? []) {
      const value = filterValues[f.key] ?? f.default;
      if (value === '' || value === f.omitWhen) continue;
      merged[f.key] = value;
    }
    return merged;
  }, [params, filters, filterValues]);

  const paramsKey = JSON.stringify(requestParams);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await axios.get(endpoint, { params: requestParams });
        if (ignore) return;
        const raw = res.data.data;
        setOptions(buildOptions(select ? select(raw) : (raw as ChartApiResponse)));
        setError(null);
      } catch (err: unknown) {
        if (ignore) return;
        setError(getErrorMessage(err, 'Failed to load chart'));
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, paramsKey, reloadKey]);

  // Loading is flipped on in the event handlers (not the effect) so the
  // overlay shows immediately on refresh / filter changes.
  const refresh = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const applyFilters = (next: Record<string, string>) => {
    setLoading(true);
    setFilterValues(next);
  };

  return (
    <div
      className={cn(
        'min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm overflow-hidden',
        wide && 'xl:col-span-2'
      )}
    >
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
        <div
          className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 text-sm text-red-600"
          style={{ height }}
        >
          {error}
        </div>
      ) : (
        <div className="relative" style={{ height }}>
          {options ? (
            <Chart options={options} containerProps={{ style: { height: `${height}px`, width: '100%' } }} />
          ) : (
            <div className="h-full w-full rounded-lg bg-muted/50" />
          )}

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
    </div>
  );
}
