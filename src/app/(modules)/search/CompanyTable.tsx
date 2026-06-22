import { Company } from '@/types/search';
import { ContactIcons, MaskedCell, TableSkeleton } from './helper';

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
    return (
        <div className="rounded-lg border border-border overflow-hidden">
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
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">NAICS</th>
                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Employees</th>
                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Revenue</th>
                            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Contact</th>
                        </tr>
                    </thead>
                    {isLoading ? <TableSkeleton perPage={perPage} /> : (
                        <tbody>
                            {companies.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-muted-foreground">
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
                                    <td className="px-4 py-3 text-xs">
                                        <MaskedCell
                                            fieldKey="naics_code"
                                            displayValue={c.naics_code}
                                            mono
                                            tooltipPlace="right"
                                            notAccessibleFields={notAccessibleFields}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <MaskedCell
                                            fieldKey="employee_size"
                                            displayValue={c.employee_size != null ? c.employee_size.toLocaleString() : null}
                                            align="right"
                                            tooltipPlace="top"
                                            notAccessibleFields={notAccessibleFields}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <MaskedCell
                                            fieldKey="annual_revenue"
                                            displayValue={c.annual_revenue != null ? `$${c.annual_revenue.toLocaleString()}` : null}
                                            align="right"
                                            tooltipPlace="top"
                                            notAccessibleFields={notAccessibleFields}
                                        />
                                    </td>
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
