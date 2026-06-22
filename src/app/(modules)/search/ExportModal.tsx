import { RootState } from '@/store/store';
import {
    Download,
    Loader2,
    FileSpreadsheet,
    Braces,
    X,
} from 'lucide-react';
import { useSelector } from 'react-redux';

interface ExportModalProps {
    showExportModal: boolean;
    setShowExportModal: (value: boolean) => void;
    exportFormat: 'csv' | 'json';
    setExportFormat: (value: 'csv' | 'json') => void;
    isExporting: boolean;
    handleExport: () => void;
    /** When provided, renders a row-count input gated by the user's export credits. */
    rowLimit?: number;
    setRowLimit?: (value: number) => void;
    /** Maximum rows the user is allowed to export (e.g. remaining export credits). */
    maxRows?: number;
}

export default function ExportModal({
    showExportModal,
    setShowExportModal,
    exportFormat,
    setExportFormat,
    isExporting,
    handleExport,
    rowLimit,
    setRowLimit,
    maxRows,
}: ExportModalProps) {

    const role = useSelector((state: RootState) => state.auth.role);
    const hasJsonAccess = role === 'ADMIN' || role === 'PREMIUM';
    const showRowLimit = role !== 'ADMIN' && setRowLimit !== undefined && rowLimit !== undefined;
    const rowError =
        showRowLimit
            ? rowLimit < 1
                ? 'Enter a row count of at least 1.'
                : maxRows !== undefined && rowLimit > maxRows
                    ? `You only have ${maxRows} export credit${maxRows === 1 ? '' : 's'} left.`
                    : null
            : null;

    if (!showExportModal) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-2xl border border-border/50 bg-background p-6 shadow-2xl">
                {/* Close Button */}
                <button
                    onClick={() => setShowExportModal(false)}
                    disabled={isExporting}
                    className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors cursor-pointer hover:bg-accent hover:text-foreground"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-xl font-semibold">
                        Export Search Results
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Download your filtered search results in your preferred format.
                    </p>
                </div>

                {/* Format Selection */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-muted-foreground">
                        Export Format
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                        {/* CSV */}
                        <button
                            type="button"
                            onClick={() => setExportFormat('csv')}
                            disabled={isExporting}
                            className={`group relative rounded-xl border p-4 text-left transition-all duration-200
                ${exportFormat === 'csv'
                                    ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20 cursor-pointer'
                                    : 'border-border hover:border-primary/40 hover:bg-accent/50'
                                }
              `}
                        >
                            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-green-500/10">
                                <FileSpreadsheet className="h-5 w-5 text-green-500" />
                            </div>

                            <div>
                                <p className="font-medium">CSV</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Excel & spreadsheet compatible
                                </p>
                            </div>

                            {exportFormat === 'csv' && (
                                <div className="absolute right-3 top-3">
                                    <div className="h-3 w-3 rounded-full bg-primary" />
                                </div>
                            )}
                        </button>

                        {/* JSON */}
                        <button
                            type="button"
                            disabled={!hasJsonAccess || isExporting}
                            onClick={() => hasJsonAccess && setExportFormat('json')}
                            className={`group relative rounded-xl border p-4 text-left transition-all duration-200 overflow-hidden ${hasJsonAccess ? 'cursor-pointer' : 'cursor-not-allowed'
                                } ${exportFormat === 'json' && hasJsonAccess
                                    ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                                    : 'border-border hover:border-primary/40 hover:bg-accent/50'
                                }`}
                        >
                            {/* Locked Overlay */}
                            {!hasJsonAccess && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-background/80 backdrop-blur-[2px]">
                                    <div className="mb-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600">
                                        🔒 Premium
                                    </div>

                                    <p className="text-sm font-medium">
                                        Upgrade to access
                                    </p>

                                    <p className="mt-1 text-center text-xs text-muted-foreground">
                                        Export data in JSON format
                                    </p>
                                </div>
                            )}

                            <div
                                className={`${!hasJsonAccess
                                    ? 'opacity-40 grayscale'
                                    : ''
                                    }`}
                            >
                                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-500/10">
                                    <Braces className="h-5 w-5 text-blue-500" />
                                </div>

                                <div>
                                    <p className="font-medium">JSON</p>

                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Structured developer format
                                    </p>
                                </div>

                                {exportFormat === 'json' && hasJsonAccess && (
                                    <div className="absolute right-3 top-3">
                                        <div className="h-3 w-3 rounded-full bg-primary" />
                                    </div>
                                )}
                            </div>
                        </button>
                    </div>
                </div>

                {/* Row Count */}
                {showRowLimit && (
                    <div className="mt-6 space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                            Number of rows
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={rowLimit}
                            disabled={isExporting}
                            onChange={(e) => {
                                const digitsOnly = e.target.value.replace(/\D/g, '');
                                setRowLimit?.(digitsOnly === '' ? 0 : Number(digitsOnly));
                            }}
                            className={`h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 ${rowError
                                ? 'border-destructive focus:ring-destructive/30'
                                : 'border-input focus:ring-ring'
                                }`}
                        />
                        {rowError ? (
                            <p className="text-xs text-destructive">{rowError}</p>
                        ) : maxRows !== undefined ? (
                            <p className="text-xs text-muted-foreground">
                                {maxRows} export credit{maxRows === 1 ? '' : 's'} remaining
                            </p>
                        ) : null}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={() => setShowExportModal(false)}
                        disabled={isExporting}
                        className="h-10 rounded-lg border border-border px-4 text-sm font-medium transition-colors cursor-pointer hover:bg-accent disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleExport}
                        disabled={isExporting || rowError !== null}
                        className="flex h-10 min-w-30 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4" />
                                Export
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}