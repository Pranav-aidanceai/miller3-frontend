'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, X, Grid3X3, List, ChevronDown, Loader2, Info, Phone, Mail, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompanyDrawer } from './CompanyDrawer';
import Filters from './Filters';
import { useDebounce } from '@/hooks/useDebounce';
import { searchAction } from './searchServices';
import { Company, CompanySearchPayload } from '@/types/search';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

export default function SearchPage() {

  const initialFilters = {
    stateFilter: [] as string[],
    cityFilter: '',
    countyFilter: '',
    naicsFilter: '',
    sicFilter: '',
    minYear: '',
    maxYear: '',
    minEmp: '',
    maxEmp: '',
    minRev: '',
    maxRev: '',
    demoFilter: [] as string[],
    hasPhone: false,
    hasEmail: false,
    hasWebsite: false
  };

  const [nameQ, setNameQ] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [perPage, setPerPage] = useState(25);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [notAccessibleFields, setNotAccessibleFields] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [hasNextPage, setHasNextPage] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const searchQuery = useDebounce(nameQ, 500).toLowerCase();

  const fetchCompanies = useCallback(async (cursorValue: string | null = null) => {
    setIsLoading(true);
    try {
      const {
        stateFilter, cityFilter, countyFilter, naicsFilter, sicFilter,
        minEmp, maxEmp, minRev, maxRev, minYear, maxYear,
        demoFilter, hasEmail, hasPhone, hasWebsite
      } = appliedFilters;

      const payload: CompanySearchPayload = {
        search_text: searchQuery || null,
        state: stateFilter.length > 0 ? stateFilter : null,
        city: cityFilter || null,
        county: countyFilter || null,
        naics_code: naicsFilter || null,
        sic_code: sicFilter || null,
        employee_size: (minEmp || maxEmp) ? [
          minEmp ? Number(minEmp) : 0,
          maxEmp ? Number(maxEmp) : Number.MAX_SAFE_INTEGER
        ] : null,
        annual_revenue_min: minRev ? Number(minRev) : null,
        annual_revenue_max: maxRev ? Number(maxRev) : null,
        year_founded_min: minYear ? Number(minYear) : null,
        year_founded_max: maxYear ? Number(maxYear) : null,
        ownership_type: null,
        minority_owned: demoFilter.includes('Minority-Owned') || null,
        women_owned: demoFilter.includes('Women-Owned') || null,
        veteran_owned: demoFilter.includes('Veteran-Owned') || null,
        enrichment_status: null,
        sort_by: sortBy,
        sort_order: 'asc',
        limit: perPage,
        cursor: cursorValue,
        has_mobile_number: hasPhone ? true : null,
        has_email: hasEmail ? true : null,
        has_website: hasWebsite ? true : null
      };

      const response = await searchAction(payload);
      setCompanies(response.data.results);
      setTotalResults(response.data.total);
      setHasNextPage(response.data.next_cursor || null);
      setTotalPages(response.data.total_pages);
      setNotAccessibleFields(response.data.not_accessible);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch companies');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, perPage, appliedFilters, sortBy]);

  useEffect(() => {
    setCursorStack([]);
    setCurrentCursor(null);
    setCurrentPage(1);
    fetchCompanies(null);
  }, [searchQuery, sortBy, perPage, appliedFilters]);

  const handleNext = () => {
    if (!hasNextPage) return;
    setCursorStack(prev => [...prev, currentCursor ?? '']);
    setCurrentCursor(hasNextPage);
    setCurrentPage(prev => prev + 1);
    fetchCompanies(hasNextPage);
  };

  const handlePrev = () => {
    if (cursorStack.length === 0) return;
    const stack = [...cursorStack];
    const prevCursor = stack.pop() ?? null;
    setCursorStack(stack);
    setCurrentCursor(prevCursor);
    setCurrentPage(prev => prev - 1);
    fetchCompanies(prevCursor);
  };

  /**
   * Returns masked JSX if `fieldKey` is in notAccessibleFields.
   * If not locked: shows `displayValue` when truthy, else falls back to `fallback` (default 'NA').
   */
  const MaskedCell = ({
    fieldKey,
    displayValue,
    mono = false,
    align = 'left',
    fallback = 'NA',
    tooltipPlace = 'top',
  }: {
    fieldKey: string;
    displayValue: string | number | null | undefined;
    mono?: boolean;
    align?: 'left' | 'right' | 'center';
    fallback?: string;
    tooltipPlace?: 'top' | 'bottom' | 'left' | 'right';
  }) => {
    const isLocked = notAccessibleFields.includes(fieldKey);
    const tooltipId = `upgrade-tip-${fieldKey}`;
    const alignClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

    if (isLocked) {
      return (
        <span className={cn('flex items-center gap-1', alignClass)}>
          <span className={cn('tracking-widest text-muted-foreground/50 select-none', mono && 'font-mono')}>
            ••••
          </span>
          <span
            data-tooltip-id={tooltipId}
            data-tooltip-content="Please upgrade to see this field"
            className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            aria-label="Upgrade to view this field"
          >
            <Info className="h-3 w-3" />
          </span>
          <Tooltip
            id={tooltipId}
            place={tooltipPlace}
            className="!text-xs !px-2 !py-1 !rounded-md !bg-foreground !text-background"
          />
        </span>
      );
    }

    return (
      <span className={cn(mono && 'font-mono')}>
        {displayValue ?? fallback}
      </span>
    );
  };

  const ContactIcons = ({ c }: { c: Company }) => {
    // green = has value, yellow = locked (in notAccessibleFields), red = null/missing
    const getState = (hasData: string | null, fieldKey: string): 'green' | 'yellow' | 'red' => {
      if (notAccessibleFields.includes(fieldKey)) return 'yellow';
      if (!hasData) return 'red';
      return 'green';
    };

    const colorMap = {
      green:  'text-emerald-500',
      yellow: 'text-amber-400',
      red:    'text-rose-500',
    };

    const titleMap = {
      phone: {
        green:  'Mobile number available',
        yellow: 'Upgrade to access mobile number',
        red:    'No mobile number available',
      },
      email: {
        green:  'Email available',
        yellow: 'Upgrade to access email',
        red:    'No email available',
      },
      website: {
        green:  'Website available',
        yellow: 'Upgrade to access website',
        red:    'No website available',
      },
    };

    const phoneState   = getState(c.phone, 'phone');
    const emailState   = getState(c.email, 'email');
    const websiteState = getState(c.website, 'website');

    // Unique tooltip ids per row to avoid conflicts when multiple rows render
    const phoneTooltipId   = `contact-phone-${c.id}`;
    const emailTooltipId   = `contact-email-${c.id}`;
    const websiteTooltipId = `contact-website-${c.id}`;

    return (
      <div className="flex items-center gap-1.5">
        {/* Phone */}
        <span data-tooltip-id={phoneTooltipId} className="inline-flex cursor-default">
          <Phone className={cn('h-3.5 w-3.5', colorMap[phoneState])} strokeWidth={2} />
        </span>
        <Tooltip
          id={phoneTooltipId}
          place="top"
          content={titleMap.phone[phoneState]}
          className="!text-xs !px-2 !py-1 !rounded-md !bg-foreground !text-background"
        />

        {/* Email */}
        <span data-tooltip-id={emailTooltipId} className="inline-flex cursor-default">
          <Mail className={cn('h-3.5 w-3.5', colorMap[emailState])} strokeWidth={2} />
        </span>
        <Tooltip
          id={emailTooltipId}
          place="top"
          content={titleMap.email[emailState]}
          className="!text-xs !px-2 !py-1 !rounded-md !bg-foreground !text-background"
        />

        {/* Website / Globe */}
        <span data-tooltip-id={websiteTooltipId} className="inline-flex cursor-default">
          <Globe className={cn('h-3.5 w-3.5', colorMap[websiteState])} strokeWidth={2} />
        </span>
        <Tooltip
          id={websiteTooltipId}
          place="top"
          content={titleMap.website[websiteState]}
          className="!text-xs !px-2 !py-1 !rounded-md !bg-foreground !text-background"
        />
      </div>
    );
  };

  const TableSkeleton = () => (
    <tbody>
      {Array.from({ length: perPage > 10 ? 10 : perPage }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          <td className="px-4 py-3">
            <div className="h-4 w-40 rounded bg-muted animate-pulse mb-1" />
            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          </td>
          <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-muted animate-pulse" /></td>
          <td className="px-4 py-3 text-right"><div className="h-4 w-12 rounded bg-muted animate-pulse ml-auto" /></td>
          <td className="px-4 py-3 text-right"><div className="h-4 w-16 rounded bg-muted animate-pulse ml-auto" /></td>
          <td className="px-4 py-3"><div className="flex justify-center gap-1">
            <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
            <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
            <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
          </div></td>
        </tr>
      ))}
    </tbody>
  );

  const CardSkeleton = () => (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col rounded-lg border border-border bg-card p-4 gap-3">
          <div className="flex items-start justify-between">
            <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
            <div className="flex gap-1">
              <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
              <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
              <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
            </div>
          </div>
          <div className="h-4 w-36 rounded bg-muted animate-pulse" />
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          <div className="flex gap-2">
            <div className="h-4 w-14 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            <div className="h-4 w-14 rounded bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="flex gap-6">
      <Filters
        filters={appliedFilters}
        setFilters={setAppliedFilters}
        setPage={() => { }}
        initialFilters={initialFilters}
      />

      <div className="flex-1 overflow-auto p-4 md:p-6" style={{ height: 'calc(100vh - 3.5rem)' }}>

        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={nameQ}
              onChange={e => setNameQ(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Search company name..."
            />
            {nameQ && (
              <button onClick={() => setNameQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode('table')} className={cn('rounded-md p-2 transition-colors cursor-pointer', viewMode === 'table' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground')} aria-label="Table view"><List className="h-4 w-4" /></button>
            <button onClick={() => setViewMode('card')} className={cn('rounded-md p-2 transition-colors cursor-pointer', viewMode === 'card' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground')} aria-label="Card view"><Grid3X3 className="h-4 w-4" /></button>
          </div>
          <div className="relative">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 pr-8 text-sm appearance-none cursor-pointer">
              <option value="created_at">Name A–Z</option>
              <option value="annual_revenue">Revenue ↓</option>
              <option value="employee_size">Employees ↓</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Results count */}
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          {isLoading
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching companies...</>
            : <span>Showing {companies.length} of {totalResults.toLocaleString()} results</span>
          }
        </div>

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
                  </tr>
                </thead>
                {isLoading ? <TableSkeleton /> : (
                  <tbody>
                    {companies.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-muted-foreground">
                          <p className="text-lg font-medium">No companies match your filters</p>
                          <p className="mt-1 text-sm">Try loosening your criteria or switching to AI Search</p>
                        </td>
                      </tr>
                    ) : companies.map(c => (
                      <tr key={c.id} onClick={() => setSelectedCompany(c)}
                        className="border-b border-border cursor-pointer transition-colors hover:bg-accent/50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{c.company_name}</p>
                          <p className="text-xs text-muted-foreground">{c.city}, {c.state}</p>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <MaskedCell
                            fieldKey="naics_code"
                            displayValue={c.naics_code}
                            mono
                            tooltipPlace="right"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <MaskedCell
                            fieldKey="employee_size"
                            displayValue={c.employee_size != null ? c.employee_size.toLocaleString() : null}
                            align="right"
                            tooltipPlace="top"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <MaskedCell
                            fieldKey="annual_revenue"
                            displayValue={c.annual_revenue != null ? `$${c.annual_revenue.toLocaleString()}` : null}
                            align="right"
                            tooltipPlace="top"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center"><ContactIcons c={c} /></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Card View */}
        {viewMode === 'card' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading ? <CardSkeleton /> : companies.length === 0 ? (
              <div className="col-span-full py-16 text-center text-muted-foreground">
                <p className="text-lg font-medium">No companies match your filters</p>
              </div>
            ) : companies.map(c => (
              <button key={c.id} onClick={() => setSelectedCompany(c)}
                className="flex flex-col rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    {c.company_name.charAt(0)}
                  </div>
                  <ContactIcons c={c} />
                </div>
                <p className="mt-3 font-semibold">{c.company_name}</p>
                <p className="text-xs text-muted-foreground">{c.city}, {c.state}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-pill bg-muted px-2 py-0.5 text-[10px]">
                    <MaskedCell
                      fieldKey="naics_code"
                      displayValue={c.naics_code}
                      mono
                      tooltipPlace="bottom"
                    />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <MaskedCell
                      fieldKey="employee_size"
                      displayValue={c.employee_size != null ? c.employee_size.toLocaleString() : null}
                      tooltipPlace="bottom"
                    />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <MaskedCell
                      fieldKey="annual_revenue"
                      displayValue={c.annual_revenue != null ? `$${c.annual_revenue.toLocaleString()}` : null}
                      tooltipPlace="bottom"
                    />
                  </span>
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
                <select
                  value={perPage}
                  onChange={e => setPerPage(Number(e.target.value))}
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
                disabled={currentPage === 1 || isLoading}
                onClick={handlePrev}
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent cursor-pointer"
              >
                Prev
              </button>

              {[currentPage - 1, currentPage, currentPage + 1]
                .filter((p) => p >= 1 && (p < currentPage || p === currentPage || hasNextPage))
                .map((p) => {
                  const isActive = p === currentPage;
                  return (
                    <button
                      key={p}
                      disabled={isLoading}
                      onClick={() => {
                        if (p === currentPage - 1) handlePrev();
                        else if (p === currentPage + 1) handleNext();
                      }}
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
                disabled={!hasNextPage || isLoading}
                onClick={handleNext}
                className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedCompany && <CompanyDrawer id={selectedCompany.id} onClose={() => setSelectedCompany(null)} />}
    </div>
  );
}