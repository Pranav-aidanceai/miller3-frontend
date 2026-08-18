'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Download, FolderMinus, Grid3X3, List, Loader2, RefreshCw, Search, Star, X, Zap } from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorMessage } from '@/lib/apiError';
import { isSessionExpiring } from '@/lib/session';
import { Company } from '@/types/search';
import { CompanyDrawer } from '../search/CompanyDrawer';
import CompanyTable from '../search/CompanyTable';
import CompanyCards from '../search/CompanyCards';
import SearchPagination from '../search/SearchPagination';
import ExportModal from '../search/ExportModal';
import SortPopover, { type SortOption } from '../search/SortPopover';
import { useExport } from '../search/useExport';
import { useBatchEnrich, type EnrichRecordUpdate } from '../search/useBatchEnrich';
import BucketList, { type Bucket } from './BucketList';

/** The columns the bucket-companies endpoint accepts for `sort_by`. */
const sortOptions: SortOption[] = [
    { value: 'added_at', label: 'Date added' },
    { value: 'company_name', label: 'Name' },
    { value: 'state', label: 'State' },
    { value: 'city', label: 'City' },
    { value: 'created_at', label: 'Date created' },
];

/** A row as the bucket endpoint returns it — a company plus its `added_at`. */
interface BucketCompany {
    id: string;
    company_id: string;
    company_name: string;
    city?: string | null;
    state?: string | null;
    county: string | null;
    zip_code: string | null;
    address?: string | null;
    msa?: string | null;
    ownership_type?: string | null;
    certification_status?: string | null;
    naics_code: string | null;
    sic_code: string | null;
    employee_size: string | null;
    annual_revenue: number | null;
    year_founded: number | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    enrichment_status?: 'unenriched' | 'enriched' | 'pending';
    added_at: string;
}

/**
 * The bucket rows carry no availability flags, so derive them from the values
 * themselves — the table and cards read those to colour the contact icons.
 */
const toCompany = (r: BucketCompany): Company => ({
    id: String(r.company_id ?? r.id),
    company_name: r.company_name,
    city: r.city ?? '',
    state: r.state ?? '',
    county: r.county,
    address: r.address ?? null,
    msa: r.msa ?? null,
    ownership_type: r.ownership_type ?? null,
    certification_status: r.certification_status ?? null,
    naics_code: r.naics_code,
    sic_code: r.sic_code,
    employee_size: r.employee_size,
    annual_revenue: r.annual_revenue,
    year_founded: r.year_founded,
    enrichment_status: r.enrichment_status ?? 'unenriched',
    phone: r.phone,
    email: r.email,
    website: r.website,
    has_mobile_number: !!r.phone,
    has_email: !!r.email,
    has_website: !!r.website,
});

