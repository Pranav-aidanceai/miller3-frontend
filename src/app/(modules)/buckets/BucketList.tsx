'use client';

import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Check,
    Folder,
    Loader2,
    MoreHorizontal,
    Pencil,
    Plus,
    RotateCcw,
    Star,
    Trash2,
    X,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

    const [createOpen, setCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);

    const [menuId, setMenuId] = useState<string | null>(null);
    const [renameId, setRenameId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    // Favorites is the landing bucket, but only until the user picks another —
    // a refetch (after create/rename) must not yank the selection back.
    const didAutoSelect = useRef(false);
    const onSelectRef = useRef(onSelect);
    useEffect(() => { onSelectRef.current = onSelect; });

    const fetchBuckets = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const response = await axios.get('/api/bucket');
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

    const handleCreate = async () => {
        const name = newName.trim();
        if (!name || creating) return;
        setCreating(true);
        try {
            const response = await axios.post('/api/bucket', { name });
            const bucket: Bucket = response.data;
            setBuckets(prev => sortBuckets([...prev, bucket]));
            setLimits(prev =>
                prev && prev.max_buckets !== -1
                    ? { ...prev, used: prev.used + 1, remaining: Math.max(prev.remaining - 1, 0) }
                    : prev
            );
            setNewName('');
            setCreateOpen(false);
            onSelect(bucket);
            toast.success(`Bucket "${bucket.name}" created`);
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Bucket creation failed'));
        } finally {
            setCreating(false);
        }
    };

    const handleRename = async (bucket: Bucket) => {
        const name = renameValue.trim();
        if (!name || busyId) return;
        if (name === bucket.name) {
            setRenameId(null);
            return;
        }
        setBusyId(bucket.id);
        try {
            const response = await axios.patch('/api/bucket', { bucket_id: bucket.id, name });
            const updated: Bucket = response.data;
            setBuckets(prev => sortBuckets(prev.map(b => (b.id === bucket.id ? updated : b))));
            if (selectedId === bucket.id) onSelect(updated);
            setRenameId(null);
            toast.success('Bucket renamed');
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Bucket update failed'));
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (bucket: Bucket) => {
        if (busyId) return;
        setBusyId(bucket.id);
        try {
            await axios.delete('/api/bucket', { data: { bucket_id: bucket.id } });
            const rest = buckets.filter(b => b.id !== bucket.id);
            setBuckets(rest);
            setLimits(prev =>
                prev && prev.max_buckets !== -1
                    ? { ...prev, used: Math.max(prev.used - 1, 0), remaining: prev.remaining + 1 }
                    : prev
            );
            setConfirmId(null);
            // Deleting what's on screen falls back to Favorites.
            if (selectedId === bucket.id) {
                const fallback = rest.find(b => b.is_favorite) ?? rest[0];
                if (fallback) onSelect(fallback);
                else onSelectedDeleted?.();
            }
            toast.success(`Bucket "${bucket.name}" deleted`);
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Bucket deletion failed'));
        } finally {
            setBusyId(null);
        }
    };

    const row = (bucket: Bucket) => {
        const busy = busyId === bucket.id;
        const active = selectedId === bucket.id;

        if (renameId === bucket.id) {
            return (
                <div key={bucket.id} className="flex items-center gap-1 px-1 py-1">
                    <input
                        autoFocus
                        value={renameValue}
                        maxLength={60}
                        disabled={busy}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleRename(bucket);
                            if (e.key === 'Escape') setRenameId(null);
                        }}
                        className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm outline-none transition-colors focus:border-primary disabled:opacity-50"
                    />
                    <button
                        type="button"
                        onClick={() => handleRename(bucket)}
                        disabled={busy || !renameValue.trim()}
                        aria-label="Save name"
                        className="rounded-md p-1 text-muted-foreground transition-colors cursor-pointer hover:bg-accent hover:text-primary disabled:opacity-50"
                    >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => setRenameId(null)}
                        disabled={busy}
                        aria-label="Cancel rename"
                        className="rounded-md p-1 text-muted-foreground transition-colors cursor-pointer hover:bg-accent hover:text-foreground disabled:opacity-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            );
        }

        if (confirmId === bucket.id) {
            return (
                <div key={bucket.id} className="rounded-md border border-destructive/30 bg-destructive/5 p-2">
                    <p className="text-xs text-muted-foreground">
                        Delete <span className="font-medium text-foreground">{bucket.name}</span>?
                    </p>
                    <div className="mt-2 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setConfirmId(null)}
                            disabled={busy}
                            className="h-7 rounded-md border border-border px-2.5 text-xs font-medium transition-colors cursor-pointer hover:bg-accent disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDelete(bucket)}
                            disabled={busy}
                            className="flex h-7 min-w-14 items-center justify-center rounded-md bg-destructive px-2.5 text-xs font-medium text-white transition-opacity cursor-pointer hover:opacity-90 disabled:opacity-50"
                        >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Delete'}
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div
                key={bucket.id}
                className={cn(
                    'group flex items-center rounded-md pr-1 transition-colors',
                    active ? 'bg-primary/10' : 'hover:bg-accent'
                )}
            >
                <button
                    type="button"
                    onClick={() => onSelect(bucket)}
                    className={cn(
                        'flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-sm transition-colors cursor-pointer',
                        active ? 'font-medium text-primary' : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    {bucket.is_favorite ? (
                        <Star className={cn('h-4 w-4 shrink-0 fill-warning text-warning')} />
                    ) : (
                        <Folder className="h-4 w-4 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-left" title={bucket.name}>{bucket.name}</span>
                    <span
                        className={cn(
                            'shrink-0 rounded-pill px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
                            active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                        )}
                    >
                        {bucket.company_count}
                    </span>
                </button>

                {/* Favorites is a system bucket — it can be neither renamed nor deleted. */}
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
                                    'shrink-0 rounded-md p-1 text-muted-foreground transition-opacity cursor-pointer hover:text-foreground',
                                    menuId === bucket.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
                                )}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent side="right" align="start" sideOffset={8} className="w-36 gap-0.5 p-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setMenuId(null);
                                    setConfirmId(null);
                                    setRenameValue(bucket.name);
                                    setRenameId(bucket.id);
                                }}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors cursor-pointer hover:bg-accent hover:text-foreground"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                                Rename
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setMenuId(null);
                                    setRenameId(null);
                                    setConfirmId(bucket.id);
                                }}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors cursor-pointer hover:bg-accent hover:text-destructive"
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
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
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
                <Popover
                    open={createOpen}
                    onOpenChange={next => {
                        setCreateOpen(next);
                        if (!next) setNewName('');
                    }}
                >
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            disabled={!canCreate}
                            title={canCreate ? 'Create bucket' : `Bucket limit reached (${limits?.max_buckets})`}
                            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-2 py-2 text-xs font-medium text-muted-foreground transition-colors cursor-pointer hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                        >
                            <Plus className="h-3.5 w-3.5 shrink-0" />
                            New bucket
                        </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="start" sideOffset={8} className="w-64 gap-3">
                        <p className="text-sm font-medium">New bucket</p>
                        <input
                            autoFocus
                            value={newName}
                            maxLength={60}
                            placeholder="Bucket name"
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleCreate();
                                if (e.key === 'Escape') setCreateOpen(false);
                            }}
                            className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm outline-none transition-colors focus:border-primary"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setCreateOpen(false)}
                                disabled={creating}
                                className="h-8 rounded-md border border-border px-3 text-xs font-medium transition-colors cursor-pointer hover:bg-accent disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCreate}
                                disabled={creating || !newName.trim()}
                                className="flex h-8 min-w-16 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity cursor-pointer hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Create'}
                            </button>
                        </div>
                    </PopoverContent>
                </Popover>

                {limits && limits.max_buckets !== -1 && (
                    <p className="px-1 text-[10px] text-muted-foreground">
                        {limits.used} of {limits.max_buckets} buckets used
                    </p>
                )}
            </div>
        </div>
    );
}
