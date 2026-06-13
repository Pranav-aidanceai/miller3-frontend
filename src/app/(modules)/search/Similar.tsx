'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { toast } from 'sonner';
import { getSimilarCompanyAction } from './searchServices';
import { CompanyData } from '@/types/search';
import type { SimilarMapPoint } from './SimilarMap';

// Leaflet relies on `window`, so load the map only on the client.
const SimilarMap = dynamic(() => import('./SimilarMap'), {
    ssr: false,
    loading: () => (
        <div className="flex h-72 w-full items-center justify-center rounded-lg border border-border bg-muted/30">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
    ),
});

interface SimilarPageProps {
    companyId: string;
    handleFetch: (id: string) => void
}

export default function SimilarPage({ companyId, handleFetch }: SimilarPageProps) {

    const [companyData, setCompanyData] = useState<CompanyData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [mapPoints, setMapPoints] = useState<SimilarMapPoint[]>([]);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const response = await getSimilarCompanyAction({ company_id: companyId, limit: 5, cursor: null });
                if (active) setCompanyData(response.data.results);
            } catch {
                if (active) toast.error('Failed to fetch companies');
            } finally {
                if (active) setIsLoading(false);
            }
        })();
        // Map is supplementary — fail quietly and just show the list.
        (async () => {
            try {
                const res = await axios.get('/api/similar-map', { params: { companyId, limit: 5 } });
                if (active) setMapPoints(res.data.data ?? []);
            } catch {
                // ignore
            }
        })();
        return () => { active = false; };
    }, [companyId]);

    // const handleNext = () => {
    //     if (!hasNextPage) return;
    //     setCursorStack(prev => [...prev, currentCursor ?? '']);
    //     setCurrentCursor(hasNextPage);
    //     fetchCompanies(hasNextPage);
    // };

    // const handlePrev = () => {
    //     if (cursorStack.length === 0) return;
    //     const stack = [...cursorStack];
    //     const prevCursor = stack.pop() ?? null;
    //     setCursorStack(stack);
    //     setCurrentCursor(prevCursor);
    //     fetchCompanies(prevCursor);
    // };

    return (
        <div className="flex-1 overflow-auto">
            {mapPoints.length > 0 && (
                <div className="mb-4">
                    <SimilarMap points={mapPoints} onSelect={handleFetch} />
                </div>
            )}
            {/* <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                <span>Showing {companyData?.length} of {totalResults.toLocaleString()} results</span>
            </div> */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-lg border border-border p-3 animate-pulse">
                            <div className="h-3.5 w-2/3 rounded bg-muted mb-2" />
                            <div className="h-3 w-1/2 rounded bg-muted mb-2" />
                            <div className="h-3 w-1/3 rounded bg-muted" />
                        </div>
                    ))
                ) : companyData.length === 0 ? (
                    <p className="col-span-full text-center py-8 text-muted-foreground">No similar companies found</p>
                ) : companyData.map(c => (
                    <div
                        key={c.company_id}
                        className="rounded-lg border border-border p-3 cursor-pointer"
                        onClick={() => {
                            handleFetch(c.company_id)
                        }}
                    >
                        <p className="font-medium text-sm">{c.company_name}</p>
                        <p className="text-xs text-muted-foreground">{c.city}, {c.state}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{c.naics_code}</p>
                    </div>
                ))}
            </div>
            {/* {(hasNextPage || cursorStack.length > 0) && (
                <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <select value={perPage} onChange={e => setPerPage(Number(e.target.value))}
                                className="h-9 rounded-md border border-input bg-background px-2 pr-8 text-sm appearance-none cursor-pointer">
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                        <span className="text-xs text-muted-foreground">per page</span>
                    </div>
                    <div className="flex gap-1">
                        <button
                            disabled={cursorStack.length === 0 || isLoading}
                            onClick={handlePrev}
                            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent cursor-pointer"
                        >
                            Prev
                        </button>
                        <button
                            disabled={!hasNextPage || isLoading}
                            onClick={handleNext}
                            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )} */}
        </div>
    );
}