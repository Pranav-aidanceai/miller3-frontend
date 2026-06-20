import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import axios from 'axios';
import { ExportPayload } from '@/types/search';
import { updateExportCredits } from '@/store/slices/authSlice';
import { parseApiError, isCreditError, showCreditLimitToast } from './apiError';
import { isSessionExpiring } from '@/lib/session';

export function useExport() {
    const dispatch = useDispatch();
    const [isExporting, setIsExporting] = useState(false);

    const exportData = async (
        exportPayload: ExportPayload | null,
        exportFormat: 'csv' | 'json',
        onSuccess?: () => void,
    ) => {
        if (!exportPayload) {
            toast.error('No data to export');
            return;
        }

        setIsExporting(true);
        try {
            const payload = { ...exportPayload, format: exportFormat };
            const response = await axios.post('/api/export', payload, {
                responseType: 'blob',
            });
            const blob = response.data as Blob;
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).replace(/\//g, '-');
            const timeStr = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            }).replace(/:/g, '-');
            const filename = `search_export_${dateStr}_${timeStr}.${exportFormat}`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            const remaining = parseInt(response.headers['x-export-credits-remaining'] ?? '0');
            dispatch(updateExportCredits(remaining));
            toast.success(`Downloaded ${filename}`);
            onSuccess?.();
        } catch (error) {
            // A 403 (account deactivated) is handled by the global deactivation
            // modal via SessionGuard's interceptor — don't stack an error toast.
            if (isSessionExpiring()) return;

            // With responseType 'blob', an error body comes back as a Blob; read
            // it back to text so parseApiError can pull out the detail/code.
            let body: unknown = null;
            if (axios.isAxiosError(error) && error.response?.data) {
                const data = error.response.data;
                if (data instanceof Blob) {
                    try { body = JSON.parse(await data.text()); } catch { body = null; }
                } else {
                    body = data;
                }
            }
            const { detail, code } = parseApiError(body, 'Export failed. Please try again.');

            if (isCreditError(code)) {
                showCreditLimitToast({
                    detail,
                    fallbackMessage: "You've reached your monthly export credit limit. Contact your admin to request more credits.",
                    mailtoSubject: 'Request for more export credits',
                });
                return;
            }

            toast.error(detail, {
                duration: 5000,
                className: '!bg-destructive !text-white !border-destructive',
            });
        } finally {
            setIsExporting(false);
        }
    };

    return { isExporting, exportData };
}