export default function BucketsPage() {

    const role = useSelector((state: RootState) => state.auth.role);

    const [bucket, setBucket] = useState<Bucket | null>(null);
    // Bumped whenever this page changes a bucket's contents, so the rail's
    // company counts don't go stale behind it.
    const [bucketsRefresh, setBucketsRefresh] = useState(0);

    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalResults, setTotalResults] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [notAccessibleFields, setNotAccessibleFields] = useState<string[]>([]);
    const [perPage, setPerPage] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState<string | null>(null);
    const [currentCursor, setCurrentCursor] = useState<string | null>(null);
    const [cursorStack, setCursorStack] = useState<string[]>([]);

    // `searchText` is what's in the box; `query` is the debounced value the
    // request actually uses, so typing doesn't fire a call per keystroke.
    const [searchText, setSearchText] = useState('');
    const query = useDebounce(searchText, 400);
    const [sortBy, setSortBy] = useState('');
    const [sortOrder, setSortOrder] = useState('');

    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

    const { isExporting, exportData } = useExport();
    const { isEnriching, enrich } = useBatchEnrich();

    const fetchCompanies = useCallback(async (bucketId: string, cursor: string | null = null) => {
        setIsLoading(true);
        try {
            const response = await axios.get('/api/bucket/company', {
                params: {
                    bucket_id: bucketId,
                    limit: perPage,
                    cursor: cursor ?? undefined,
                    q: query.trim() || undefined,
                    // The upstream wants both halves of the sort or neither.
                    sort_by: sortBy || undefined,
                    sort_order: sortBy ? (sortOrder || 'asc') : undefined,
                },
            });
            const data = response.data ?? {};
            setCompanies((data.results ?? []).map(toCompany));
            setTotalResults(data.total ?? 0);
            setTotalPages(data.total_pages ?? 0);
            setHasNextPage(data.next_cursor ?? null);
            setNotAccessibleFields(data.not_accessible ?? []);
        } catch (err: unknown) {
            // A 403 (account deactivated) is owned by the global session guard.
            if (!isSessionExpiring()) {
                toast.error(getErrorMessage(err, 'Failed to load bucket companies'));
            }
            setCompanies([]);
            setTotalResults(0);
            setTotalPages(0);
            setHasNextPage(null);
        } finally {
            setIsLoading(false);
        }
    }, [perPage, query, sortBy, sortOrder]);

    // Switching bucket (or page size) restarts the list at the first page: the
    // handlers below rewind the paging state, the effect refetches page one.
    const bucketId = bucket?.id ?? null;
    useEffect(() => {
        (async () => {
            if (bucketId) await fetchCompanies(bucketId, null);
        })();
    }, [bucketId, fetchCompanies]);

    // Anything that changes the shape of the result set sends us back to page
    // one — the cursors we're holding belong to the previous query.
    const rewindPaging = () => {
        setCursorStack([]);
        setCurrentCursor(null);
        setCurrentPage(1);
    };

    const selectBucket = (next: Bucket) => {
        setBucket(next);
        if (next.id === bucketId) return;
        rewindPaging();
        setSelectedIds(new Set());
        setSearchText('');
        setSortBy('');
        setSortOrder('');
    };

    const changePerPage = (value: number) => {
        setPerPage(value);
        rewindPaging();
    };

    const changeSearch = (value: string) => {
        setSearchText(value);
        rewindPaging();
    };

    const changeSortBy = (value: string) => {
        setSortBy(value);
        rewindPaging();
    };

    const changeSortOrder = (value: string) => {
        setSortOrder(value);
        rewindPaging();
    };

    const currentCursorRef = useRef(currentCursor);
    useEffect(() => { currentCursorRef.current = currentCursor; }, [currentCursor]);

    const refresh = useCallback(() => {
        if (!bucketId) return;
        fetchCompanies(bucketId, currentCursorRef.current);
    }, [bucketId, fetchCompanies]);

    const handleBucketEmptied = useCallback(() => {
        setBucket(null);
        setCompanies([]);
        setTotalResults(0);
        setTotalPages(0);
        setHasNextPage(null);
        setSelectedIds(new Set());
        setIsLoading(false);
    }, []);

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

    const allSelected = companies.length > 0 && companies.every(c => selectedIds.has(c.id));

    const toggleSelect = (id: string) =>
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });

    const toggleSelectAll = () =>
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allSelected) companies.forEach(c => next.delete(c.id));
            else companies.forEach(c => next.add(c.id));
            return next;
        });

    // No bucket picker here — the page already is one bucket, so the selection
    // can only be pulled out of the one on screen.
    const handleRemoveFromBucket = async () => {
        if (!bucket || selectedIds.size === 0 || isRemoving) return;
        const count = selectedIds.size;
        setIsRemoving(true);
        try {
            await axios.delete('/api/bucket/company', {
                data: { bucket_id: bucket.id, company_ids: Array.from(selectedIds) },
            });
            toast.success(
                `${count} ${count === 1 ? 'company' : 'companies'} removed from "${bucket.name}"`
            );
            setSelectedIds(new Set());
            setBucketsRefresh(n => n + 1);
            // Dropping rows can leave the current page short or empty, and the
            // cursors we hold no longer line up — reload from the first page.
            rewindPaging();
            fetchCompanies(bucket.id, null);
        } catch (err: unknown) {
            if (!isSessionExpiring()) {
                toast.error(getErrorMessage(err, 'Failed to remove companies from the bucket'));
            }
        } finally {
            setIsRemoving(false);
        }
    };

    const handleNext = () => {
        if (!hasNextPage || !bucketId) return;
        setCursorStack(prev => [...prev, currentCursor ?? '']);
        setCurrentCursor(hasNextPage);
        setCurrentPage(prev => prev + 1);
        fetchCompanies(bucketId, hasNextPage);
    };

    const handlePrev = () => {
        if (cursorStack.length === 0 || !bucketId) return;
        const stack = [...cursorStack];
        const prevCursor = stack.pop() ?? null;
        setCursorStack(stack);
        setCurrentCursor(prevCursor);
        setCurrentPage(prev => prev - 1);
        fetchCompanies(bucketId, prevCursor);
    };

    return (
        <div className="flex h-full">
            {/* Left: the bucket rail */}
            <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border">
                <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
                    <h2 className="text-sm font-semibold">My Buckets</h2>
                </div>
                <BucketList
                    selectedId={bucket?.id ?? null}
                    onSelect={selectBucket}
                    onSelectedDeleted={handleBucketEmptied}
                    refreshToken={bucketsRefresh}
                />
            </aside>

            {/* Right: the companies inside the selected bucket */}
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="shrink-0 space-y-3 border-b border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                            {bucket?.is_favorite && <Star className="h-4 w-4 shrink-0 fill-warning text-warning" />}
                            <h1 className="truncate text-lg font-bold">{bucket?.name ?? 'No bucket selected'}</h1>
                            {bucket && (
                                <span className="shrink-0 text-sm text-muted-foreground">
                                    {isLoading
                                        ? '· loading…'
                                        : `· ${totalResults.toLocaleString()} ${totalResults === 1 ? 'company' : 'companies'}`}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                data-tooltip-id="bucket-enrich-tip"
                                onClick={() => enrich(selectedIds, () => setSelectedIds(new Set()), refresh, applyEnrichUpdate)}
                                disabled={selectedIds.size <= 1 || isEnriching}
                                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isEnriching
                                    ? <><Loader2 className="h-4 w-4 animate-spin" />Enriching...</>
                                    : <><Zap className="h-4 w-4" />Batch Enrich{selectedIds.size > 1 && ` (${selectedIds.size})`}</>}
                            </button>
                            <Tooltip
                                id="bucket-enrich-tip"
                                place="left"
                                content={selectedIds.size <= 1
                                    ? 'Select at least 2 companies for batch enrichment'
                                    : 'Enrich selected companies'}
                                className="text-xs! px-2! py-1! rounded-md! bg-foreground! text-background!"
                            />

                            <button
                                type="button"
                                data-tooltip-id="bucket-export-tip"
                                onClick={() => setShowExportModal(true)}
                                disabled={role === 'FREE' || selectedIds.size === 0}
                                className={cn(
                                    'flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer',
                                    (role === 'FREE' || selectedIds.size === 0) && 'cursor-not-allowed opacity-50'
                                )}
                            >
                                <Download className="h-4 w-4" /> Export{selectedIds.size > 0 && ` (${selectedIds.size})`}
                            </button>
                            <Tooltip
                                id="bucket-export-tip"
                                place="bottom"
                                content={role === 'FREE'
                                    ? 'Please upgrade to export companies'
                                    : selectedIds.size === 0
                                        ? 'Select companies to export'
                                        : 'Export selected companies'}
                                className="text-xs! px-2! py-1! rounded-md! bg-foreground! text-background!"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative min-w-50 flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={searchText}
                                onChange={e => changeSearch(e.target.value)}
                                disabled={!bucket}
                                placeholder="Search companies in this bucket..."
                                className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                            />
                            {searchText && (
                                <button
                                    type="button"
                                    onClick={() => changeSearch('')}
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
                            setSortBy={changeSortBy}
                            setSortOrder={changeSortOrder}
                            options={sortOptions}
                        />

                        <button
                            type="button"
                            data-tooltip-id="bucket-remove-tip"
                            onClick={handleRemoveFromBucket}
                            disabled={!bucket || selectedIds.size === 0 || isRemoving}
                            className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-foreground disabled:hover:border-border"
                        >
                            {isRemoving
                                ? <><Loader2 className="h-4 w-4 animate-spin" />Removing...</>
                                : <><FolderMinus className="h-4 w-4" />Remove{selectedIds.size > 0 && ` (${selectedIds.size})`}</>}
                        </button>
                        <Tooltip
                            id="bucket-remove-tip"
                            place="bottom"
                            content={selectedIds.size === 0
                                ? 'Select companies to remove from this bucket'
                                : `Remove selected companies from "${bucket?.name ?? 'this bucket'}"`}
                            className="text-xs! px-2! py-1! rounded-md! bg-foreground! text-background!"
                        />

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setViewMode('card')}
                                className={cn(
                                    'rounded-md p-2 transition-colors cursor-pointer',
                                    viewMode === 'card' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
                                )}
                                aria-label="Card view"
                            >
                                <Grid3X3 className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={cn(
                                    'rounded-md p-2 transition-colors cursor-pointer',
                                    viewMode === 'table' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
                                )}
                                aria-label="Table view"
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto p-4">
                    {!bucket ? (
                        <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                            <div>
                                <p className="text-lg font-medium">No bucket selected</p>
                                <p className="mt-1 text-sm">Pick a bucket on the left to see its companies</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                    {isLoading
                                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching companies...</>
                                        : <span>Showing {companies.length} of {totalResults.toLocaleString()} companies</span>}
                                </p>
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
                                        onClick={refresh}
                                        disabled={isLoading}
                                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                        <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                                        Refresh
                                    </button>
                                </div>
                            </div>

                            {!isLoading && companies.length === 0 ? (
                                <div className="py-20 text-center text-muted-foreground">
                                    {query.trim() ? (
                                        <>
                                            <p className="text-lg font-medium">No matches in this bucket</p>
                                            <p className="mt-1 text-sm">Nothing here matches &ldquo;{query.trim()}&rdquo;</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-lg font-medium">This bucket is empty</p>
                                            <p className="mt-1 text-sm">Add companies to it from Search or AI Search</p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {viewMode === 'table' ? (
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
                                    ) : (
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
                                        setPerPage={changePerPage}
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        hasNextPage={hasNextPage}
                                        isLoading={isLoading}
                                        onPrev={handlePrev}
                                        onNext={handleNext}
                                    />
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {selectedCompany && (
                <CompanyDrawer
                    id={selectedCompany.id}
                    onClose={() => setSelectedCompany(null)}
                    onEnriched={refresh}
                />
            )}

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
