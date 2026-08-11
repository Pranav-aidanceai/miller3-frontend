'use client';

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Search, X, Grid3X3, List, Loader2, Download, Zap, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompanyDrawer } from './CompanyDrawer';
import Filters from './Filters';
import { searchAction } from './searchServices';
import { isSessionExpiring } from '@/lib/session';
import { Company, CompanySearchPayload } from '@/types/search';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import ExportModal from './ExportModal';
import { RootState } from '@/store/store';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'next/navigation';
import CompanyTable from './CompanyTable';
import CompanyCards from './CompanyCards';
import SearchPagination from './SearchPagination';
import SortPopover from './SortPopover';
import { useExport } from './useExport';
import { useBatchEnrich, type EnrichRecordUpdate } from './useBatchEnrich';
import { emptyFilters, filtersFromQuery, type SearchFilters } from './replayParams';


const SEARCH_STATE_KEY = 'miller3:search-state';

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
  const [viewMode, setViewMode] = useState<'table' | 'card'>((persisted?.viewMode as 'table' | 'card') ?? 'card');
  const [perPage, setPerPage] = useState((persisted?.perPage as number) ?? 25);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
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
      setTotalPages(response.data.total_pages);
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
        sortBy, sortOrder, viewMode, perPage,
        appliedFilters, currentPage, cursorStack, currentCursor,
      }));
    } catch {
      // Ignore quota/serialization errors — persistence is best-effort.
    }
  }, [sortBy, sortOrder, viewMode, perPage, appliedFilters, currentPage, cursorStack, currentCursor]);

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

  return (
    <div className="flex gap-3">
      <Filters
        filters={appliedFilters}
        setFilters={setAppliedFilters}
        draftFilters={draftFilters}
        setDraftFilters={setDraftFilters}
        setPage={() => { }}
        initialFilters={initialFilters}
        onClear={clearFilters}
      />

      <div ref={scrollRef} className="flex-1 overflow-auto p-4 md:py-6 px-1" style={{ height: 'calc(100vh - 3.5rem)' }}>

        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={draftFilters.searchText}
              onChange={e => setDraftFilters({ ...draftFilters, searchText: e.target.value })}
              // Enter is the same commit as the sidebar's Apply button.
              onKeyDown={e => { if (e.key === 'Enter') setAppliedFilters(draftFilters); }}
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Search company name..."
            />
            {draftFilters.searchText && (
              <button onClick={() => setDraftFilters({ ...draftFilters, searchText: '' })} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode('card')} className={cn('rounded-md p-2 transition-colors cursor-pointer', viewMode === 'card' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground')} aria-label="Card view"><Grid3X3 className="h-4 w-4" /></button>
            <button onClick={() => setViewMode('table')} className={cn('rounded-md p-2 transition-colors cursor-pointer', viewMode === 'table' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground')} aria-label="Table view"><List className="h-4 w-4" /></button>
          </div>

          <SortPopover
            sortBy={sortBy}
            sortOrder={sortOrder}
            setSortBy={setSortBy}
            setSortOrder={setSortOrder}
          />

          <button
            data-tooltip-id="export-tip"
            onClick={() => setShowExportModal(true)}
            disabled={role === 'FREE' || selectedIds.size === 0}
            className={cn("flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer",
              (role === 'FREE' || selectedIds.size === 0) && 'cursor-not-allowed opacity-50'
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
            disabled={selectedIds.size <= 1 || isEnriching}
            className={cn("flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer",
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            {isEnriching
              ? <><Loader2 className="h-4 w-4 animate-spin" />Enriching...</>
              : <><Zap className="h-4 w-4" />Batch Enrich{selectedIds.size > 1 && ` (${selectedIds.size})`}</>}
          </button>
          <Tooltip
            id="enrich-tip"
            place="bottom"
            content={selectedIds.size <= 1
              ? 'Select at least 2 companies for batch enrichment'
              : 'Enrich selected companies'}
            className="text-xs! px-2! py-1! rounded-md! bg-foreground! text-background!"
          />

        </div>

        <div className='flex items-center justify-between'>
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            {isLoading
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching companies...</>
              : <span>Showing {companies.length} of {totalResults.toLocaleString()} companies</span>
            }
          </div>
          <div className="flex items-center gap-3">
            {viewMode === 'card' && companies.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                disabled={isLoading}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  readOnly
                  className="h-4 w-4 cursor-pointer accent-primary"
                />
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            )}
            <button
              type="button"
              onClick={() => fetchCompanies(currentCursor)}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        {viewMode === 'table' && (
          <CompanyTable
            companies={companies}
            isLoading={isLoading}
            perPage={perPage}
            selectedIds={selectedIds}
            allSelected={allSelected}
            notAccessibleFields={notAccessibleFields}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onRowClick={setSelectedCompany}
          />
        )}

        {viewMode === 'card' && (
          <CompanyCards
            companies={companies}
            isLoading={isLoading}
            selectedIds={selectedIds}
            notAccessibleFields={notAccessibleFields}
            onToggleSelect={toggleSelect}
            onCardClick={setSelectedCompany}
          />
        )}

        <SearchPagination
          perPage={perPage}
          setPerPage={setPerPage}
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          isLoading={isLoading}
          onPrev={handlePrev}
          onNext={handleNext}
        />
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
