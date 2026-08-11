'use client';

import axios from 'axios';
import { useState } from 'react';
import { Check, Folder, FolderMinus, FolderPlus, Loader2, RotateCcw, Star } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { getErrorMessage } from '@/lib/apiError';
import { isSessionExpiring } from '@/lib/session';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Bucket } from './BucketList';

type Mode = 'add' | 'remove';

interface BucketPickerPopoverProps {
    /** The companies to file away (or pull out) — usually the current selection. */
    companyIds: string[];
    mode?: Mode;
    /**
     * The bucket names the company already sits in — remove mode offers exactly
     * these, add mode disables them. They're matched against the bucket list to
     * recover the ids the endpoint needs, since the payload carries only names.
     * Omit it for a multi-company selection, where membership is unknown.
     */
    bucketNames?: string[];
    /** Anchor for a react-tooltip `<Tooltip id="…" />` rendered by the caller. */
    tooltipId?: string;
    /**
     * Whether to spell out how many companies are in play. Worth it for a list
     * selection, noise in the drawer where it is always the one company open.
     */
    showCount?: boolean;
    /** Fires after a successful add/remove, e.g. to refresh the row or drawer. */
    onDone?: (bucket: Bucket) => void;
}

/** Favorites always sits on top, everything else follows in creation order. */
const sortBuckets = (list: Bucket[]) =>
    [...list].sort((a, b) => {
        if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
        return a.created_at.localeCompare(b.created_at);
    });

export default function BucketPickerPopover({
    companyIds,
    mode = 'add',
    bucketNames,
    tooltipId,
    showCount = true,
    onDone,
}: BucketPickerPopoverProps) {

    const [open, setOpen] = useState(false);
    const [buckets, setBuckets] = useState<Bucket[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // One bucket at a time — the endpoint takes a single destination.
    const [pickedId, setPickedId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    // Per-instance anchor: the drawer renders two of these popovers at once, and
    // a shared react-tooltip id would have them fighting over the same element.
    const [alreadyTipId] = useState(() => `bucket-member-tip-${Math.random().toString(36).slice(2)}`);

    const removing = mode === 'remove';
    const disabled = companyIds.length === 0;
    const count = companyIds.length;
    const noun = count === 1 ? 'company' : 'companies';

    const fetchBuckets = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get('/api/bucket');
            const items = sortBuckets(response.data?.items ?? []);
            // In remove mode only the buckets holding the company are offered.
            setBuckets(removing ? items.filter(b => bucketNames?.includes(b.name)) : items);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to load buckets'));
        } finally {
            setLoading(false);
        }
    };

    // Reload on every open so counts and newly created buckets stay current.
    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        if (next) {
            setPickedId(null);
            fetchBuckets();
        }
    };

    const handleSubmit = async () => {
        const bucket = buckets.find(b => b.id === pickedId);
        if (!bucket || saving || disabled) return;
        setSaving(true);
        try {
            const payload = { bucket_id: bucket.id, company_ids: companyIds };
            if (removing) await axios.delete('/api/bucket/company', { data: payload });
            else await axios.post('/api/bucket/company', payload);
            setOpen(false);
            toast.success(
                removing
                    ? `${count} ${noun} removed from "${bucket.name}"`
                    : `${count} ${noun} added to "${bucket.name}"`
            );
            onDone?.(bucket);
        } catch (err: unknown) {
            if (!isSessionExpiring()) {
                toast.error(getErrorMessage(
                    err,
                    removing ? 'Failed to remove from the bucket' : 'Failed to add to the bucket'
                ));
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    data-tooltip-id={tooltipId}
                    disabled={disabled}
                    className={cn(
                        'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors active:scale-[0.98] cursor-pointer',
                        removing
                            ? 'border border-border hover:bg-accent'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90',
                        disabled && 'cursor-not-allowed opacity-50'
                    )}
                >
                    {removing
                        ? <><FolderMinus className="h-4 w-4" />Remove from Bucket</>
                        : <><FolderPlus className="h-4 w-4" />Add to Bucket{showCount && count > 0 && ` (${count})`}</>}
                </button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-72 gap-0 p-0">
                <div className="border-b border-border px-3 py-2.5">
                    <p className="text-sm font-semibold">{removing ? 'Remove from bucket' : 'Add to bucket'}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {showCount ? `${count} ${noun} selected · pick one bucket` : 'Pick one bucket'}
                    </p>
                </div>

                <div className="max-h-64 overflow-y-auto p-1.5">
                    {loading && Array.from({ length: 3 }).map((_, i) => (
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
                                onClick={fetchBuckets}
                                className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors cursor-pointer hover:text-foreground"
                            >
                                <RotateCcw className="h-3 w-3" />
                                Retry
                            </button>
                        </div>
                    )}

                    {!loading && !error && buckets.length === 0 && (
                        <p className="px-2 py-2 text-xs text-muted-foreground">
                            {removing
                                ? 'This company is not in any bucket.'
                                : 'No buckets yet — create one from My Buckets.'}
                        </p>
                    )}

                    {!loading && !error && buckets.map(bucket => {
                        const picked = pickedId === bucket.id;
                        // Adding a company twice is a no-op the API would reject,
                        // so the buckets it already sits in are off the table.
                        const already = !removing && !!bucketNames?.includes(bucket.name);
                        return (
                            <button
                                key={bucket.id}
                                type="button"
                                // `aria-disabled` rather than `disabled`: a disabled
                                // button fires no hover events, so its tooltip would
                                // never open.
                                aria-disabled={already}
                                data-tooltip-id={already ? alreadyTipId : undefined}
                                data-tooltip-content="Company already added to this bucket"
                                onClick={() => { if (!already) setPickedId(bucket.id); }}
                                className={cn(
                                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                                    already
                                        ? 'cursor-not-allowed text-muted-foreground/60'
                                        : picked
                                            ? 'cursor-pointer bg-primary/10 font-medium text-primary'
                                            : 'cursor-pointer text-muted-foreground hover:bg-accent hover:text-foreground'
                                )}
                            >
                                {bucket.is_favorite
                                    ? <Star className={cn('h-4 w-4 shrink-0 fill-warning text-warning', already && 'opacity-60')} />
                                    : <Folder className="h-4 w-4 shrink-0" />}
                                <span className="min-w-0 flex-1 truncate text-left" title={bucket.name}>
                                    {bucket.name}
                                </span>
                                <span
                                    className={cn(
                                        'shrink-0 rounded-pill px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
                                        picked ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                                    )}
                                >
                                    {bucket.company_count}
                                </span>
                                {picked && <Check className="h-3.5 w-3.5 shrink-0" />}
                            </button>
                        );
                    })}

                    <Tooltip
                        id={alreadyTipId}
                        place="left"
                        className="text-xs! px-2! py-1! rounded-md! bg-foreground! text-background! z-100!"
                    />
                </div>

                <div className="flex justify-end gap-2 border-t border-border px-3 py-2.5">
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        disabled={saving}
                        className="h-8 rounded-md border border-border px-3 text-xs font-medium transition-colors cursor-pointer hover:bg-accent disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!pickedId || saving}
                        className={cn(
                            'flex h-8 min-w-28 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium text-white transition-opacity cursor-pointer hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
                            removing ? 'bg-destructive' : 'bg-primary text-primary-foreground'
                        )}
                    >
                        {saving
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : removing ? 'Remove from bucket' : 'Add to bucket'}
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
