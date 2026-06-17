'use client';

import { BarChart3, LineChart, PieChart, Users, ListOrdered, AlertTriangle, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import AnalyticsChart, { type ChartApiResponse } from './AnalyticsChart';
import AnalyticsTable, { type TableColumn } from './AnalyticsTable';
import type { FilterDef } from './FilterPopover';

interface UserDistributionResponse {
  highcharts: {
    by_role: ChartApiResponse;
    by_status: ChartApiResponse;
  };
}

interface TopQueryRow {
  query: string;
  count: number;
  unique_users: number;
  avg_result_count: number;
  zero_result_count: number;
  last_searched_at: string;
}

interface FailedQueryRow {
  id: string;
  query_type: string;
  raw_input: string | null;
  filters_applied: boolean | Record<string, unknown> | null;
  execution_time_ms: number | null;
  result_count: number;
  created_at: string;
}

const formatDateTime = (s: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatNum = (v: number | null | undefined) =>
  typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—';

const QueryTypeBadge = ({ type }: { type: string }) => (
  <span
    className={cn(
      'inline-block rounded px-1.5 py-0.5 text-xs font-medium capitalize',
      type === 'ai' ? 'bg-violet-500/10 text-violet-600' : 'bg-blue-500/10 text-blue-600'
    )}
  >
    {type}
  </span>
);

const renderFiltersApplied = (fa: FailedQueryRow['filters_applied']) => {
  if (fa == null || fa === false) return <span className="text-muted-foreground">—</span>;
  if (fa === true) return <span>Applied</span>;
  const count = Object.keys(fa).length;
  return count ? (
    <span>{`${count} filter${count > 1 ? 's' : ''}`}</span>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
};

const PERIOD_FILTER: FilterDef = {
  key: 'period',
  label: 'Period',
  default: '30d',
  options: [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
  ],
};

const QUERY_TYPE_FILTER: FilterDef = {
  key: 'query_type',
  label: 'Query type',
  default: 'all',
  omitWhen: 'all',
  options: [
    { value: 'all', label: 'AI + Structured' },
    { value: 'ai', label: 'AI only' },
    { value: 'structured', label: 'Structured only' },
  ],
};

const TRENDS_FILTERS: FilterDef[] = [
  PERIOD_FILTER,
  {
    key: 'granularity',
    label: 'Granularity',
    default: 'day',
    options: [
      { value: 'hour', label: 'Hourly' },
      { value: 'day', label: 'Daily' },
      { value: 'week', label: 'Weekly' },
    ],
  },
];

const USER_DISTRIBUTION_FILTERS: FilterDef[] = [
  {
    key: 'role',
    label: 'Role',
    default: 'all',
    omitWhen: 'all',
    options: [
      { value: 'all', label: 'All roles' },
      { value: 'free', label: 'Free' },
      { value: 'standard', label: 'Standard' },
      { value: 'premium', label: 'Premium' },
      { value: 'admin', label: 'Admin' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    default: 'all',
    omitWhen: 'all',
    options: [
      { value: 'all', label: 'All statuses' },
      { value: 'active', label: 'Active' },
      { value: 'pending', label: 'Pending' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'rejected', label: 'Rejected' },
    ],
  },
];

const TOP_QUERIES_FILTERS: FilterDef[] = [
  PERIOD_FILTER,
  QUERY_TYPE_FILTER,
  {
    key: 'normalize',
    label: 'Merge similar queries',
    default: 'true',
    options: [
      { value: 'true', label: 'On' },
      { value: 'false', label: 'Off' },
    ],
  },
  { key: 'limit', label: 'Number of queries', type: 'number', default: '11', min: 1, max: 100 },
];

const CREDIT_BURN_FILTERS: FilterDef[] = [
  { key: 'months', label: 'Months to include', type: 'number', default: '6', min: 1, max: 24 },
];

const FAILED_QUERIES_FILTERS: FilterDef[] = [
  QUERY_TYPE_FILTER,
  { key: 'from', label: 'From', type: 'date', default: '' },
  { key: 'to', label: 'To', type: 'date', default: '' },
  { key: 'page_size', label: 'Results per page', type: 'number', default: '10', min: 1, max: 100 },
];

const TOP_QUERIES_COLUMNS: TableColumn<TopQueryRow>[] = [
  {
    key: 'query',
    header: 'Query',
    render: (row) => (
      <span className="block max-w-105 truncate" title={row.query}>
        {row.query}
      </span>
    ),
  },
  { key: 'count', header: 'Searches', align: 'right', render: (row) => formatNum(row.count) },
  { key: 'unique_users', header: 'Users', align: 'right', render: (row) => formatNum(row.unique_users) },
  { key: 'avg_result_count', header: 'Avg results', align: 'right', render: (row) => formatNum(row.avg_result_count) },
  { key: 'zero_result_count', header: 'Zero results', align: 'right', render: (row) => formatNum(row.zero_result_count) },
  {
    key: 'last_searched_at',
    header: 'Last searched',
    align: 'right',
    render: (row) => <span className="text-muted-foreground whitespace-nowrap">{formatDateTime(row.last_searched_at)}</span>,
  },
];

const FAILED_QUERIES_COLUMNS: TableColumn<FailedQueryRow>[] = [
  {
    key: 'raw_input',
    header: 'Query',
    render: (row) => (
      <span className="block max-w-105 truncate" title={row.raw_input ?? ''}>
        {row.raw_input ?? <span className="text-muted-foreground">—</span>}
      </span>
    ),
  },
  { key: 'query_type', header: 'Type', render: (row) => <QueryTypeBadge type={row.query_type} /> },
  { key: 'filters_applied', header: 'Filters', render: (row) => renderFiltersApplied(row.filters_applied) },
  {
    key: 'execution_time_ms',
    header: 'Exec time',
    align: 'right',
    render: (row) =>
      typeof row.execution_time_ms === 'number' ? (
        <span className="whitespace-nowrap">{`${row.execution_time_ms.toLocaleString()} ms`}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: 'created_at',
    header: 'When',
    align: 'right',
    render: (row) => <span className="text-muted-foreground whitespace-nowrap">{formatDateTime(row.created_at)}</span>,
  },
];

export default function AnalyticsSection() {
  return (
    <div className="mt-8">
      {/* <div className="mb-4">
        <h2 className="text-lg font-bold">Search Analytics</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Query volume and performance insights</p>
      </div> */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AnalyticsChart
          endpoint="/api/admin/search-analytics/overview"
          icon={BarChart3}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10"
          title="Search Analytics Overview"
          subtitle="Headline KPIs across 24h / 7d / 30d"
        />

        <AnalyticsChart
          endpoint="/api/admin/search-analytics/trends"
          filters={TRENDS_FILTERS}
          icon={LineChart}
          iconColor="text-violet-500"
          iconBg="bg-violet-500/10"
          title="Search Volume Trends"
          subtitle="Query volume over time"
        />

        <AnalyticsChart
          endpoint="/api/admin/search-analytics/user-distribution"
          filters={USER_DISTRIBUTION_FILTERS}
          select={(raw) => (raw as UserDistributionResponse).highcharts.by_role}
          icon={PieChart}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10"
          title="Users by Role"
          subtitle="Registered users grouped by role"
        />

        <AnalyticsChart
          endpoint="/api/admin/search-analytics/user-distribution"
          filters={USER_DISTRIBUTION_FILTERS}
          select={(raw) => (raw as UserDistributionResponse).highcharts.by_status}
          icon={Users}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10"
          title="Users by Status"
          subtitle="Registered users grouped by account status"
        />

        <AnalyticsChart
          endpoint="/api/admin/analytics/credit-burn-rate"
          filters={CREDIT_BURN_FILTERS}
          select={(raw) => (raw as { highcharts: ChartApiResponse }).highcharts}
          wide
          icon={Coins}
          iconColor="text-rose-500"
          iconBg="bg-rose-500/10"
          title="Credit Burn Rate"
          subtitle="Monthly credit consumption by type"
        />

        <AnalyticsTable<TopQueryRow>
          endpoint="/api/admin/search-analytics/top-queries"
          filters={TOP_QUERIES_FILTERS}
          icon={ListOrdered}
          iconColor="text-cyan-500"
          iconBg="bg-cyan-500/10"
          title="Top Queries"
          subtitle="Most frequently repeated search terms"
          columns={TOP_QUERIES_COLUMNS}
          select={(raw) => ({ rows: (raw as { items?: TopQueryRow[] }).items ?? [] })}
        />

        <AnalyticsTable<FailedQueryRow>
          endpoint="/api/admin/search-analytics/failed-queries"
          filters={FAILED_QUERIES_FILTERS}
          paginated
          icon={AlertTriangle}
          iconColor="text-red-500"
          iconBg="bg-red-500/10"
          title="Failed Queries"
          subtitle="Zero-result queries, most recent first"
          columns={FAILED_QUERIES_COLUMNS}
          select={(raw) => {
            const r = raw as {
              items?: FailedQueryRow[];
              page?: number;
              total_pages?: number;
              total?: number;
            };
            return { rows: r.items ?? [], page: r.page, totalPages: r.total_pages, total: r.total };
          }}
        />
      </div>
    </div>
  );
}
