import { Company } from '@/types/search';
import { ContactIcons, TableSkeleton } from './helper';
import { OPTIONAL_COLUMNS } from './tableColumns';
import { useVisibleColumns } from './useVisibleColumns';

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
    /**
     * Which optional columns to show. Pass it when the page renders its own
     * column picker; leave it off and the table follows the saved choice.
     */
    visibleColumns?: string[];
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
    visibleColumns,
}: CompanyTableProps) {
    const [savedColumns] = useVisibleColumns();
    const activeColumns = visibleColumns ?? savedColumns;

    const columns = OPTIONAL_COLUMNS.filter(c => activeColumns.includes(c.key));
    const colSpan = columns.length + 3; // checkbox + Company + Contact

    return (
        <div className="overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className='border-b border-t'>
                        <tr className="border-collapse">
                            <th className="px-4 py-3 w-10 border-r">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={onToggleSelectAll}
                                    className="h-4 w-4 cursor-pointer accent-primary"
                                />
                            </th>
                            <th className="px-4 py-3 text-left font-heading text-sm font-normal text-[#5A5A5A] border-r">Company</th>
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    className={`px-4 py-3 font-heading text-sm font-normal text-[#5A5A5A] border-r ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                                >
                                    {col.label}
                                </th>
                            ))}
                            <th className="px-4 py-3 text-center font-heading text-sm font-normal text-[#5A5A5A]">Contact</th>
                        </tr>
                    </thead>
                    {isLoading ? <TableSkeleton perPage={perPage} columnsCount={columns.length} /> : (
                        <tbody>
                            {companies.length === 0 ? (
                                <tr>
                                    <td colSpan={colSpan} className="py-16 text-center font-heading text-muted-foreground">
                                        <p className="text-lg font-medium">No companies match your filters</p>
                                        <p className="mt-1 text-sm">Try loosening your criteria or switching to AI Search</p>
                                    </td>
                                </tr>
                            ) : companies.map(c => (
                                <tr key={c.id} onClick={() => onRowClick(c)}
                                    className="border-b border-border cursor-pointer transition-colors hover:bg-accent/50">
                                    <td className="px-4 py-3 w-10 border-r" onClick={e => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(c.id)}
                                            onChange={() => onToggleSelect(c.id)}
                                            className="h-4 w-4 cursor-pointer accent-primary"
                                        />
                                    </td>
                                    <td className="px-4 py-3 border-r">
                                        <p className="font-medium font-heading">{c.company_name}</p>
                                        <p className="text-xsfont-heading text-muted-foreground">{c.city}, {c.state}</p>
                                    </td>
                                    {columns.map(col => (
                                        <td
                                            key={col.key}
                                            className={`font-medium font-heading text-sm px-4 py-3 border-r ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
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
