import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { X, AlertCircle } from 'lucide-react';
import { ExportPayload } from '@/types/search';
import { updateExportCredits } from '@/store/slices/authSlice';

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
            const response = await fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const body = await response.json().catch(() => null);
                let detail = 'Export failed. Please try again.';
                let errorCode: string | null = null;
                if (body?.error) {
                    try {
                        const parsed = typeof body.error === 'string' ? JSON.parse(body.error) : body.error;
                        const firstError = Array.isArray(parsed?.errors) ? parsed.errors[0] : null;
                        if (firstError?.message) {
                            detail = firstError.message;
                            errorCode = firstError.code ?? null;
                        } else if (parsed?.detail) {
                            detail = parsed.detail;
                        }
                    } catch {
                        if (typeof body.error === 'string') detail = body.error;
                    }
                }

                if (errorCode === 'INSUFFICIENT_CREDITS') {
                    toast.custom((id) => (
                        <div className="relative flex w-full flex-col gap-3 rounded-lg border border-destructive bg-destructive p-4 text-white shadow-lg">
                            <button
                                type="button"
                                aria-label="Close"
                                onClick={() => toast.dismiss(id)}
                                className="absolute right-2 top-2 rounded p-0.5 text-white/80 transition-colors hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                            <div className="flex items-start gap-3 pr-5">
                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                                <p className="text-sm font-medium leading-snug">
                                    You&apos;ve reached your monthly export credit limit. Contact your admin to request more credits.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    window.location.href = 'mailto:admin@miller3.com?subject=Request for more export credits';
                                }}
                                className="w-fit rounded-md bg-black/30 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/40 cursor-pointer"
                            >
                                Contact admin for more credits
                            </button>
                        </div>
                    ), { duration: Infinity });
                    return;
                }

                toast.error(detail, {
                    duration: 5000,
                    className: '!bg-destructive !text-white !border-destructive',
                });
                return;
            }
            const blob = await response.blob();
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
            const remaining = parseInt(response.headers.get('x-export-credits-remaining') ?? '0');
            dispatch(updateExportCredits(remaining));
            toast.success(`Downloaded ${filename}`);
            onSuccess?.();
        } catch {
            toast.error('Export failed. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    return { isExporting, exportData };
}
