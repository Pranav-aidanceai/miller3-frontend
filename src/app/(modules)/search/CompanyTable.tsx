import { useEffect, useState } from 'react';
import { Company } from '@/types/search';
import { ContactIcons, TableSkeleton } from './helper';
import ColumnPickerPopover from './ColumnPickerPopover';
import { DEFAULT_VISIBLE_COLUMNS, OPTIONAL_COLUMNS, TABLE_COLUMNS_STORAGE_KEY } from './tableColumns';

interface CompanyTableProps {
    companies: Company[];
    isLoading: boolean;
    perPage: number;
    selectedIds: Set<string>;
    allSelected: boolean;
    notAccessibleFields: string[];
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: () => void;
    onRowClick: (company: Company) => void;
}

function loadVisibleColumns(): string[] {
    if (typeof window === 'undefined') return DEFAULT_VISIBLE_COLUMNS;
    try {
        const raw = localStorage.getItem(TABLE_COLUMNS_STORAGE_KEY);
        if (!raw) return DEFAULT_VISIBLE_COLUMNS;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return DEFAULT_VISIBLE_COLUMNS;
        // Drop anything that no longer exists as a column, so a stale cache
        // from an older build can't render a blank header.
        const validKeys = new Set(OPTIONAL_COLUMNS.map(c => c.key));
        const filtered = parsed.filter((key): key is string => typeof key === 'string' && validKeys.has(key));
        return filtered.length > 0 ? filtered : DEFAULT_VISIBLE_COLUMNS;
    } catch {
        return DEFAULT_VISIBLE_COLUMNS;
    }
}

export default function CompanyTable({
    companies,
    isLoading,
    perPage,
    selectedIds,
    allSelected,
    notAccessibleFields,
    onToggleSelect,
    onToggleSelectAll,
    onRowClick,
}: CompanyTableProps) {
    // Column choice is per-browser, not per-search — it applies the same way
    // across Search, AI Search, and Buckets tables.
    const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
    useEffect(() => { setVisibleColumns(loadVisibleColumns()); }, []);

    const handleColumnsChange = (keys: string[]) => {
        setVisibleColumns(keys);
        try {
            localStorage.setItem(TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(keys));
        } catch {
            // Ignore quota/serialization errors — persistence is best-effort.
        }
    };

    const columns = OPTIONAL_COLUMNS.filter(c => visibleColumns.includes(c.key));
    const colSpan = columns.length + 3; // checkbox + Company + Contact

    return (
        <div className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-end border-b border-border bg-muted/50 px-2 py-1.5">
                <ColumnPickerPopover selected={visibleColumns} onChange={handleColumnsChange} />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/50">
                            <th className="px-4 py-3 w-10">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={onToggleSelectAll}
                                    className="h-4 w-4 cursor-pointer accent-primary"
                                />
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Company</th>
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    className={`px-4 py-3 font-medium text-muted-foreground ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                                >
                                    {col.label}
                                </th>
                            ))}
                            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Contact</th>
                        </tr>
                    </thead>
                    {isLoading ? <TableSkeleton perPage={perPage} columnsCount={columns.length} /> : (
                        <tbody>
                            {companies.length === 0 ? (
                                <tr>
                                    <td colSpan={colSpan} className="py-16 text-center text-muted-foreground">
                                        <p className="text-lg font-medium">No companies match your filters</p>
                                        <p className="mt-1 text-sm">Try loosening your criteria or switching to AI Search</p>
                                    </td>
                                </tr>
                            ) : companies.map(c => (
                                <tr key={c.id} onClick={() => onRowClick(c)}
                                    className="border-b border-border cursor-pointer transition-colors hover:bg-accent/50">
                                    <td className="px-4 py-3 w-10" onClick={e => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(c.id)}
                                            onChange={() => onToggleSelect(c.id)}
                                            className="h-4 w-4 cursor-pointer accent-primary"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="font-medium">{c.company_name}</p>
                                        <p className="text-xs text-muted-foreground">{c.city}, {c.state}</p>
                                    </td>
                                    {columns.map(col => (
                                        <td
                                            key={col.key}
                                            className={`px-4 py-3 text-xs ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                                        >
                                            {col.render(c, notAccessibleFields)}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3">
                                        <div className="flex justify-center"><ContactIcons c={c} notAccessibleFields={notAccessibleFields} /></div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    )}
                </table>
            </div>
        </div>
    );
}
