import { useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import BatchEnrichToast, { type EnrichRecordUpdate } from './BatchEnrichToast';
import { parseApiError, isCreditError, showCreditLimitToast } from './apiError';
import { isSessionExpiring } from '@/lib/session';

export type { EnrichRecordUpdate };

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
        selectedIds: Set<string>,
        onSuccess?: () => void,
        onComplete?: () => void,
        /** Fires per company as its progress frame arrives, before onComplete. */
        onRecord?: (update: EnrichRecordUpdate) => void,
    ) => {
        const records = Array.from(selectedIds).map(id => ({ company_id: id }));

        if (records.length === 0) {
            toast.error('Select at least one company to enrich');
            return;
        }

        setIsEnriching(true);
        try {
            const response = await axios.post('/api/batch-enrichment', { records });

            const data: BatchEnrichResult | undefined = response.data?.data;
            if (!data?.ws_url) {
                toast.error('Enrichment started but no progress channel was returned.');
                return;
            }

            toast.custom(
                (id) => (
                    <BatchEnrichToast
                        toastId={id}
                        wsUrl={data.ws_url}
                        total={data.total_records ?? records.length}
                        onComplete={onComplete}
                        onRecord={onRecord}
                    />
                ),
                { duration: Infinity, dismissible: false },
            );
            onSuccess?.();
        } catch (error) {
            if (isSessionExpiring()) return;

            const body = axios.isAxiosError(error) ? error.response?.data : null;
            const { detail, code } = parseApiError(body, 'Batch enrichment failed. Please try again.');

            if (isCreditError(code)) {
                showCreditLimitToast({
                    detail,
                    fallbackMessage: "You've reached your monthly enrichment credit limit. Contact your admin to request more credits.",
                    mailtoSubject: 'Request for more enrichment credits',
                });
                return;
            }

            toast.error(detail, {
                duration: 5000,
                className: '!bg-destructive !text-white !border-destructive',
            });
        } finally {
            setIsEnriching(false);
        }
    };

    return { isEnriching, enrich };
}
