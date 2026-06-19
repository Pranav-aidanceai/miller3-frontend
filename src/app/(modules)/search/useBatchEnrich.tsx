import { useState } from 'react';
import { toast } from 'sonner';
import { Company } from '@/types/search';
import BatchEnrichToast from './BatchEnrichToast';

interface BatchEnrichResult {
    batch_id: string;
    ws_url: string;
    total_records: number;
    status: string;
    queue: string;
}

export function useBatchEnrich() {
    const [isEnriching, setIsEnriching] = useState(false);

    const enrich = async (
        companies: Company[],
        selectedIds: Set<string>,
        onSuccess?: () => void,
    ) => {
        const records = companies
            .filter(c => selectedIds.has(c.id))
            .map(c => ({ company_id: c.id }));

        if (records.length === 0) {
            toast.error('Select at least one company to enrich');
            return;
        }

        setIsEnriching(true);
        try {
            const response = await fetch('/api/batch-enrichment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ records }),
            });

            const body = await response.json().catch(() => null);

            if (!response.ok) {
                let detail = 'Batch enrichment failed. Please try again.';
                if (body?.error) {
                    try {
                        const parsed = typeof body.error === 'string' ? JSON.parse(body.error) : body.error;
                        if (parsed?.detail) detail = parsed.detail;
                    } catch {
                        if (typeof body.error === 'string') detail = body.error;
                    }
                }
                toast.error(detail, {
                    duration: 5000,
                    className: '!bg-destructive !text-white !border-destructive',
                });
                return;
            }

            const data: BatchEnrichResult | undefined = body?.data;
            if (!data?.ws_url) {
                toast.error('Enrichment started but no progress channel was returned.');
                return;
            }

            // Persistent, non-dismissable toast that owns the WebSocket and renders
            // live progress until the batch completes or the connection drops.
            toast.custom(
                (id) => (
                    <BatchEnrichToast
                        toastId={id}
                        wsUrl={data.ws_url}
                        total={data.total_records ?? records.length}
                    />
                ),
                { duration: Infinity, dismissible: false },
            );
            onSuccess?.();
        } catch {
            toast.error('Batch enrichment failed. Please try again.');
        } finally {
            setIsEnriching(false);
        }
    };

    return { isEnriching, enrich };
}
