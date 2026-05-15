'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { getSimilarCompanyAction } from './searchServices';
import { CompanyData } from '@/types/search';

interface SimilarPageProps {
    companyId: string;
}

export default function SimilarPage({ companyId }: SimilarPageProps) {

    const [companyData, setCompanyData] = useState<CompanyData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchCompanies = async (cursorValue: string | null = null) => {
        setIsLoading(true);
        try {
            const payload = {
                company_id: companyId,
                limit: 5,
                cursor: cursorValue
            };
            const response = await getSimilarCompanyAction(payload);
            setCompanyData(response.data.results);
        } catch (error) {
            console.error(error)
            toast.error('Failed to fetch companies');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies(null);
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
                    <div key={c.id} className="rounded-lg border border-border p-3">
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