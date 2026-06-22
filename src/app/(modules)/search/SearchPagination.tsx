import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface SearchPaginationProps {
    perPage: number;
    setPerPage: (value: number) => void;
    currentPage: number;
    hasNextPage: string | null;
    isLoading: boolean;
    onPrev: () => void;
    onNext: () => void;
}

export default function SearchPagination({
    perPage,
    setPerPage,
    currentPage,
    hasNextPage,
    isLoading,
    onPrev,
    onNext,
}: SearchPaginationProps) {
    return (
        <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="relative">
                    <select
                        value={perPage}
                        onChange={e => setPerPage(Number(e.target.value))}
                        className="h-9 rounded-md border border-input bg-background px-2 pr-8 text-sm appearance-none cursor-pointer"
                    >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                <span className="text-xs text-muted-foreground">per page</span>
            </div>

            <div className="flex items-center gap-1">
                <button
                    disabled={currentPage === 1 || isLoading}
                    onClick={onPrev}
                    className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent cursor-pointer"
                >
                    Prev
                </button>

                {[currentPage - 1, currentPage, currentPage + 1]
                    .filter((p) => p >= 1 && (p < currentPage || p === currentPage || hasNextPage))
                    .map((p) => {
                        const isActive = p === currentPage;
                        return (
                            <button
                                key={p}
                                disabled={isLoading}
                                onClick={() => {
                                    if (p === currentPage - 1) onPrev();
                                    else if (p === currentPage + 1) onNext();
                                }}
                                className={cn(
                                    'min-w-8 rounded-md border px-2 py-1.5 text-sm transition-colors cursor-pointer',
                                    isActive
                                        ? 'border-primary bg-primary text-primary-foreground font-semibold pointer-events-none'
                                        : 'border-border hover:bg-accent disabled:opacity-50'
                                )}
                            >
                                {p}
                            </button>
                        );
                    })}

                <button
                    disabled={!hasNextPage || isLoading}
                    onClick={onNext}
                    className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-accent cursor-pointer"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
