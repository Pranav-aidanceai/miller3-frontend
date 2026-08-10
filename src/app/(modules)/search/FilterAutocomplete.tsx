'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { FilterField } from '@/types/search';
import { filterResultsToOptions, getFilterOptionsAction, type FilterOption } from './searchServices';

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 500;
const LOAD_MORE_THRESHOLD = 48;

/** What the "nothing matched" line calls this field's rows. */
const FIELD_NOUNS: Record<FilterField, string> = {
    naics: 'NAICS codes',
    sic: 'SIC codes',
    msa: 'metro areas',
    certification: 'certifications',
};

/** NAICS/SIC values are numeric codes; MSA/certification values are words. */
const MONO_FIELDS: FilterField[] = ['naics', 'sic'];

interface FilterAutocompleteProps {
    label: string;
    field: FilterField;
    value: string;
    onChange: (code: string) => void;
    placeholder: string;
}

export const FilterAutocomplete = ({ label, field, value, onChange, placeholder }: FilterAutocompleteProps) => {
    const [query, setQuery] = useState('');
    const [dismissed, setDismissed] = useState(false);
    const [options, setOptions] = useState<FilterOption[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [activeQuery, setActiveQuery] = useState('');
    const [picked, setPicked] = useState<FilterOption | null>(null);
    const listboxId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<number | null>(null);
    const requestIdRef = useRef(0);

    const isOpen = query.trim().length > 0 && !dismissed;
    const isMono = MONO_FIELDS.includes(field);
    const selectedTitle = picked?.code === value ? picked.title : null;

    useEffect(() => () => {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
    }, []);

    useEffect(() => {
        if (activeIndex < 0) return;
        const row = listRef.current?.children[activeIndex] as HTMLElement | undefined;
        row?.scrollIntoView?.({ block: 'nearest' });
    }, [activeIndex]);

    const runSearch = useCallback(async (q: string, cursor: string | null) => {
        const requestId = ++requestIdRef.current;
        const { data, error: fetchError } = await getFilterOptionsAction(field, { q, cursor, limit: PAGE_SIZE });
        if (requestId !== requestIdRef.current) return;

        if (data) {
            const page = filterResultsToOptions(data.results);
            setOptions(prev => (cursor ? [...prev, ...page] : page));
            setNextCursor(data.next_cursor ?? null);
            setError(null);
        } else {
            if (!cursor) setOptions([]);
            setNextCursor(null);
            setError((fetchError as { detail?: string } | null)?.detail ?? 'Failed to load options');
        }
        setIsLoading(false);
        setIsLoadingMore(false);
    }, [field]);

    const resetResults = () => {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
        requestIdRef.current++;
        setOptions([]);
        setNextCursor(null);
        setActiveQuery('');
        setIsLoading(false);
        setIsLoadingMore(false);
        setError(null);
        setActiveIndex(-1);
    };

    const handleQueryChange = (next: string) => {
        setQuery(next);
        setDismissed(false);
        setActiveIndex(-1);

        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        const q = next.trim();
        if (!q) {
            resetResults();
            return;
        }
        setIsLoading(true);
        debounceRef.current = window.setTimeout(() => {
            debounceRef.current = null;
            setActiveQuery(q);
            if (scrollRef.current) scrollRef.current.scrollTop = 0;
            runSearch(q, null);
        }, DEBOUNCE_MS);
    };

    const loadMore = () => {
        if (!nextCursor || isLoading || isLoadingMore || !activeQuery) return;
        setIsLoadingMore(true);
        runSearch(activeQuery, nextCursor);
    };

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        if (el.scrollHeight - el.scrollTop - el.clientHeight <= LOAD_MORE_THRESHOLD) loadMore();
    };

    const retry = () => {
        if (!activeQuery) return;
        setIsLoading(true);
        setError(null);
        runSearch(activeQuery, null);
    };

    const select = (option: FilterOption) => {
        setPicked(option);
        onChange(option.code);
        setQuery('');
        setDismissed(true);
        resetResults();
        inputRef.current?.focus();
    };

    const clearSelection = () => {
        setPicked(null);
        onChange('');
        setQuery('');
        setDismissed(true);
        resetResults();
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setDismissed(true);
            return;
        }

        if (e.key === 'Backspace' && !query && value) {
            clearSelection();
            return;
        }
        if (!isOpen || options.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => (i + 1) % options.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => (i <= 0 ? options.length - 1 : i - 1));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            select(options[activeIndex]);
        }
    };

    return (
        <div className="mt-2">
            <label className="text-xs font-medium text-muted-foreground">{label}</label>
            <Popover open={isOpen} onOpenChange={open => { if (!open) setDismissed(true); }}>
                <PopoverAnchor asChild>
                    <div
                        onClick={() => inputRef.current?.focus()}
                        className="mt-1 flex h-9 w-full items-center gap-1.5 rounded-md border border-input bg-background px-2 focus-within:ring-1 focus-within:ring-ring"
                    >
                        {value && (
                            // Values like a full MSA name outrun the sidebar, so the
                            // chip is capped and truncated rather than left to push
                            // the input out of the row.
                            <span
                                title={value}
                                className={cn(
                                    'flex min-w-0 max-w-[65%] items-center gap-1 rounded-md border border-primary/40 bg-primary/10 py-0.5 pl-1.5 pr-1 text-xs text-primary',
                                    isMono && 'font-mono'
                                )}
                            >
                                <span className="truncate">{value}</span>
                                <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); clearSelection(); }}
                                    aria-label={`Remove ${value}`}
                                    className="shrink-0 cursor-pointer text-primary/60 transition-colors hover:text-primary"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={e => handleQueryChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={value ? '' : placeholder}
                            role="combobox"
                            aria-expanded={isOpen}
                            aria-controls={listboxId}
                            aria-autocomplete="list"
                            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
                            aria-label={label}
                            className={cn(
                                'h-full min-w-10 flex-1 bg-transparent text-sm outline-none placeholder:font-sans',
                                isMono && 'font-mono'
                            )}
                        />
                        {isLoading && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />}
                    </div>
                </PopoverAnchor>
                <PopoverContent
                    align="start"
                    sideOffset={6}
                    className="w-(--radix-popover-trigger-width) min-w-64 gap-0 p-1"
                    // The input keeps focus and the keyboard — this is a listbox only.
                    onOpenAutoFocus={e => e.preventDefault()}
                    onCloseAutoFocus={e => e.preventDefault()}
                >
                    <div ref={scrollRef} onScroll={handleScroll} className="max-h-64 overflow-y-auto overscroll-contain">
                        {isLoading ? (
                            <div className="space-y-1 p-1">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-7 rounded bg-muted animate-pulse" />
                                ))}
                            </div>
                        ) : error ? (
                            <div className="px-2 py-3 text-center">
                                <p className="text-xs text-muted-foreground">{error}</p>
                                <button type="button" onClick={retry} className="mt-1 cursor-pointer text-xs text-primary hover:underline">
                                    Retry
                                </button>
                            </div>
                        ) : options.length === 0 ? (
                            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                                No {FIELD_NOUNS[field]} match &ldquo;{activeQuery}&rdquo;
                            </p>
                        ) : (
                            <>
                                <div ref={listRef} id={listboxId} role="listbox" aria-label={`${label} results`}>
                                    {options.map((option, index) => (
                                        <button
                                            key={option.code}
                                            id={`${listboxId}-${index}`}
                                            type="button"
                                            role="option"
                                            aria-selected={option.code === value}
                                            onClick={() => select(option)}
                                            onMouseEnter={() => setActiveIndex(index)}
                                            className={cn(
                                                'flex w-full cursor-pointer items-baseline gap-2 overflow-hidden rounded-md px-2 py-1.5 text-left',
                                                index === activeIndex ? 'bg-accent' : 'hover:bg-accent/60'
                                            )}
                                        >
                                            <span
                                                title={option.code}
                                                className={cn(
                                                    'truncate text-xs',
                                                    isMono && 'font-mono',
                                                    // With a title alongside it the code keeps its width and the
                                                    // title absorbs the overflow; alone it is the whole row.
                                                    option.title ? 'max-w-[55%] shrink-0' : 'min-w-0 flex-1',
                                                    option.code === value ? 'text-primary' : 'text-foreground'
                                                )}
                                            >
                                                {option.code}
                                            </span>
                                            {option.title && <span className="truncate text-xs text-muted-foreground">{option.title}</span>}
                                        </button>
                                    ))}
                                </div>
                                {isLoadingMore && (
                                    <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground">
                                        <Loader2 className="h-3 w-3 animate-spin" /> Loading more
                                    </div>
                                )}
                                {!isLoadingMore && nextCursor && (
                                    <button type="button" onClick={loadMore} className="w-full cursor-pointer py-2 text-xs text-primary hover:underline">
                                        Load more
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
            {selectedTitle && <p className="mt-1 truncate text-[11px] text-muted-foreground">{selectedTitle}</p>}
        </div>
    );
};
