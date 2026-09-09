'use client';

import { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { Search, X, Loader2, Download, Zap, Check, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompanyDrawer } from './CompanyDrawer';
import Filters from './Filters';
import { searchAction } from './searchServices';
import { isSessionExpiring, SEARCH_STATE_KEY } from '@/lib/session';
import { Company, CompanySearchPayload } from '@/types/search';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import ExportModal from './ExportModal';
import { RootState } from '@/store/store';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'next/navigation';
import CompanyTable from './CompanyTable';
import SortPopover from './SortPopover';
import ColumnPickerPopover from './ColumnPickerPopover';
import { useVisibleColumns } from './useVisibleColumns';
import { useExport } from './useExport';
import { useBatchEnrich, type EnrichRecordUpdate } from './useBatchEnrich';
import { emptyFilters, filtersFromQuery, type SearchFilters } from './replayParams';
import { hasFilterErrors } from './filterValidation';
import BucketPickerPopover from '../buckets/BucketPickerPopover';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


const PER_PAGE_OPTIONS = [25, 50, 100] as const;

function loadSearchState(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SEARCH_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function SearchPage() {

  const initialFilters = emptyFilters;

  const role = useSelector((state: RootState) => state.auth.role);
  const searchParams = useSearchParams();
  const [replayFilters] = useState(() => filtersFromQuery(searchParams.toString()));
  const [persisted] = useState(() => {
    const saved = loadSearchState();
    if (!replayFilters) return saved;
    const sameQuery = JSON.stringify(saved?.appliedFilters) === JSON.stringify(replayFilters);
    return sameQuery ? saved : null;
  });
  const [sortBy, setSortBy] = useState((persisted?.sortBy as string) ?? '');
  const [sortOrder, setSortOrder] = useState((persisted?.sortOrder as string) ?? '');
  const [perPage, setPerPage] = useState((persisted?.perPage as number) ?? 25);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [notAccessibleFields, setNotAccessibleFields] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState((persisted?.currentPage as number) ?? 1);
  // Spread over the defaults so a session persisted by an older build — one
  // without every filter key — still restores into a complete shape.
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(
    replayFilters ?? { ...initialFilters, ...(persisted?.appliedFilters as SearchFilters | undefined) }
  );
  // Pending edits from the sidebar and the company-name box. Nothing is
  // fetched until Apply (or Enter in the search box) commits them.
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(appliedFilters);
  const [hasNextPage, setHasNextPage] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>((persisted?.cursorStack as string[]) ?? []);
  const [currentCursor, setCurrentCursor] = useState<string | null>((persisted?.currentCursor as string | null) ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [perPageOpen, setPerPageOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [visibleColumns, setVisibleColumns] = useVisibleColumns();
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  const { isExporting, exportData } = useExport();
  const { isEnriching, enrich } = useBatchEnrich();

  const buildSearch = useCallback((cursorValue: string | null): CompanySearchPayload => {
    const {
      searchText, stateFilter, cityFilter, countyFilter, naicsFilter, sicFilter,
      msaFilter, certificationFilter, minEmp, maxEmp, minRev, maxRev, minYear, maxYear,
      demoFilter, hasEmail, hasPhone, hasWebsite
    } = appliedFilters;

    const payload: CompanySearchPayload = {
      search_text: searchText.trim().toLowerCase() || null,
      state: stateFilter.length > 0 ? stateFilter : null,
      city: cityFilter || null,
      county: countyFilter || null,
      naics_code: naicsFilter || null,
      sic_code: sicFilter || null,
      msa: msaFilter || null,
      certification_status: certificationFilter || null,
      employee_size_min: minEmp ? parseInt(minEmp) : null,
      employee_size_max: maxEmp ? parseInt(maxEmp) : null,
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
      sort_order: (sortOrder || 'asc') as 'asc' | 'desc',
      limit: perPage,
      cursor: cursorValue,
      has_mobile_number: hasPhone ? true : null,
      has_email: hasEmail ? true : null,
      has_website: hasWebsite ? true : null
    };

    return payload;
  }, [perPage, appliedFilters, sortBy, sortOrder]);

  const fetchCompanies = useCallback(async (cursorValue: string | null = null) => {
    setIsLoading(true);
    try {
      const payload = buildSearch(cursorValue);
      const response = await searchAction(payload);
      setCompanies(response.data.results);
      setTotalResults(response.data.total);
      setHasNextPage(response.data.next_cursor || null);
      setNotAccessibleFields(response.data.not_accessible);
    } catch {
      if (!isSessionExpiring()) toast.error('Failed to fetch companies');
    } finally {
      setIsLoading(false);
    }
  }, [buildSearch]);

  // On the first mount, restore the page the user was on before a browser
  // refresh by fetching with the persisted cursor. On every subsequent change
  // to the query (search/filters/sort/perPage) reset back to the first page.
  const didInitFetch = useRef(false);
  useEffect(() => {
    if (!didInitFetch.current) {
      didInitFetch.current = true;
      fetchCompanies((persisted?.currentCursor as string | null) ?? null);
      return;
    }
    setCursorStack([]);
    setCurrentCursor(null);
    setCurrentPage(1);
    fetchCompanies(null);
  }, [fetchCompanies, persisted]);

  const didInitSelection = useRef(false);
  useEffect(() => {
    if (!didInitSelection.current) {
      didInitSelection.current = true;
      return;
    }
    setSelectedIds(new Set());
  }, [appliedFilters]);

  const clearFilters = useCallback(() => {
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(SEARCH_STATE_KEY, JSON.stringify({
        sortBy, sortOrder, perPage,
        appliedFilters, currentPage, cursorStack, currentCursor,
      }));
    } catch {
      // Ignore quota/serialization errors — persistence is best-effort.
    }
  }, [sortBy, sortOrder, perPage, appliedFilters, currentPage, cursorStack, currentCursor]);

  const currentCursorRef = useRef(currentCursor);
  useEffect(() => { currentCursorRef.current = currentCursor; }, [currentCursor]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const restoreScrollRef = useRef<number | null>(null);
  const refreshSearch = useCallback(() => {
    restoreScrollRef.current = scrollRef.current?.scrollTop ?? null;
    fetchCompanies(currentCursorRef.current);
  }, [fetchCompanies]);

  const applyEnrichUpdate = useCallback((update: EnrichRecordUpdate) => {
    setCompanies(prev => prev.map(c => (
      c.id !== update.companyId ? c : {
        ...c,
        enrichment_status: update.succeeded ? 'enriched' : c.enrichment_status,
        has_mobile_number: update.hasPhone ?? c.has_mobile_number,
        has_email: update.hasEmail ?? c.has_email,
        has_website: update.hasWebsite ?? c.has_website,
      }
    )));
  }, []);

  useLayoutEffect(() => {
    if (isLoading || restoreScrollRef.current === null) return;
    if (scrollRef.current) scrollRef.current.scrollTop = restoreScrollRef.current;
    restoreScrollRef.current = null;
  }, [isLoading, companies]);

  const allSelected = companies.length > 0 && companies.every(c => selectedIds.has(c.id));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) companies.forEach(c => next.delete(c.id));
      else companies.forEach(c => next.add(c.id));
      return next;
    });
  };

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

  // Drives the badge on the Filters toggle. `searchText` is left out — it has
  // its own visible box in the toolbar, so counting it would double-report.
  const activeFilterCount = useMemo(
    () => Object.entries(appliedFilters).reduce((count, [key, value]) => {
      if (key === 'searchText') return count;
      if (Array.isArray(value)) return count + value.length;
      return count + (value ? 1 : 0);
    }, 0),
    [appliedFilters],
  );

  const canPrevPage = currentPage > 1 && cursorStack.length > 0 && !isLoading;
  const canNextPage = !!hasNextPage && !isLoading;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar header: refine what's on screen (left), act on the selection (right) */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="relative w-100 max-w-1/2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={draftFilters.searchText}
              onChange={e => setDraftFilters({ ...draftFilters, searchText: e.target.value })}
              // Enter is the same commit as the sidebar's Apply button — including
              // its refusal to apply a range the sidebar is flagging as invalid.
              onKeyDown={e => { if (e.key === 'Enter' && !hasFilterErrors(draftFilters)) setAppliedFilters(draftFilters); }}
              placeholder="Search company name..."
              className="h-10 w-full rounded-xl border border-input bg-white pl-9 pr-9 text-sm font-sans font-light outline-none focus:ring-2 focus:ring-ring"
            />
            {draftFilters.searchText && (
              <button
                type="button"
                onClick={() => setDraftFilters({ ...draftFilters, searchText: '' })}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <SortPopover
            sortBy={sortBy}
            sortOrder={sortOrder}
            setSortBy={setSortBy}
            setSortOrder={setSortOrder}
          />

          <button
            type="button"
            onClick={() => setShowFilters(open => !open)}
            aria-pressed={showFilters}
            className={cn(
              'flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-sans font-light cursor-pointer transition-colors',
              showFilters ? 'border-input bg-muted' : 'border-input bg-white hover:bg-accent',
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <BucketPickerPopover
            companyIds={Array.from(selectedIds)}
            tooltipId="add-to-bucket-tip"
            className="h-10 rounded-xl border-2 border-primary bg-transparent px-4 py-0 text-sm font-sans font-normal text-primary hover:bg-primary/10"
            onDone={() => setSelectedIds(new Set())}
          />
          <Tooltip
            id="add-to-bucket-tip"
            place="bottom"
            content={selectedIds.size === 0
              ? 'Select companies to add to a bucket'
              : 'Add selected companies to a bucket'}
            className="text-xs! px-2! py-1! rounded-md! bg-foreground! text-background!"
          />

          <button
            type="button"
            data-tooltip-id="export-tip"
            onClick={() => setShowExportModal(true)}
            disabled={role === 'FREE' || selectedIds.size === 0}
            className={cn(
              'flex h-10 items-center gap-2 rounded-xl border-2 border-primary px-4 text-sm font-sans font-normal text-primary transition-colors hover:bg-primary/10 active:scale-[0.98] cursor-pointer',
              (role === 'FREE' || selectedIds.size === 0) && 'cursor-not-allowed opacity-50 hover:bg-transparent',
            )}
          >
            <Download className="h-4 w-4" /> Export{selectedIds.size > 0 && ` (${selectedIds.size})`}
          </button>
          <Tooltip
            id="export-tip"
            place="bottom"
            content={role === 'FREE'
              ? 'Please upgrade to export companies'
              : selectedIds.size === 0
                ? 'Select companies to export'
                : 'Export selected companies'}
            className="text-xs! px-2! py-1! rounded-md! bg-foreground! text-background!"
          />

          <button
            type="button"
            data-tooltip-id="enrich-tip"
            onClick={() => enrich(selectedIds, () => setSelectedIds(new Set()), refreshSearch, applyEnrichUpdate)}
            disabled={role === 'FREE' || selectedIds.size <= 1 || isEnriching}
            className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-sans font-normal text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEnriching
              ? <><Loader2 className="h-4 w-4 animate-spin" />Enriching...</>
              : <><Zap className="h-4 w-4" />Batch Enrich{selectedIds.size > 1 && ` (${selectedIds.size})`}</>}
          </button>
          <Tooltip
            id="enrich-tip"
            place="bottom"
            content={role === 'FREE'
              ? 'Please upgrade to enrich companies'
              : selectedIds.size <= 1
                ? 'Select at least 2 companies for batch enrichment'
                : 'Enrich selected companies'}
            className="text-xs! px-2! py-1! rounded-md! bg-foreground! text-background!"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left: the filter sidebar, toggled from the toolbar */}
        {showFilters && (
          <Filters
            filters={appliedFilters}
            setFilters={setAppliedFilters}
            draftFilters={draftFilters}
            setDraftFilters={setDraftFilters}
            setPage={() => { }}
            initialFilters={initialFilters}
            onClear={clearFilters}
          />
        )}

        {/* Right: results, headed by the page-size / count / pager strip */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border p-4">
            <div className="flex items-center gap-3">
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
                        onClick={() => { setPerPage(value); setPerPageOpen(false); }}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                      >
                        {value}
                        {perPage === value && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
                <span className="text-xs font-normal text-[#B3B3B3] font-sans">Per Page</span>
              </div>
              <p className="flex items-center gap-2 text-xs font-normal font-sans text-[#B3B3B3]">
                {isLoading
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching companies...</>
                  : <span>Showing {companies.length} of {totalResults.toLocaleString()} {totalResults === 1 ? 'company' : 'companies'}</span>}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <ColumnPickerPopover selected={visibleColumns} onChange={setVisibleColumns} />

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={!canPrevPage}
                  onClick={handlePrev}
                  aria-label="Previous page"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border cursor-pointer hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={!canNextPage}
                  onClick={handleNext}
                  aria-label="Next page"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border cursor-pointer hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
            <CompanyTable
              companies={companies}
              isLoading={isLoading}
              perPage={perPage}
              selectedIds={selectedIds}
              allSelected={allSelected}
              notAccessibleFields={notAccessibleFields}
              visibleColumns={visibleColumns}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onRowClick={setSelectedCompany}
            />
          </div>
        </div>
      </div>

      {selectedCompany && <CompanyDrawer id={selectedCompany.id} onClose={() => setSelectedCompany(null)} onEnriched={refreshSearch} />}

      {showExportModal && (
        <ExportModal
          showExportModal={showExportModal}
          setShowExportModal={setShowExportModal}
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
          handleExport={() => exportData(Array.from(selectedIds), exportFormat, () => {
            setShowExportModal(false);
            setSelectedIds(new Set());
          })}
          isExporting={isExporting}
        />
      )}
    </div>
  );
}
