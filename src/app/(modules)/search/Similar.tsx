'use client';

import { CompanyData } from '@/types/search';

interface SimilarPageProps {
    companies: CompanyData[];
    isLoading: boolean;
    onSelect: (id: string) => void;
}

export default function SimilarPage({ companies, isLoading, onSelect }: SimilarPageProps) {
    return (
        <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-lg border border-border p-3 animate-pulse">
                            <div className="h-3.5 w-2/3 rounded bg-muted mb-2" />
                            <div className="h-3 w-1/2 rounded bg-muted mb-2" />
                            <div className="h-3 w-1/3 rounded bg-muted" />
                        </div>
                    ))
                ) : companies.length === 0 ? (
                    <p className="col-span-full text-center py-8 text-muted-foreground">No similar companies found</p>
                ) : companies.map(c => (
                    <div
                        key={c.company_id}
                        className="rounded-lg border border-border p-3 cursor-pointer"
                        onClick={() => onSelect(c.company_id)}
                    >
                        <p className="font-medium text-sm">{c.company_name}</p>
                        <p className="text-xs text-muted-foreground">{c.city}, {c.state}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{c.naics_code}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
