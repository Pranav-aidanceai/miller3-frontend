'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, X, Grid3X3, List, Download, ChevronDown, SlidersHorizontal, Phone, Mail, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompanyDrawer } from './CompanyDrawer';
import { generateSeedData, type Company } from '@/lib/mock-data';
import { useAppSelector } from '@/store/hooks';
import Filters from './Filters';
import { useDebounce } from '@/hooks/useDebounce';

export default function SearchPage() {

  const companiesData = generateSeedData().companies;
  const role = useAppSelector(state => state.auth.role)
  const [nameQ, setNameQ] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState(companiesData);
  const [totalPages, setTotalPages] = useState(0);
  const searchQuery = useDebounce(nameQ, 500).toLowerCase();

  const fetchCompanies = useCallback(() => {
    let filtered = companiesData.filter(c => c.name.toLowerCase().includes(searchQuery));
    if (sortBy === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'revenue') filtered.sort((a, b) => b.revenue - a.revenue);
    else if (sortBy === 'employees') filtered.sort((a, b) => b.employees - a.employees);
    setCompanies(filtered.slice(0, perPage));
    setTotalPages(Math.ceil(filtered.length / perPage));
  }, [searchQuery, sortBy, page, perPage]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const formatRev = (r: number) => {
    if (r >= 1e9) return `$${(r / 1e9).toFixed(1)}B`;
    if (r >= 1e6) return `$${(r / 1e6).toFixed(1)}M`;
    if (r >= 1e3) return `$${(r / 1e3).toFixed(0)}K`;
    return `$${r}`;
  };

  const ContactDots = ({ c }: { c: Company }) => (
    <div className="flex gap-1">
      <div className={cn('h-2 w-2 rounded-full', c.phone ? 'bg-success' : 'bg-muted')} title={c.phone ? 'Has phone' : 'No phone'} />
      <div className={cn('h-2 w-2 rounded-full', c.email ? 'bg-success' : 'bg-muted')} title={c.email ? 'Has email' : 'No email'} />
      <div className={cn('h-2 w-2 rounded-full', c.website ? 'bg-success' : 'bg-muted')} title={c.website ? 'Has website' : 'No website'} />
    </div>
  );

  return (
    <div className="flex gap-6">

      <Filters
        setPage={setPage}
      />

      <div className="flex-1 overflow-auto p-4 md:p-6" style={{ height: 'calc(100vh - 3.5rem)' }}>
        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={nameQ} onChange={e => { setNameQ(e.target.value) }}
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Search company name..." />
            {nameQ && <button onClick={() => setNameQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode('table')} className={cn('rounded-md p-2 transition-colors cursor-pointer', viewMode === 'table' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground')} aria-label="Table view"><List className="h-4 w-4" /></button>
            <button onClick={() => setViewMode('card')} className={cn('rounded-md p-2 transition-colors cursor-pointer', viewMode === 'card' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground')} aria-label="Card view"><Grid3X3 className="h-4 w-4" /></button>
          </div>
          <div className="relative">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 pr-8 text-sm appearance-none cursor-pointer">
              <option value="name" className='cursor-pointer'>Name A–Z</option>
              <option value="revenue" className='cursor-pointer'>Revenue ↓</option>
              <option value="employees" className='cursor-pointer'>Employees ↓</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
          <button
            onClick={() => {
              if (role === 'free') { toast.error('Upgrade to export'); return; }
              toast.success('Export started');
            }}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>

        {/* Results count */}
        <p className="mb-3 text-sm text-muted-foreground">
          Showing {Math.min((page - 1) * perPage + 1, companies.length)}–{Math.min(page * perPage, companies.length)} of {companies.length} results
        </p>

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Company</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">NAICS</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Employees</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Revenue</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Contact</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Enriched</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.length === 0 ? (
                    <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">
                      <p className="text-lg font-medium">No companies match your filters</p>
                      <p className="mt-1 text-sm">Try loosening your criteria or switching to AI Search</p>
                    </td></tr>
                  ) : companies.map(c => (
                    <tr key={c.id} onClick={() => setSelectedCompany(c)}
                      className="border-b border-border cursor-pointer transition-colors hover:bg-accent/50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.city}, {c.state}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{c.naics_code}</td>
                      <td className="px-4 py-3 text-right">{c.employees.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{formatRev(c.revenue)}</td>
                      <td className="px-4 py-3"><div className="flex justify-center"><ContactDots c={c} /></div></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.last_enriched_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Card View */}
        {viewMode === 'card' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {companies.length === 0 ? (
              <div className="col-span-full py-16 text-center text-muted-foreground">
                <p className="text-lg font-medium">No companies match your filters</p>
              </div>
            ) : companies.map(c => (
              <button key={c.id} onClick={() => setSelectedCompany(c)}
                className="flex flex-col rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{c.name.charAt(0)}</div>
                  <ContactDots c={c} />
                </div>
                <p className="mt-3 font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.city}, {c.state}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-pill bg-muted px-2 py-0.5 text-[10px] font-mono">{c.naics_code}</span>
                  <span className="text-xs text-muted-foreground">{c.employees.toLocaleString()} emp</span>
                  <span className="text-xs text-muted-foreground">{formatRev(c.revenue)}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                  className="h-9 rounded-md border border-input bg-background px-2 pr-8 text-sm appearance-none cursor-pointer">
                  <option value={25} className='cursor-pointer'>25</option>
                  <option value={50} className='cursor-pointer'>50</option>
                  <option value={100} className='cursor-pointer'>100</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              <span className="text-xs text-muted-foreground">per page</span>
            </div>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent cursor-pointer">Prev</button>
              {(() => {
                const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
                const endPage = Math.min(totalPages, startPage + 4);
                return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
              })().map(p => (
                <button key={p} onClick={() => setPage(p)} className={cn('rounded-md px-3 py-1.5 text-sm cursor-pointer', p === page ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent')}>
                  {p}
                </button>
              ))}
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent cursor-pointer">Next</button>
            </div>
          </div>
        )}
      </div>

      {selectedCompany && <CompanyDrawer company={selectedCompany} onClose={() => setSelectedCompany(null)} />}
    </div>
  );
}