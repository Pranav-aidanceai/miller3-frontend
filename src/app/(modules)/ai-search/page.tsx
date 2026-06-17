'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Download, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTemplateAction, submitQueryAction } from './aisearch-services';
import { ApiError } from '@/types/common';
import { useFormik } from 'formik';
import { CompanyDrawer } from '../search/CompanyDrawer';
import ExportModal from '../search/ExportModal';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { useSearchParams} from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { updateAiSearchCredits, updateExportCredits } from "@/store/slices/authSlice"

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
  phone: string | null;
  email: string | null;
  website: string | null;
  employee_size: string;
};

export default function AISearchPage() {

  const dispatch = useDispatch();
  const role = useSelector((state: RootState) => state.auth.role);
  const exportCreditsLeft = useSelector((state: RootState) => state.auth.credits_left.export);
  const searchParams = useSearchParams();
  const q = searchParams.get('q');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [results, setResults] = useState<AIResult[]>([]);
  const [generatedSql, setGeneratedSql] = useState<string | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<AIResult | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [rowLimit, setRowLimit] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  // AI search results are capped at 200 rows by the backend.
  const MAX_AI_EXPORT_ROWS = 200;

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      setError(null);
      const { data, errors } = await getTemplateAction();
      if (errors) {
        setLoading(false);
        errors?.forEach((err: ApiError) => {
          setError(prev => prev + err.message)
        })
      } else {
        setLoading(false);
        setTemplates(data);
      }
    };
    fetchTemplates();
  }, [])

  const formik = useFormik({
    initialValues: {
      query: '',
    },
    onSubmit: async (values) => {
      setResults([]);
      setGeneratedSql(null);
      setThinking(true);
      setError(null);
      const query = values.query.trim();
      formik.resetForm();
      const { data, errors, headers } = await submitQueryAction(query);
      dispatch(updateAiSearchCredits(headers))
      if (errors) {
        setThinking(false);
        errors.forEach((err: { error: ApiError }) => {
          setError(err.error.detail)
        })
      } else {
        setThinking(false);
        setResults(data.results);
        setGeneratedSql(data.generated_sql);
        setRowLimit(Math.min(data.results.length || 1, MAX_AI_EXPORT_ROWS));
      }
    }
  })

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
        { responseType: 'blob' }
      );
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-');
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).replace(/:/g, '-');
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
          const text = err.response.data instanceof Blob
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

  useEffect(() => {
    if (q) {
      formik.setValues({ query: q });
      formik.handleSubmit();
    }
    // Only re-run when the `q` query param changes; formik is stable here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const formatLocation = (c: AIResult) => [c.city, c.state].filter(Boolean).join(', ');
  type Column = {
    key: string;
    header: string;
    align: 'left' | 'right';
    show: boolean;
    render: (c: AIResult) => React.ReactNode;
    cellClass?: string;
  };
  const columns: Column[] = ([
    { key: 'company', header: 'Company', align: 'left', show: true, render: c => <p className="font-medium">{c.company_name}</p> },
    { key: 'location', header: 'Location', align: 'left', show: results.some(c => formatLocation(c)), render: c => formatLocation(c) || '—' },
    { key: 'naics_code', header: 'NAICS Code', align: 'left', show: results.some(c => c.naics_code), render: c => c.naics_code || '—', cellClass: 'font-mono text-xs' },
    { key: 'phone', header: 'Phone', align: 'left', show: results.some(c => c.phone), render: c => c.phone || '—' },
    { key: 'email', header: 'Email', align: 'left', show: results.some(c => c.email), render: c => c.email || '—' },
    { key: 'website', header: 'Website', align: 'left', show: results.some(c => c.website), render: c => c.website || '—' },
  ] as Column[]).filter(col => col.show);

  return (
    <div className="flex h-full flex-col items-center overflow-hidden px-5 py-6">
      <div className="flex h-full w-full max-w-5xl flex-col">
        {/* Header */}
        <div className="shrink-0 text-center mb-6">
          <h1 className="text-2xl font-bold">AI Search</h1>
          <p className="text-muted-foreground mt-1">Describe what you&apos;re looking for in plain English</p>
        </div>

        {/* Input */}
        <div className="relative shrink-0">
          <textarea
            data-tour="ai-search-input"
            name="query"
            value={formik.values.query}
            onChange={formik.handleChange}
            placeholder="e.g. Find companies in the software industry with revenue greater than $10M"
            className="w-full rounded-lg border border-input bg-background p-4 pr-28 text-sm outline-none focus:ring-2 focus:ring-ring resize-none min-h-20"
            rows={3}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                formik.handleSubmit();
              }
            }}
          />
          <button
            type="button"
            disabled={formik.values.query.trim() === '' || thinking}
            data-tour="ai-search-button"
            className="absolute right-3 bottom-3 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed active:scale-[0.98]"
            onClick={() => formik.handleSubmit()}
          >
            <Sparkles className="h-4 w-4" /> Search
          </button>
        </div>

        {/* Toolbar: templates on the left, persistent Export on the right */}
        <div className="mt-4 flex shrink-0 items-start justify-between gap-4">
          <div data-tour="ai-search-examples" className="flex flex-1 flex-wrap gap-2">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading example queries...
              </div>
            )}
            {templates.map(template => (
              <button
                key={template.id}
                disabled={thinking}
                onClick={() => {
                  formik.setValues({ query: template.query })
                  formik.handleSubmit();
                }}
                className="rounded-md cursor-pointer border border-border px-3 py-1 text-xs hover:border-primary/40 hover:bg-accent transition-colors disabled:opacity-50"
              >
                {template.query}
              </button>
            ))}
          </div>

          <button
            data-tooltip-id="ai-export-tip"
            onClick={() => setShowExportModal(true)}
            disabled={role === 'FREE'}
            className={cn("flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer",
              role === 'FREE' && 'cursor-not-allowed opacity-50'
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

        {error && (
          <div className="mt-4 shrink-0 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
        )}

        {/* Thinking */}
        {thinking && (
          <div className="mt-8 shrink-0 text-center">
            <div className="flex justify-center gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Analyzing your query...</p>
          </div>
        )}

        {/* Results */}
        {!thinking && results.length > 0 && (
          <div className="mt-5 flex min-h-0 flex-1 flex-col animate-fade-in">
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <p className="text-sm text-muted-foreground">{results.length} results</p>
              <button onClick={() => setShowSql(!showSql)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                {showSql ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Generated SQL
              </button>
            </div>
            {showSql && (
              <pre className="mb-3 max-h-40 shrink-0 overflow-auto rounded-lg bg-muted p-4 text-xs font-mono">{generatedSql}</pre>
            )}

            {/* Scrollable table: header stays fixed, body scrolls */}
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-muted">
                    {columns.map(col => (
                      <th key={col.key} className={`whitespace-nowrap px-4 py-3 font-medium text-muted-foreground ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCompany(c)}
                      className="border-b border-border cursor-pointer transition-colors hover:bg-accent/50"
                    >
                      {columns.map(col => (
                        <td key={col.key} className={`whitespace-nowrap px-4 py-3 ${col.align === 'right' ? 'text-right' : ''} ${col.cellClass ?? ''}`}>
                          {col.render(c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!thinking && results.length === 0 && generatedSql && (
          <div className="mt-8 shrink-0 text-center">
            <p className="text-muted-foreground">No results found</p>
          </div>
        )}

        {selectedCompany && <CompanyDrawer id={selectedCompany.id.toString()} onClose={() => setSelectedCompany(null)} />}

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
    </div>
  );
}