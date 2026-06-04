'use client';

import { Users, Search, Zap, AlertTriangle, DollarSign, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface DashboardData {
  total_users: number;
  searches_7d: number;
  enrichments_7d: number;
  open_errors: number;
  monthly_cost: number;
}

const STAT_CONFIG = [
  {
    key: 'total_users' as keyof DashboardData,
    label: 'Total Users',
    icon: Users,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'searches_7d' as keyof DashboardData,
    label: 'Searches (7d)',
    icon: Search,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'enrichments_7d' as keyof DashboardData,
    label: 'Enrichments (7d)',
    icon: Zap,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'open_errors' as keyof DashboardData,
    label: 'Open Errors',
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'monthly_cost' as keyof DashboardData,
    label: 'Monthly Cost',
    icon: DollarSign,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    format: (v: number) => `$${v.toFixed(4)}`,
  },
];

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/admin/dashboard');
      setData(res.data.data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Failed to load dashboard data');
      } else {
        setError('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform overview</p>
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
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {STAT_CONFIG.map((stat) => {
          const Icon = stat.icon;
          const value = data?.[stat.key];

          return (
            <div
              key={stat.key}
              className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 shadow-sm"
            >
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', stat.bg)}>
                <Icon className={cn('h-4 w-4', stat.color)} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                {loading ? (
                  <div className="mt-1.5 h-7 w-16 rounded bg-muted animate-pulse" />
                ) : (
                  <p className={cn('mt-1 text-2xl font-bold tracking-tight', stat.color)}>
                    {value !== undefined ? stat.format(value as number) : '—'}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
