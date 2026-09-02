'use client';

import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import apiClient from '@/lib/api/client';
import { getErrorMessage } from '@/lib/apiError';
import AnalyticsSection from './AnalyticsSection';

interface DashboardData {
  total_users: number;
  searches_7d: number;
  enrichments_7d: number;
  open_errors: number;
  monthly_cost: number;
}

// Plain label + colored number, matching the Figma "Dashboard" reference
// (fileKey pskj0D4uvWBsvAB5Csxyt4, node 488:3205) exactly — no icon badge.
const STAT_CONFIG = [
  {
    key: 'total_users' as keyof DashboardData,
    label: 'Total User',
    color: 'text-foreground',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'searches_7d' as keyof DashboardData,
    label: 'Searches',
    color: 'text-brand-accent',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'enrichments_7d' as keyof DashboardData,
    label: 'Enrichment',
    color: 'text-primary',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'open_errors' as keyof DashboardData,
    label: 'Open Errors',
    color: 'text-destructive',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'monthly_cost' as keyof DashboardData,
    label: 'Monthly Cost',
    color: 'text-primary',
    format: (v: number) => `$${v.toFixed(4)}`,
  },
];

export default function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/admin/dashboard');
      setData(res.data.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiClient.get('/admin/dashboard');
        if (active) setData(res.data.data);
      } catch (err: unknown) {
        if (!active) return;
        setError(getErrorMessage(err, 'Failed to load dashboard data'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform Overview</p>
        </div>
        <button
          type="button"
          onClick={fetchDashboard}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {STAT_CONFIG.map((stat) => {
          const value = data?.[stat.key];

          return (
            <div
              key={stat.key}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              {loading ? (
                <div className="mt-1.5 h-7 w-16 rounded bg-muted animate-pulse" />
              ) : (
                <p className={cn('mt-1 font-heading text-2xl font-bold tracking-tight', stat.color)}>
                  {value !== undefined ? stat.format(value as number) : '—'}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <AnalyticsSection />
    </div>
  );
}
