'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Grid3X3,
  List,
  Loader2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTemplateAction, submitQueryAction } from './aisearch-services';
import { isCreditError, showCreditLimitToast } from '../search/apiError';
import { isSessionExpiring } from '@/lib/session';
import { useFormik } from 'formik';
import { CompanyDrawer } from '../search/CompanyDrawer';
import ExportModal from '../search/ExportModal';
import CompanyTable from '../search/CompanyTable';
import CompanyCards from '../search/CompanyCards';
import { useBatchEnrich } from '../search/useBatchEnrich';
import { Company } from '@/types/search';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { useSearchParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { updateAiSearchCredits, updateExportCredits } from '@/store/slices/authSlice';

type Template = {
  id: number;
  title: string;
  description: string;
  query: string;
};

type AIResult = {
  id: string;
  company_name: string;
  city: string | null;
  state: string | null;
  naics_code: string | null;
  sic_code?: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  employee_size: string | number | null;
  annual_revenue?: number | null;
  year_founded?: number | null;
  enrichment_status?: 'unenriched' | 'enriched' | 'pending';
};

// The AI endpoint returns a slimmer row than the standard search; normalise it
// to a `Company` so the shared table/card components render it identically.
const toCompany = (r: AIResult): Company => {
  const emp =
    r.employee_size === null || r.employee_size === undefined || r.employee_size === ''
      ? null
      : Number(r.employee_size);
  return {
    id: String(r.id),
    company_name: r.company_name,
    city: r.city ?? '',
    state: r.state ?? '',
    naics_code: r.naics_code,
    sic_code: r.sic_code ?? null,
    employee_size: emp != null && !Number.isNaN(emp) ? emp : null,
    annual_revenue: r.annual_revenue ?? null,
    year_founded: r.year_founded ?? null,
    enrichment_status: r.enrichment_status ?? 'unenriched',
    phone: r.phone,
    email: r.email,
    website: r.website,
    has_mobile_number: !!r.phone,
    has_email: !!r.email,
    has_website: !!r.website,
  };
};

type ChatEntry = {
  id: string;
  query: string;
  status: 'thinking' | 'done' | 'error';
  count?: number;
  sql?: string | null;
  message?: string | null;
  error?: string;
  errorCode?: string | null;
};

export default function AISearchPage() {
  const dispatch = useDispatch();
  const role = useSelector((state: RootState) => state.auth.role);
  const exportCreditsLeft = useSelector((state: RootState) => state.auth.credits_left.export);
  const searchParams = useSearchParams();
  const q = searchParams.get('q');

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [thinking, setThinking] = useState(false);
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [expandedSql, setExpandedSql] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<AIResult[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState('');

  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [rowLimit, setRowLimit] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const { isEnriching, enrich } = useBatchEnrich();

  // AI search results are capped at 200 rows by the backend.
  const MAX_AI_EXPORT_ROWS = 200;

  const hasSearched = chat.length > 0;
  const companies = useMemo(() => results.map(toCompany), [results]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Grow the single-line input as the query wraps, capped so it never takes over.
  // Only show a scrollbar once we hit the cap — otherwise an empty box scrolls.
  const autoResize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, 160);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > 160 ? 'auto' : 'hidden';
  }, []);

  // Fit to a single line on mount and whenever the composer re-mounts.
  useEffect(() => {
    autoResize();
  }, [autoResize, hasSearched]);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      const { data, errors } = await getTemplateAction();
      setLoading(false);
      if (errors) {
        // A 403 (account deactivated) is handled by the global deactivation modal.
        if (isSessionExpiring()) return;
        const { message, code } = errors[0];
        if (isCreditError(code)) {
          showCreditLimitToast({
            detail: message,
            fallbackMessage: "You've reached your monthly AI search credit limit. Contact your admin to request more credits.",
            mailtoSubject: 'Request for more AI search credits',
          });
        } else {
          toast.error(message, {
            duration: 5000,
            className: '!bg-destructive !text-white !border-destructive',
          });
        }
        return;
      }
      setTemplates(data);
    };
    fetchTemplates();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const toggleSql = (id: string) =>
    setExpandedSql(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runQuery = useCallback(
    async (rawQuery: string, opts?: { silent?: boolean }) => {
      const query = rawQuery.trim();
      if (!query) return;
      const silent = opts?.silent ?? false;
      setLastQuery(query);

      let entryId: string | null = null;
      if (!silent) {
        entryId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setChat(prev => [...prev, { id: entryId!, query, status: 'thinking' }]);
        setResults([]);
        setStatusMessage(null);
        setThinking(true);
      }

      const { data, errors, headers } = await submitQueryAction(query);
      dispatch(updateAiSearchCredits(headers));
      setThinking(false);

      if (errors) {
        let detail = 'AI search failed';
        let code: string | null = null;
        errors.forEach((err: { error: { detail: string; error_code: string | null } }) => {
          detail = err.error.detail;
          code = err.error.error_code ?? null;
        });
        if (entryId) {
          setChat(prev =>
            prev.map(c => (c.id === entryId ? { ...c, status: 'error', error: detail, errorCode: code } : c)),
          );
        }
        return;
      }

      const rows: AIResult[] = data.results ?? [];
      // A 200 can still be a non-answer (e.g. status "invalid_query") with an
      // explanatory message and no rows — surface that message to the user.
      const message: string | null = rows.length === 0 ? data.message ?? null : null;
      setResults(rows);
      setStatusMessage(message);
      setSelectedIds(new Set());
      setRowLimit(Math.min(rows.length || 1, MAX_AI_EXPORT_ROWS));
      if (entryId) {
        setChat(prev =>
          prev.map(c =>
            c.id === entryId
              ? { ...c, status: 'done', count: rows.length, sql: data.generated_sql, message }
              : c,
          ),
        );
      }
    },
    [dispatch],
  );

  const formik = useFormik({
    initialValues: { query: '' },
    onSubmit: async values => {
      const query = values.query;
      formik.resetForm();
      requestAnimationFrame(autoResize);
      await runQuery(query);
    },
  });

  // Re-run the last query (e.g. after a batch enrich) without adding a chat turn.
  const refreshResults = useCallback(() => {
    if (lastQuery) runQuery(lastQuery, { silent: true });
  }, [lastQuery, runQuery]);

  const handleExport = async () => {
    if (rowLimit < 1) {
      toast.error('Enter a row count of at least 1.');
      return;
    }
    if (role !== 'ADMIN' && rowLimit > exportCreditsLeft) {
      toast.error(`You only have ${exportCreditsLeft} export credits left.`);
      return;
    }

    setIsExporting(true);
    try {
      const response = await axios.post(
        '/api/ai-export',
        { format: exportFormat, row_limit: rowLimit },
        { responseType: 'blob' },
      );
      const now = new Date();
      const dateStr = now
        .toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
        .replace(/\//g, '-');
      const timeStr = now
        .toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        .replace(/:/g, '-');
      const filename = `ai_search_export_${dateStr}_${timeStr}.${exportFormat}`;
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const remaining = parseInt(response.headers['x-export-credits-remaining'] ?? '0');
      dispatch(updateExportCredits(remaining));
      toast.success(`Downloaded ${filename}`);
      setShowExportModal(false);
    } catch (err) {
      let detail = 'Export failed. Please try again.';
      if (axios.isAxiosError(err) && err.response?.data) {
        try {
          // Error responses arrive as a Blob because responseType is 'blob'.
          const text =
            err.response.data instanceof Blob
              ? await err.response.data.text()
              : JSON.stringify(err.response.data);
          const body = JSON.parse(text);
          const parsed = typeof body.error === 'string' ? JSON.parse(body.error) : body.error;
          if (parsed?.detail) detail = parsed.detail;
          else if (typeof body.error === 'string') detail = body.error;
        } catch {
          // fall back to the generic message
        }
      }
      toast.error(detail, {
        duration: 5000,
        className: '!bg-destructive !text-white !border-destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Keep the latest formik instance in a ref so the `q` effect depends only on `q`.
  const formikRef = useRef(formik);
  useEffect(() => {
    formikRef.current = formik;
  });

  useEffect(() => {
    if (q) {
      formikRef.current.setValues({ query: q });
      formikRef.current.handleSubmit();
    }
  }, [q]);

  const allSelected = companies.length > 0 && companies.every(c => selectedIds.has(c.id));

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelectAll = () =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) companies.forEach(c => next.delete(c.id));
      else companies.forEach(c => next.add(c.id));
      return next;
    });

  // The chat composer — rendered centered before the first query, docked after.
  const composer = (
    <form onSubmit={formik.handleSubmit} className="relative w-full">
      <textarea
        ref={inputRef}
        data-tour="ai-search-input"
        name="query"
        rows={1}
        value={formik.values.query}
        onChange={e => {
          formik.handleChange(e);
          autoResize();
        }}
        placeholder="Describe what you're looking for…"
        className="w-full resize-none overflow-hidden rounded-2xl border border-input bg-background py-3.5 pl-4 pr-14 text-sm outline-none focus:ring-2 focus:ring-ring"
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            formik.handleSubmit();
          }
        }}
      />
      <button
        type="submit"
        disabled={formik.values.query.trim() === '' || thinking}
        data-tour="ai-search-button"
        aria-label="Search"
        className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 cursor-pointer"
      >
        {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      </button>
    </form>
  );

  // ---- Pre-search: centered hero with the composer and example prompts ----
  if (!hasSearched) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">AI Search</h1>
            <p className="mt-1 text-muted-foreground">
              Describe what you&apos;re looking for in plain English
            </p>
          </div>

          {composer}

          <div data-tour="ai-search-examples" className="mt-5 flex flex-wrap justify-center gap-2">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading example queries...
              </div>
            )}
            {templates.map(template => (
              <button
                key={template.id}
                type="button"
                disabled={thinking}
                onClick={() => {
                  formik.setValues({ query: template.query });
                  formik.handleSubmit();
                }}
                className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:border-primary/40 hover:bg-accent disabled:opacity-50"
              >
                {template.query}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- Post-search: chat thread on the left, results table on the right ----
  return (
    <div className="flex h-full">
      {/* Left: conversation + docked composer */}
      <div className="flex h-full w-full max-w-md shrink-0 flex-col border-r border-border">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {chat.map(entry => (
            <div key={entry.id} className="space-y-2">
              {/* User bubble */}
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                  {entry.query}
                </div>
              </div>

              {/* Assistant bubble */}
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-2 text-sm">
                  {entry.status === 'thinking' && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <div
                            key={i}
                            className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
                            style={{ animationDelay: `${i * 0.2}s` }}
                          />
                        ))}
                      </div>
                      Analyzing your query...
                    </div>
                  )}

                  {entry.status === 'done' && (
                    <div className="space-y-2">
                      {entry.count === 0 ? (
                        <p className="text-muted-foreground">
                          {entry.message || 'No companies matched your query.'}
                        </p>
                      ) : (
                        <p>
                          Found <span className="font-semibold">{entry.count}</span>{' '}
                          {entry.count === 1 ? 'company' : 'companies'}.
                        </p>
                      )}
                      {entry.sql && (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleSql(entry.id)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            {expandedSql.has(entry.id) ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                            Generated SQL
                          </button>
                          {expandedSql.has(entry.id) && (
                            <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs font-mono">
                              {entry.sql}
                            </pre>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {entry.status === 'error' && (
                    <div className="space-y-2 text-destructive">
                      <p>{entry.error}</p>
                      {entry.errorCode === 'HTTP_402' && (
                        <a
                          href="mailto:admin@miller3.com?subject=Request for more AI search credits"
                          className="inline-block rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-destructive/90"
                        >
                          Contact Admin for more credits
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="shrink-0 border-t border-border p-3">{composer}</div>
      </div>

      {/* Right: results table with toolbar */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <p className="text-sm text-muted-foreground">
            {thinking && results.length === 0
              ? 'Searching…'
              : `${results.length} result${results.length === 1 ? '' : 's'}`}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {viewMode === 'card' && companies.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={cn(
                  'rounded-md p-2 transition-colors cursor-pointer',
                  viewMode === 'card'
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
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
                  viewMode === 'table'
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-label="Table view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => enrich(selectedIds, () => setSelectedIds(new Set()), refreshResults)}
              disabled={selectedIds.size <= 1 || isEnriching}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isEnriching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enriching...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Batch Enrich{selectedIds.size > 1 && ` (${selectedIds.size})`}
                </>
              )}
            </button>

            <button
              data-tooltip-id="ai-export-tip"
              onClick={() => setShowExportModal(true)}
              disabled={role === 'FREE' || results.length === 0}
              className={cn(
                'flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer',
                (role === 'FREE' || results.length === 0) && 'cursor-not-allowed opacity-50',
              )}
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <Tooltip
              id="ai-export-tip"
              place="bottom"
              content={role === 'FREE' ? 'Please upgrade to export search results' : 'Export your last query'}
              className="text-xs! px-2! py-1! rounded-md! bg-foreground! text-background!"
            />
          </div>
        </div>

        {/* Results */}
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {results.length === 0 && !thinking ? (
            <div className="flex h-full items-center justify-center text-center text-muted-foreground">
              <div className="max-w-md">
                <p className="text-lg font-medium">No results found</p>
                <p className="mt-1 text-sm">{statusMessage || 'Try rephrasing your query.'}</p>
              </div>
            </div>
          ) : viewMode === 'table' ? (
            <CompanyTable
              companies={companies}
              isLoading={thinking && results.length === 0}
              perPage={companies.length || 10}
              selectedIds={selectedIds}
              allSelected={allSelected}
              notAccessibleFields={[]}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onRowClick={setSelectedCompany}
            />
          ) : (
            <CompanyCards
              companies={companies}
              isLoading={thinking && results.length === 0}
              selectedIds={selectedIds}
              notAccessibleFields={[]}
              onToggleSelect={toggleSelect}
              onCardClick={setSelectedCompany}
            />
          )}
        </div>
      </div>

      {selectedCompany && (
        <CompanyDrawer
          id={selectedCompany.id}
          onClose={() => setSelectedCompany(null)}
          onEnriched={refreshResults}
        />
      )}

      {showExportModal && (
        <ExportModal
          showExportModal={showExportModal}
          setShowExportModal={setShowExportModal}
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
          handleExport={handleExport}
          isExporting={isExporting}
          rowLimit={rowLimit}
          setRowLimit={setRowLimit}
          maxRows={role === 'ADMIN' ? undefined : exportCreditsLeft}
        />
      )}
    </div>
  );
}
