'use client';

import { useState } from 'react';
import apiClient from '@/lib/api/client';
import { getErrorMessage } from '@/lib/apiError';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import type { Bucket } from './BucketList';

interface DeleteBucketModalProps {
    bucket: Bucket;
    onClose: () => void;
    onDeleted: (bucketId: string) => void;
}

/** Matches the Figma "Delete Bucket" reference exactly (fileKey pskj0D4uvWBsvAB5Csxyt4). */
export default function DeleteBucketModal({ bucket, onClose, onDeleted }: DeleteBucketModalProps) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (deleting) return;
        setDeleting(true);
        try {
            await apiClient.delete('/bucket', { data: { bucket_id: bucket.id } });
            toast.success(`Bucket "${bucket.name}" deleted`);
            onDeleted(bucket.id);
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Bucket deletion failed'));
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm rounded-2xl bg-card border border-border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-border p-5">
                    <p className="text-lg font-bold">Delete Bucket</p>
                    <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-5 text-sm text-foreground">
                    Are you sure you want to delete <span className="font-semibold">{bucket.name}</span>? Deleting this
                    bucket will result in the loss of the list of companies added to this bucket.
                </div>

                <div className="flex justify-end gap-2 bg-primary p-4">
                    <button
                        onClick={onClose}
                        disabled={deleting}
                        className="rounded-md border border-primary-foreground/40 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-foreground/10 disabled:opacity-40 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex items-center gap-1.5 rounded-md bg-destructive px-5 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40 cursor-pointer"
                    >
                        {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
