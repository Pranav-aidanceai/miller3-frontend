'use client';

import apiClient from '@/lib/api/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Pencil, RotateCcw, Star, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import BucketFormModal from './BucketFormModal';
import DeleteBucketModal from './DeleteBucketModal';

export interface Bucket {
    id: string;
    name: string;
    is_favorite: boolean;
    company_count: number;
    capacity: number;
    created_at: string;
    updated_at: string;
}

interface BucketLimits {
    max_buckets: number;
    used: number;
    remaining: number;
    bucket_max_companies: number;
}

/** Favorites always sits on top, everything else follows in creation order. */
const sortBuckets = (list: Bucket[]) =>
    [...list].sort((a, b) => {
        if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
        return a.created_at.localeCompare(b.created_at);
    });

const formatCreatedDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}-${mm}-${d.getFullYear()}`;
};

interface BucketListProps {
    selectedId: string | null;
    /** Called on click and once on load with the default (Favorites) bucket. */
    onSelect: (bucket: Bucket) => void;
    /** The selected bucket vanished — the page clears its company list. */
    onSelectedDeleted?: () => void;
    /**
     * Bump to pull fresh counts, e.g. after the page removes companies from a
     * bucket. The refetch is silent — no skeletons over a list already on screen.
     */
    refreshToken?: number;
}

export default function BucketList({ selectedId, onSelect, onSelectedDeleted, refreshToken }: BucketListProps) {

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [buckets, setBuckets] = useState<Bucket[]>([]);
    const [limits, setLimits] = useState<BucketLimits | null>(null);

    const [menuId, setMenuId] = useState<string | null>(null);
    // Editing 'new' opens the same modal in create mode; a Bucket opens it in
    // edit mode — matching Figma's "Create a bucket" / "Edit bucket" pair.
    const [formTarget, setFormTarget] = useState<Bucket | 'new' | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Bucket | null>(null);

    // Favorites is the landing bucket, but only until the user picks another —
    // a refetch (after create/rename) must not yank the selection back.
    const didAutoSelect = useRef(false);
    const onSelectRef = useRef(onSelect);
    useEffect(() => { onSelectRef.current = onSelect; });

    const fetchBuckets = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get('/bucket');
            const items = sortBuckets(response.data?.items ?? []);
            setBuckets(items);
            setLimits(response.data?.limits ?? null);
            if (!didAutoSelect.current && items.length > 0) {
                didAutoSelect.current = true;
                onSelectRef.current(items.find(b => b.is_favorite) ?? items[0]);
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to load buckets'));
        } finally {
            setLoading(false);
        }
    }, []);

    const loadedOnce = useRef(false);
    useEffect(() => {
        (async () => {
            await fetchBuckets(loadedOnce.current);
            loadedOnce.current = true;
        })();
    }, [fetchBuckets, refreshToken]);

    const canCreate = !limits || limits.max_buckets === -1 || limits.remaining > 0;

    const handleSaved = (bucket: Bucket, wasCreate: boolean) => {
        setBuckets(prev => sortBuckets(wasCreate ? [...prev, bucket] : prev.map(b => (b.id === bucket.id ? bucket : b))));
        if (wasCreate) {
            setLimits(prev =>
                prev && prev.max_buckets !== -1
                    ? { ...prev, used: prev.used + 1, remaining: Math.max(prev.remaining - 1, 0) }
                    : prev
            );
        }
        if (wasCreate || selectedId === bucket.id) onSelect(bucket);
        setFormTarget(null);
    };

    const handleDeleted = (bucketId: string) => {
        const rest = buckets.filter(b => b.id !== bucketId);
        setBuckets(rest);
        setLimits(prev =>
            prev && prev.max_buckets !== -1
                ? { ...prev, used: Math.max(prev.used - 1, 0), remaining: prev.remaining + 1 }
                : prev
        );
        setDeleteTarget(null);
        // Deleting what's on screen falls back to Favorites.
        if (selectedId === bucketId) {
            const fallback = rest.find(b => b.is_favorite) ?? rest[0];
            if (fallback) onSelect(fallback);
            else onSelectedDeleted?.();
        }
    };

    const row = (bucket: Bucket) => {
        const active = selectedId === bucket.id;
        const createdLabel = formatCreatedDate(bucket.created_at);

        return (
            <div
                key={bucket.id}
                className={cn(
                    'group flex items-center transition-colors border-b p-3',
                    active ? 'bg-primary/10' : 'hover:bg-accent'
                )}
            >
                <button
                    type="button"
                    onClick={() => onSelect(bucket)}
                    className={cn(
                        'flex min-w-0 flex-1 items-start gap-2 text-sm transition-colors cursor-pointer',
                        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    {bucket.is_favorite && <Star className="h-4 w-4 shrink-0 fill-warning text-warning" />}
                    <span className="min-w-0 flex-1 text-left">
                        <span className={cn('flex items-center gap-1.5', active && 'font-medium')}>
                            <span className="min-w-0 truncate font-heading text-[#5A5A5ACC]" title={bucket.name}>{bucket.name}</span>
                            <span className="shrink-0 rounded-full border border-brand-accent font-heading bg-brand-accent/10 px-1.5 py-0.5 text-[10px] text-brand-accent tabular-nums">
                                {bucket.company_count} item{bucket.company_count === 1 ? '' : 's'}
                            </span>
                        </span>
                        {(createdLabel && !bucket.is_favorite) && (
                            <span className={cn("block text-[10px] font-heading text-[#5A5A5ACC]")}>Created on {createdLabel}</span>
                        )}
                    </span>
                </button>

                {!bucket.is_favorite && (
                    <Popover
                        open={menuId === bucket.id}
                        onOpenChange={next => setMenuId(next ? bucket.id : null)}
                    >
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                aria-label={`Actions for ${bucket.name}`}
                                className={cn(
                                    'shrink-0 self-start rounded-md p-1 text-muted-foreground transition-opacity cursor-pointer hover:text-foreground',
                                    menuId === bucket.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
                                )}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent side="right" align="start" sideOffset={8} className="w-36 gap-0.5 p-1">
                            <button
                                type="button"
                                onClick={() => { setMenuId(null); setFormTarget(bucket); }}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#424242] font-heading transition-colors cursor-pointer hover:bg-accent hover:text-foreground"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                            </button>
                            <button
                                type="button"
                                onClick={() => { setMenuId(null); setDeleteTarget(bucket); }}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#424242] font-heading transition-colors cursor-pointer hover:bg-accent hover:text-destructive"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                            </button>
                        </PopoverContent>
                    </Popover>
                )}
            </div>
        );
    };

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                {loading && Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-2">
                        <div className="h-4 w-4 shrink-0 rounded bg-muted animate-pulse" />
                        <div className="h-3.5 flex-1 rounded bg-muted animate-pulse" />
                    </div>
                ))}

                {!loading && error && (
                    <div className="px-2 py-1.5">
                        <p className="text-xs text-destructive">{error}</p>
                        <button
                            type="button"
                            onClick={() => fetchBuckets()}
                            className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors cursor-pointer hover:text-foreground"
                        >
                            <RotateCcw className="h-3 w-3" />
                            Retry
                        </button>
                    </div>
                )}

                {!loading && !error && buckets.length === 0 && (
                    <p className="px-2 py-2 text-xs text-muted-foreground">No buckets yet</p>
                )}

                {!loading && !error && buckets.map(row)}
            </div>

            <div className="shrink-0 space-y-1.5 border-t border-border p-2">
                <button
                    type="button"
                    disabled={!canCreate}
                    onClick={() => setFormTarget('new')}
                    title={canCreate ? 'Create a bucket' : `Bucket limit reached (${limits?.max_buckets})`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-primary px-2 py-2 font-sans text-sm font-normal text-primary transition-colors cursor-pointer hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                >
                    Create a new Bucket
                </button>

                {limits && limits.max_buckets !== -1 && (
                    <p className="px-1 text-center font-normal text-[10px] text-muted-foreground font-sans">
                        {limits.used} of {limits.max_buckets} bucket{limits.max_buckets === 1 ? '' : 's'} used
                    </p>
                )}
            </div>

            {formTarget && (
                <BucketFormModal
                    mode={formTarget === 'new' ? 'create' : 'edit'}
                    bucket={formTarget === 'new' ? undefined : formTarget}
                    onClose={() => setFormTarget(null)}
                    onSaved={(bucket) => handleSaved(bucket, formTarget === 'new')}
                />
            )}

            {deleteTarget && (
                <DeleteBucketModal
                    bucket={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={handleDeleted}
                />
            )}
        </div>
    );
}
