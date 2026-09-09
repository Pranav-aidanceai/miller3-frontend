'use client';

import { CompanyData } from '@/types/search';

interface SimilarPageProps {
    companies: CompanyData[];
    isLoading: boolean;
    onSelect: (id: string) => void;
}

export default function SimilarPage({ companies, isLoading, onSelect }: SimilarPageProps) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border p-4 animate-pulse">
                        <div className="h-4 w-2/3 rounded bg-muted mb-2.5" />
                        <div className="h-3 w-1/2 rounded bg-muted mb-2" />
                        <div className="h-3 w-1/3 rounded bg-muted" />
                    </div>
                ))
            ) : companies.length === 0 ? (
                <p className="col-span-full text-center py-8 text-muted-foreground">No similar companies found</p>
            ) : companies.map(c => (
                <button
                    key={c.company_id}
                    type="button"
                    onClick={() => onSelect(c.company_id)}
                    className="rounded-xl border border-border p-4 text-left transition-colors cursor-pointer hover:border-primary/40 hover:bg-accent"
                >
                    <p className="truncate font-semibold" title={c.company_name}>{c.company_name}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{[c.city, c.state].filter(Boolean).join(', ')}</p>
                    <p className="mt-1 text-sm text-muted-foreground font-mono">{c.naics_code ?? 'NA'}</p>
                </button>
            ))}
        </div>
    );
}
