'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

const examplePrompts = [
  'Healthcare companies in California',
  'Minority-owned logistics firms in Texas',
  'Tech startups founded after 2020',
  'Manufacturing companies with revenue over 10 million',
  'Construction firms in Cook County',
  'Restaurants in New York',
  'Companies with missing contact info',
  'Women-owned businesses',
  'Veteran-owned companies',
];

export default function AISearchPage() {

  const [prompt, setPrompt] = useState('');

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
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="This feature is coming soon! In the meantime, here are some example prompts to try out once it's live."
            className="w-full rounded-lg border border-input bg-background p-4 pr-24 text-sm outline-none focus:ring-2 focus:ring-ring resize-none min-h-[80px]"
            rows={3}
            disabled
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); } }}
          />
          <button
            data-tour="ai-search-button"
            className="absolute right-3 bottom-3 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            disabled
          >
            <Sparkles className="h-4 w-4" /> Search
          </button>
        </div>

        {/* Example prompts */}
        <div data-tour="ai-search-examples" className="mt-4 flex flex-wrap gap-2">
          {examplePrompts.slice(0, 6).map(p => (
            <button key={p}
              className="rounded-md cursor-pointer border border-border px-3 py-1 text-xs hover:border-primary/40 hover:bg-accent transition-colors">
              {p}
            </button>
          ))}
        </div>

        {/* {error && (
        <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      )} */}

        {/* Thinking */}
        {/* {thinking && (
        <div className="mt-8 text-center">
          <div className="flex justify-center gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="h-2 w-2 rounded-full bg-primary" style={{ animation: `pulse_dot 1.4s infinite ${i * 0.2}s` }} />
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Analyzing your query...</p>
        </div>
      )} */}

        {/* Results */}
        {/* {results && (
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
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">NAICS</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Employees</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 50).map(c => (
                  <tr key={c.id} onClick={() => setSelectedCompany(c)}
                    className="border-b border-border cursor-pointer transition-colors hover:bg-accent/50">
                    <td className="px-4 py-3"><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.city}, {c.state}</p></td>
                    <td className="px-4 py-3 font-mono text-xs">{c.naics_code}</td>
                    <td className="px-4 py-3 text-right">{c.employees.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{formatRev(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )} */}

        {/* {selectedCompany && <CompanyDrawer company={selectedCompany} onClose={() => setSelectedCompany(null)} />} */}
      </div>
    </div>
  );
}