'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Loader2, Sparkles } from 'lucide-react';
import { getTemplateAction, submitQueryAction } from './aisearch-services';
import { ApiError } from '@/types/common';
import { useFormik } from 'formik';
import { CompanyDrawer } from '../search/CompanyDrawer';

type Template = {
  id: number;
  title: string;
  description: string;
  query: string;
};

type AIResult = {
  id: number;
  company_name: string;
  city: string;
  employee_size: string;
};


export default function AISearchPage() {

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [results, setResults] = useState<AIResult[]>([]);
  const [generatedSql, setGeneratedSql] = useState<string | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<AIResult | null>(null);

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
      const { data, errors } = await submitQueryAction(query);
      if (errors) {
        setThinking(false);
        errors.forEach((err: { error: ApiError }) => {
          setError(err.error.detail)
        })
      } else {
        setThinking(false);
        setResults(data.results);
        setGeneratedSql(data.generated_sql);
      }
    }
  })

  return (
    <div className='w-full h-full flex justify-center'>
      <div className="mx-auto max-w-4xl relative top-2/12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">AI Search</h1>
          <p className="text-muted-foreground mt-1">Describe what you&apos;re looking for in plain English</p>
        </div>

        {/* Input */}
        <div className="relative">
          <textarea
            data-tour="ai-search-input"
            name="query"
            value={formik.values.query}
            onChange={formik.handleChange}
            placeholder="e.g. Find companies in the software industry with revenue greater than $10M"
            className="w-full min-w-4xl rounded-lg border border-input bg-background p-4 pr-24 text-sm outline-none focus:ring-2 focus:ring-ring resize-none min-h-20"
            rows={3}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); } }}
            disabled
          />
          <button
            type="button"
            data-tour="ai-search-button"
            className="absolute right-3 bottom-3 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed active:scale-[0.98]"
            disabled
            onClick={() => formik.handleSubmit()}
          >
            <Sparkles className="h-4 w-4" /> Search
          </button>
        </div>

        <div data-tour="ai-search-examples" className="mt-4 flex flex-wrap gap-2">
          {loading && (
            <div className="w-4xl flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading example queries...
            </div>
          )}
          {templates.map(template => (
            <button
              key={template.id}
              disabled
              onClick={() => {
                formik.setValues({ query: template.query })
                formik.handleSubmit();
              }}
              className="rounded-md cursor-pointer border border-border px-3 py-1 text-xs hover:border-primary/40 hover:bg-accent transition-colors"
            >
              {template.query}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-destruccleartive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
        )}

        {/* Thinking */}
        {thinking && (
          <div className="mt-8 text-center">
            <div className="flex justify-center gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Analyzing your query...</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-6 animate-fade-in">
            <button onClick={() => setShowSql(!showSql)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
              {showSql ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Generated SQL
            </button>
            {showSql && (
              <pre className="mb-4 rounded-lg bg-muted p-4 text-xs font-mono overflow-x-auto">{generatedSql}</pre>
            )}

            <p className="text-sm text-muted-foreground mb-3">{results.length} results</p>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Company</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Employees</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCompany(c)}
                      className="border-b border-border cursor-pointer transition-colors hover:bg-accent/50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{c?.company_name}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{c?.city}</td>
                      <td className="px-4 py-3 text-right">{c?.employee_size}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!thinking && results.length === 0 && generatedSql && (
          <div className="mt-8 text-center">
            <p className="text-muted-foreground">No results found</p>
          </div>
        )}

        {selectedCompany && <CompanyDrawer id={selectedCompany.id.toString()} onClose={() => setSelectedCompany(null)} />}
      </div>
    </div>
  );
}